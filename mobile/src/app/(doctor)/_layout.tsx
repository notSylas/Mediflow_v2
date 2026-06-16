import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { DoctorConversationRow } from "@/lib/chat-types";

export default function DoctorLayout() {
  const { data: session, isPending } = useSession();
  const isDoctor = (session?.user as { role?: string })?.role === "doctor";
  const conversationsQuery = useQuery({
    queryKey: ["doctor", "conversations"],
    queryFn: () =>
      apiFetch<{ conversations: DoctorConversationRow[] }>("/api/v1/conversations"),
    retry: false,
    enabled: Boolean(session) && isDoctor,
  });
  const unread = (conversationsQuery.data?.conversations ?? []).reduce(
    (sum, row) => sum + (row.conversation.doctorUnread ?? 0),
    0
  );

  if (isPending) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if ((session.user as { role?: string }).role !== "doctor") {
    return <Redirect href="/(patient)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.doctor,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Clinic",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Visits",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-clock" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="refill-requests" options={{ href: null }} />
      <Tabs.Screen name="work-queue" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
      <Tabs.Screen name="encounter/[id]" options={{ href: null }} />
      <Tabs.Screen name="patients/[id]" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
    </Tabs>
  );
}
