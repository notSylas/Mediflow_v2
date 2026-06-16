import { useCallback, useEffect, useRef, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { IconButton } from "@/components/ui";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { API_URL, authClient } from "@/lib/auth";
import { useChatSocket } from "@/lib/use-chat-socket";
import { useToast } from "@/components/toast";
import { formatBytes, formatTime } from "@/lib/format";
import { colors, fonts, gradients, radius, shadow, space } from "@/lib/theme";
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
  const toast = useToast();
  const insets = useSafeAreaInsets();
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
  const [preview, setPreview] = useState<ChatAttachment | null>(null);
  const [pdfView, setPdfView] = useState<{ att: ChatAttachment; uri: string } | null>(
    null
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  // Downloads an attachment to the cache (re-using a prior download) with the
  // session cookie the protected endpoint requires, returning the local uri.
  const downloadAttachment = useCallback(async (att: ChatAttachment) => {
    const cookie = authClient.getCookie();
    const safeName = `${att.id}-${att.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const target = `${FileSystem.cacheDirectory}${safeName}`;
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists) return target;
    const { uri } = await FileSystem.downloadAsync(
      `${API_URL}/api/v1/attachments/${att.id}`,
      target,
      { headers: cookie ? { Cookie: cookie } : undefined }
    );
    return uri;
  }, []);

  // Hands a downloaded local file to the OS share/preview sheet (QuickLook on
  // iOS). Used by the in-app viewer's explicit "share" action.
  const shareLocal = useCallback(async (att: ChatAttachment, uri: string) => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Can't open file", "Sharing isn't available on this device.");
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: att.mimeType,
      dialogTitle: att.filename,
      UTI: att.mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
    });
  }, []);

  // Opens a downloaded file in an external viewer app. On Android a plain share
  // intent only offers "save", so we fire ACTION_VIEW with a content:// uri to
  // launch a real viewer (PDF reader, etc.); if none is installed we fall back
  // to the share sheet. On iOS the share sheet already previews (QuickLook).
  const openExternally = useCallback(
    async (att: ChatAttachment, uri: string) => {
      if (Platform.OS === "android") {
        try {
          const contentUri = await FileSystem.getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync(
            "android.intent.action.VIEW",
            {
              data: contentUri,
              type: att.mimeType,
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            }
          );
          return;
        } catch {
          // No app to handle ACTION_VIEW — fall through to the share sheet.
        }
      }
      await shareLocal(att, uri);
    },
    [shareLocal]
  );

  // Opens an attachment. PDFs open in an in-app viewer (iOS WKWebView renders
  // them); everything else (and PDFs on Android, where WebView can't) falls back
  // to the OS share/preview sheet. The endpoint is cookie-protected, so we
  // download with the cookie first.
  const openFile = useCallback(
    async (att: ChatAttachment) => {
      if (downloadingId) return;
      setDownloadingId(att.id);
      try {
        const uri = await downloadAttachment(att);
        if (att.mimeType === "application/pdf" && Platform.OS === "ios") {
          setPdfView({ att, uri });
        } else {
          await openExternally(att, uri);
        }
      } catch {
        Alert.alert("Couldn't open file", "Please try again.");
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, downloadAttachment, openExternally]
  );

  // Shares the currently-previewed image (download once, then OS share sheet —
  // lets the user save to Photos or forward it).
  const sharePreview = useCallback(async () => {
    if (!preview || downloadingId) return;
    setDownloadingId(preview.id);
    try {
      const uri = await downloadAttachment(preview);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: preview.mimeType,
          dialogTitle: preview.filename,
        });
      }
    } catch {
      Alert.alert("Couldn't share image", "Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }, [preview, downloadingId, downloadAttachment]);

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
      toast.error("Message not sent. Tap send to retry.");
    } finally {
      setSending(false);
    }
  };

  const headerGradient =
    currentRole === "doctor" ? gradients.doctor : gradients.patient;
  // The gradient's darkest stop — backs the iOS shadow so it casts the rounded
  // header shape rather than nothing (transparent views cast no shadow).
  const headerShadowColor = currentRole === "doctor" ? "#403a9c" : "#045d56";

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={[styles.headerShadow, { backgroundColor: headerShadowColor }]}>
          <View style={styles.headerClip}>
            <LinearGradient
              colors={headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
              <Pressable
                onPress={onBack}
                accessibilityLabel="Go back"
                hitSlop={8}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {peerName}
                </Text>
                <Text style={styles.disclaimer} numberOfLines={1}>
                  Not monitored 24/7 · call emergency services for urgent help
                </Text>
              </View>
            </View>
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
            style={styles.list}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
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
                onPreviewImage={setPreview}
                onOpenFile={openFile}
                downloadingId={downloadingId}
              />
            )}
          />
        )}

        <View
          style={[
            styles.composerWrap,
            {
              paddingBottom:
                Platform.OS === "ios"
                  ? Math.max(8, insets.bottom)
                  : Math.max(10, insets.bottom),
            },
          ]}
        >
          {uploadError ? <Text style={styles.uploadError}>{uploadError}</Text> : null}
          {pendingFile ? (
            <View style={styles.pendingChip}>
              <MaterialCommunityIcons
                name="paperclip"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.pendingName} numberOfLines={1}>
                {displayName(pendingFile.filename)}
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
              textAlignVertical="top"
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

      <Modal
        visible={preview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
        statusBarTranslucent
      >
        <View style={styles.previewBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPreview(null)}
            accessibilityLabel="Close preview"
          />
          {preview ? (
            <Image
              alt={preview.filename}
              source={{
                uri: `${API_URL}/api/v1/attachments/${preview.id}`,
                headers: cookieHeader(),
              }}
              style={styles.previewImage}
              contentFit="contain"
              transition={150}
            />
          ) : null}
          <View style={[styles.previewBar, { top: insets.top + 8 }]}>
            <Text style={styles.previewName} numberOfLines={1}>
              {preview ? displayName(preview.filename) : ""}
            </Text>
            <Pressable
              onPress={sharePreview}
              disabled={downloadingId === preview?.id}
              accessibilityLabel="Share image"
              style={({ pressed }) => [styles.previewAction, pressed && { opacity: 0.6 }]}
            >
              {downloadingId === preview?.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialCommunityIcons name="share-variant" size={22} color="#fff" />
              )}
            </Pressable>
            <Pressable
              onPress={() => setPreview(null)}
              accessibilityLabel="Close preview"
              style={({ pressed }) => [styles.previewAction, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pdfView !== null}
        animationType="slide"
        onRequestClose={() => setPdfView(null)}
      >
        <SafeAreaView style={styles.pdfSheet} edges={["top", "bottom"]}>
          <View style={styles.pdfHeader}>
            <IconButton icon="close" label="Close document" onPress={() => setPdfView(null)} />
            <Text style={styles.pdfTitle} numberOfLines={1}>
              {pdfView ? displayName(pdfView.att.filename) : ""}
            </Text>
            <IconButton
              icon="share-variant"
              label="Share document"
              onPress={() => {
                if (pdfView) void shareLocal(pdfView.att, pdfView.uri);
              }}
            />
          </View>
          {pdfView ? (
            <WebView
              source={{ uri: pdfView.uri }}
              originWhitelist={["*"]}
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              style={styles.pdfWeb}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.pdfLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/** Header map for the cookie-protected attachment endpoint, or undefined. */
function cookieHeader(): Record<string, string> | undefined {
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : undefined;
}

/** Some pickers store percent-encoded filenames (e.g. "a%20b.pdf"); decode for
 *  display so the user sees real spaces and characters. */
function displayName(filename: string): string {
  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
}

function Bubble({
  message,
  mine,
  onPreviewImage,
  onOpenFile,
  downloadingId,
}: {
  message: ChatMessage;
  mine: boolean;
  onPreviewImage: (att: ChatAttachment) => void;
  onOpenFile: (att: ChatAttachment) => void;
  downloadingId: string | null;
}) {
  const attachment = message.attachment;
  const isImage = attachment?.mimeType.startsWith("image/");
  const isPdf = attachment?.mimeType === "application/pdf";
  const isDownloading = attachment != null && downloadingId === attachment.id;

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {attachment ? (
          isImage ? (
            <Pressable
              onPress={() => onPreviewImage(attachment)}
              accessibilityLabel={`Open image ${attachment.filename}`}
              style={({ pressed }) => [styles.imageWrap, pressed && { opacity: 0.85 }]}
            >
              <Image
                alt={attachment.filename}
                accessibilityLabel={attachment.filename}
                source={{
                  uri: `${API_URL}/api/v1/attachments/${attachment.id}`,
                  headers: cookieHeader(),
                }}
                style={styles.image}
                contentFit="cover"
                transition={150}
              />
              <View style={styles.imageExpand}>
                <MaterialCommunityIcons name="arrow-expand" size={14} color="#fff" />
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => onOpenFile(attachment)}
              disabled={isDownloading}
              accessibilityLabel={`Open ${attachment.filename}`}
              style={({ pressed }) => [styles.docCard, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.docIcon}>
                <MaterialCommunityIcons
                  name={isPdf ? "file-pdf-box" : "file-document-outline"}
                  size={26}
                  color={isPdf ? "#E5484D" : colors.primary}
                />
              </View>
              <View style={styles.docBody}>
                <Text style={styles.docName} numberOfLines={2}>
                  {displayName(attachment.filename)}
                </Text>
                <Text style={styles.docSub} numberOfLines={1}>
                  {isPdf
                    ? "PDF"
                    : (attachment.mimeType.split("/")[1] ?? "file").toUpperCase()}
                  {attachment.byteSize ? ` · ${formatBytes(attachment.byteSize)}` : ""}
                </Text>
              </View>
              <View style={styles.docAction}>
                {isDownloading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons
                    name="eye-outline"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </View>
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
  headerShadow: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadow,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 10,
  },
  headerClip: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: space.md,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  disclaimer: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 15,
    marginTop: 2,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  empty: { fontSize: 14, color: colors.textMuted },
  list: { flex: 1 },
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
  imageWrap: { borderRadius: radius.md, overflow: "hidden" },
  image: { width: 200, height: 150, borderRadius: radius.md, backgroundColor: colors.bg },
  imageExpand: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: { width: Dimensions.get("window").width, height: "80%" },
  previewBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: space.md,
  },
  previewName: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600" },
  previewAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 248,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  docBody: { flex: 1, gap: 2 },
  docName: { fontSize: 14, fontWeight: "600", color: colors.text, lineHeight: 19 },
  docSub: { fontSize: 11, color: colors.textMuted },
  docAction: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfSheet: { flex: 1, backgroundColor: colors.bg },
  pdfHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: space.sm,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  pdfTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  pdfWeb: { flex: 1, backgroundColor: colors.bg },
  pdfLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.sm,
    paddingTop: 8,
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
