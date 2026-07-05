import { Redirect, Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { GlassTabBar, type TabIconMap } from "@/components/glass-tab-bar";
import { Loading } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { Conversation } from "@/lib/chat-types";

const ICONS: TabIconMap = {
  index: "home-variant",
  appointments: "calendar-check",
  prescriptions: "pill",
  messages: "message-text",
  profile: "account",
};

export default function PatientLayout() {
  const { data: session, isPending } = useSession();
  const unreadQuery = useQuery({
    queryKey: ["patient", "conversation"],
    queryFn: () =>
      apiFetch<{ conversation: Conversation }>("/api/v1/conversations"),
    retry: false,
    enabled: Boolean(session) && (session?.user as { role?: string })?.role !== "doctor",
  });
  const unread = unreadQuery.data?.conversation?.patientUnread ?? 0;

  if (isPending) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if ((session.user as { role?: string }).role === "doctor") {
    return <Redirect href="/(doctor)" />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} variant="patient" icons={ICONS} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="appointments" options={{ title: "Visits" }} />
      <Tabs.Screen name="prescriptions" options={{ title: "Rx" }} />
      <Tabs.Screen
        name="messages"
        options={{ title: "Chat", tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="book/index" options={{ href: null }} />
      <Tabs.Screen name="appointments/[id]" options={{ href: null }} />
      <Tabs.Screen name="receipt/[id]" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="care/checkout" options={{ href: null }} />
      <Tabs.Screen name="care/cancel" options={{ href: null }} />
    </Tabs>
  );
}
