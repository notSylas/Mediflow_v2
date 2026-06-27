import { Redirect, Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { GlassTabBar, type TabIconMap } from "@/components/glass-tab-bar";
import { DoctorFab } from "@/components/doctor-fab";
import { Loading } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { DoctorConversationRow } from "@/lib/chat-types";

const ICONS: TabIconMap = {
  index: "view-dashboard",
  appointments: "calendar-clock",
  patients: "account-group",
  messages: "message-text",
  settings: "cog",
};

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
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <GlassTabBar {...props} variant="doctor" icons={ICONS} />}
      >
      <Tabs.Screen name="index" options={{ title: "Clinic" }} />
      <Tabs.Screen name="appointments" options={{ title: "Visits" }} />
      <Tabs.Screen name="patients" options={{ title: "Patients" }} />
      <Tabs.Screen
        name="messages"
        options={{ title: "Chat", tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="refill-requests" options={{ href: null }} />
      <Tabs.Screen name="work-queue" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
      <Tabs.Screen name="encounter/[id]" options={{ href: null }} />
      <Tabs.Screen name="prescribe/[id]" options={{ href: null }} />
      <Tabs.Screen name="patients/[id]" options={{ href: null }} />
        <Tabs.Screen name="schedule" options={{ href: null }} />
      </Tabs>
      <DoctorFab />
    </>
  );
}
