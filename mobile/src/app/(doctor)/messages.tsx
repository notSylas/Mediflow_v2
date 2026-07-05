import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar, EmptyState, ErrorState } from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { ListSkeleton } from "@/components/skeleton";
import { FadeInView, PressableScale } from "@/components/motion";
import { apiFetch } from "@/lib/api";
import { formatRelativeDay } from "@/lib/format-chat";
import { colors, fonts, radius, space } from "@/lib/theme";
import type { DoctorConversationRow } from "@/lib/chat-types";

export default function DoctorMessages() {
  const query = useQuery({
    queryKey: ["doctor", "conversations"],
    queryFn: () =>
      apiFetch<{ conversations: DoctorConversationRow[] }>("/api/v1/conversations"),
  });
  const { refetch } = query;

  // Refresh unread counts whenever the list regains focus (e.g. back from a thread).
  // Depend on the stable refetch function, not the changing query result object;
  // otherwise each isRefetching update recreates this focus effect and loops.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  if (query.isLoading) {
    return (
      <AuroraScreen variant="doctor" title="Messages" subtitle="Patient conversations">
        <ListSkeleton />
      </AuroraScreen>
    );
  }

  const rows = query.data?.conversations ?? [];

  return (
    <AuroraScreen
      variant="doctor"
      title="Messages"
      subtitle="Patient conversations"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
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
          {rows.map(({ conversation, patient, isMember }, i) => (
            <FadeInView key={conversation.id} index={i}>
              <PressableScale
                onPress={() =>
                  router.push({
                    pathname: "/(doctor)/messages/[id]",
                    params: { id: conversation.id, name: patient.name },
                  })
                }
                style={styles.rowCard}
              >
                <Avatar name={patient.name} doctor />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.rowTop}>
                    <View style={styles.nameWrap}>
                      <Text style={styles.name} numberOfLines={1}>
                        {patient.name}
                      </Text>
                      {isMember ? (
                        <MaterialCommunityIcons name="hand-heart" size={13} color={colors.info} />
                      ) : null}
                    </View>
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
              </PressableScale>
            </FadeInView>
          ))}
        </View>
      )}
    </AuroraScreen>
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
  nameWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flexShrink: 1, fontSize: 15, fontFamily: fonts.heading, color: colors.text },
  when: { fontSize: 11, fontFamily: fonts.body, color: colors.textMuted },
  preview: { fontSize: 13, fontFamily: fonts.body, color: colors.textMuted },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.doctor,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: colors.primaryFg, fontSize: 11, fontFamily: fonts.bodySemibold },
});
