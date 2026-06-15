import { useCallback, useEffect, useRef, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { API_URL, authClient } from "@/lib/auth";
import { useChatSocket } from "@/lib/use-chat-socket";
import { formatTime } from "@/lib/format";
import { colors, radius, space } from "@/lib/theme";
import type { ChatAttachment, ChatMessage, MessagesPage } from "@/lib/chat-types";

export function ChatThread({
  conversationId,
  currentRole,
  peerName,
  onBack,
}: {
  conversationId: string;
  currentRole: "patient" | "doctor";
  peerName: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingFile, setPendingFile] = useState<ChatAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastIdRef = useRef<string | null>(null);

  const append = useCallback((incoming: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
    );
  }, []);

  const markRead = useCallback(() => {
    void apiFetch(`/api/v1/conversations/${conversationId}/read`, {
      method: "POST",
    }).catch(() => undefined);
  }, [conversationId]);

  // Load latest page on mount (the screen remounts per conversation, so loading
  // starts true and is only cleared here).
  useEffect(() => {
    let cancelled = false;
    apiFetch<MessagesPage>(`/api/v1/conversations/${conversationId}/messages`)
      .then((page) => {
        if (cancelled) return;
        setMessages(page.messages);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useChatSocket(
    useCallback(
      ({ conversationId: cid, message }) => {
        if (cid !== conversationId) return;
        append(message);
        if (message.senderRole !== currentRole) markRead();
      },
      [conversationId, currentRole, append, markRead]
    )
  );

  // Stick to the newest message only when one is appended at the bottom.
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    if (lastId !== lastIdRef.current) {
      lastIdRef.current = lastId;
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages]);

  const loadOlder = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await apiFetch<MessagesPage>(
        `/api/v1/conversations/${conversationId}/messages?before=${cursor}`
      );
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...page.messages.filter((m) => !seen.has(m.id)), ...prev];
      });
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      // leave the list as-is; the user can retry
    } finally {
      setLoadingMore(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
      const uploaded = await apiUpload<ChatAttachment>(
        `/api/v1/conversations/${conversationId}/attachments`,
        form
      );
      setPendingFile(uploaded);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = async (att: ChatAttachment) => {
    try {
      const cookie = authClient.getCookie();
      const safeName = `${att.id}-${att.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const target = `${FileSystem.cacheDirectory}${safeName}`;
      const { uri } = await FileSystem.downloadAsync(
        `${API_URL}/api/v1/attachments/${att.id}`,
        target,
        { headers: cookie ? { Cookie: cookie } : undefined }
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: att.mimeType });
      }
    } catch {
      Alert.alert("Couldn't open file", "Please try again.");
    }
  };

  const send = async () => {
    const body = draft.trim();
    if ((!body && !pendingFile) || sending) return;
    setSending(true);
    const sentFile = pendingFile;
    setDraft("");
    setPendingFile(null);
    try {
      const { message } = await apiFetch<{ message: ChatMessage }>(
        `/api/v1/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            body: body || undefined,
            attachmentId: sentFile?.id,
          }),
        }
      );
      append(message);
    } catch {
      setDraft(body);
      setPendingFile(sentFile);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.header}>
          <IconButton icon="arrow-left" label="Go back" onPress={onBack} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {peerName}
            </Text>
            <Text style={styles.disclaimer} numberOfLines={1}>
              Not monitored 24/7 · call emergency services for urgent help
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="message-text-outline"
              size={34}
              color={colors.textMuted}
            />
            <Text style={styles.empty}>No messages yet. Say hello.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            ListHeaderComponent={
              hasMore ? (
                <Pressable
                  onPress={loadOlder}
                  disabled={loadingMore}
                  style={({ pressed }) => [styles.loadMore, pressed && { opacity: 0.6 }]}
                >
                  {loadingMore ? (
                    <ActivityIndicator color={colors.textMuted} size="small" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load earlier messages</Text>
                  )}
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => (
              <Bubble
                message={item}
                mine={item.senderRole === currentRole}
                onOpenAttachment={openAttachment}
              />
            )}
          />
        )}

        <View style={styles.composerWrap}>
          {uploadError ? <Text style={styles.uploadError}>{uploadError}</Text> : null}
          {pendingFile ? (
            <View style={styles.pendingChip}>
              <MaterialCommunityIcons
                name="paperclip"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.pendingName} numberOfLines={1}>
                {pendingFile.filename}
              </Text>
              <Pressable
                onPress={() => setPendingFile(null)}
                accessibilityLabel="Remove attachment"
              >
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composer}>
            <Pressable
              onPress={pickFile}
              disabled={uploading}
              accessibilityLabel="Attach a file"
              style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.6 }]}
            >
              {uploading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <MaterialCommunityIcons name="paperclip" size={22} color={colors.text} />
              )}
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
            />
            <Pressable
              onPress={send}
              disabled={(!draft.trim() && !pendingFile) || sending}
              accessibilityLabel="Send"
              style={({ pressed }) => [
                styles.sendBtn,
                ((!draft.trim() && !pendingFile) || sending) && { opacity: 0.4 },
                pressed && { opacity: 0.8 },
              ]}
            >
              {sending ? (
                <ActivityIndicator color={colors.primaryFg} size="small" />
              ) : (
                <MaterialCommunityIcons name="send" size={20} color={colors.primaryFg} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({
  message,
  mine,
  onOpenAttachment,
}: {
  message: ChatMessage;
  mine: boolean;
  onOpenAttachment: (att: ChatAttachment) => void;
}) {
  const attachment = message.attachment;
  const isImage = attachment?.mimeType.startsWith("image/");
  const cookie = authClient.getCookie();

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {attachment ? (
          isImage ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image
              accessibilityLabel={attachment.filename}
              source={{
                uri: `${API_URL}/api/v1/attachments/${attachment.id}`,
                headers: cookie ? { Cookie: cookie } : undefined,
              }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Pressable
              onPress={() => onOpenAttachment(attachment)}
              style={[styles.fileChip, mine && styles.fileChipMine]}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={18}
                color={mine ? colors.primaryFg : colors.text}
              />
              <Text
                style={[styles.fileName, mine && { color: colors.primaryFg }]}
                numberOfLines={1}
              >
                {attachment.filename}
              </Text>
              <MaterialCommunityIcons
                name="open-in-new"
                size={15}
                color={mine ? colors.primaryFg : colors.textMuted}
              />
            </Pressable>
          )
        ) : null}
        {message.body ? (
          <Text style={[styles.bubbleText, mine && { color: colors.primaryFg }]}>
            {message.body}
          </Text>
        ) : null}
        <Text style={[styles.time, mine && { color: "rgba(255,255,255,0.75)" }]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: space.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  disclaimer: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  empty: { fontSize: 14, color: colors.textMuted },
  listContent: { padding: space.md, gap: 8 },
  loadMore: { alignItems: "center", paddingVertical: 8, marginBottom: 4 },
  loadMoreText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  row: { flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text },
  time: { fontSize: 10, color: colors.textMuted, alignSelf: "flex-end" },
  image: { width: 200, height: 150, borderRadius: radius.md, backgroundColor: colors.bg },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fileChipMine: { backgroundColor: "rgba(255,255,255,0.18)" },
  fileName: { flex: 1, fontSize: 13, color: colors.text },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.sm,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 10,
    gap: 8,
  },
  uploadError: { fontSize: 12, color: colors.danger, paddingHorizontal: 4 },
  pendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pendingName: { flex: 1, fontSize: 13, color: colors.text },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 11 : 8,
    paddingBottom: Platform.OS === "ios" ? 11 : 8,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
