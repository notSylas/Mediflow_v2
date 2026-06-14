import { Redirect } from "expo-router";
import { useSession } from "@/lib/auth";
import { Loading } from "@/components/ui";

export default function Index() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;

  const role = (session.user as { role?: string }).role;
  return <Redirect href={role === "doctor" ? "/(doctor)" : "/(patient)"} />;
}
