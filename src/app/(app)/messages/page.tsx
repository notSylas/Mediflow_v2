import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrCreatePatientConversation, listDoctorConversations } from "@/lib/chat";
import { getDoctorCard } from "@/lib/doctor";
import { ChatThread } from "@/components/chat/ChatThread";
import { DoctorMessages } from "@/components/chat/DoctorMessages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MessagesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  if (session.user.role === "doctor") {
    const rows = await listDoctorConversations(session.user.id);
    return (
      <div className="mx-auto h-[calc(100dvh-1rem)] max-w-6xl p-2 sm:p-4">
        <DoctorMessages
          conversations={rows.map((r) => ({
            id: r.conversation.id,
            patientName: r.patient.name || r.patient.email,
            preview: r.conversation.lastMessagePreview,
            unread: r.conversation.doctorUnread,
            lastMessageAt: r.conversation.lastMessageAt?.toISOString() ?? null,
          }))}
        />
      </div>
    );
  }

  // Patient — gated to those who have booked.
  const conv = await getOrCreatePatientConversation(session.user.id);
  if (!conv) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <MessageCircle className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium">Messaging opens after you book</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Once you have a consultation booked, you can message your doctor here.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/patient/book">Book a consultation</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const doctor = await getDoctorCard();
  return (
    <div className="mx-auto h-[calc(100dvh-1rem)] max-w-2xl p-2 sm:p-4">
      <Card className="flex h-full flex-col overflow-hidden p-0">
        <ChatThread
          conversationId={conv.conversation.id}
          currentRole="patient"
          peerName={doctor?.name ? `Dr. ${doctor.name}` : "Your doctor"}
        />
      </Card>
    </div>
  );
}
