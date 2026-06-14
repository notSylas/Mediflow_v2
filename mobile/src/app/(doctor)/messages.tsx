import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Screen,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatRelativeDay } from "@/lib/format-chat";
import { colors, radius, space } from "@/lib/theme";
import type { DoctorConversationRow } from "@/lib/chat-types";

export default function DoctorMessages() {
  const query = useQuery({
    queryKey: ["doctor", "conversations"],
    queryFn: () =>
      apiFetch<{ conversations: DoctorConversationRow[] }>("/api/v1/conversations"),
  });

  // Refresh unread counts whenever the list regains focus (e.g. back from a thread).
  useFocusEffect(
    useCallback(() => {
      void query.refetch();
    }, [query])
  );

  if (query.isLoading) return <Loading label="Loading messages…" />;

  const rows = query.data?.conversations ?? [];

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <PageHeader title="Messages" subtitle="Patient conversations" />
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="chat-outline"
          title="No conversations yet"
          message="When patients message you, their threads appear here."
        />
      ) : (
        <View style={styles.list}>
          {rows.map(({ conversation, patient }) => (
            <Pressable
              key={conversation.id}
              onPress={() =>
                router.push({
                  pathname: "/(doctor)/messages/[id]",
                  params: { id: conversation.id, name: patient.name },
                })
              }
              style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.7 }]}
            >
              <Avatar name={patient.name} doctor />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {patient.name}
                  </Text>
                  {conversation.lastMessageAt ? (
                    <Text style={styles.when}>
                      {formatRelativeDay(conversation.lastMessageAt)}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {conversation.lastMessagePreview || "No messages yet"}
                </Text>
              </View>
              {conversation.doctorUnread > 0 ? (
                <View style={styles.unread}>
                  <Text style={styles.unreadText}>{conversation.doctorUnread}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  when: { fontSize: 11, color: colors.textMuted },
  preview: { fontSize: 13, color: colors.textMuted },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.doctor,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: colors.primaryFg, fontSize: 11, fontWeight: "800" },
});
