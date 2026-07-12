import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarPlus, MessageCircle, ShieldAlert, ShieldCheck, Stethoscope } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getOrCreatePatientConversation, listDoctorConversations } from "@/lib/chat";
import { getDoctorCard, getDoctorProfile, getOrCreateDoctorProfile } from "@/lib/doctor";
import {
  getActiveSubscriberIds,
  getPatientCareStatus,
  toCareStatusDTO,
} from "@/lib/care-subscription";
import { CareCard } from "@/components/patient/CareCard";
import { ChatThread } from "@/components/chat/ChatThread";
import { DoctorMessages } from "@/components/chat/DoctorMessages";
import {
  PatientEmptyState,
  PatientHero,
  PatientPageShell,
  PatientSideCard,
} from "@/components/patient/PatientPortal";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function MessagesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  if (session.user.role === "doctor") {
    const profile = await getOrCreateDoctorProfile(session.user.id);
    const [rows, subscriberIds] = await Promise.all([
      listDoctorConversations(session.user.id),
      getActiveSubscriberIds(profile.id),
    ]);
    return (
      <div className="mx-auto h-[calc(100dvh-1rem)] max-w-7xl overflow-hidden p-2 sm:p-4">
        <DoctorMessages
          conversations={rows.map((r) => ({
            id: r.conversation.id,
            patientId: r.patient.id,
            patientName: r.patient.name || r.patient.email,
            patientEmail: r.patient.email,
            preview: r.conversation.lastMessagePreview,
            unread: r.conversation.doctorUnread,
            lastMessageAt: r.conversation.lastMessageAt?.toISOString() ?? null,
            isMember: subscriberIds.has(r.patient.id),
          }))}
        />
      </div>
    );
  }

  // Patient — messaging is a premium care-plan feature; only active
  // subscribers can message (a paid consult alone does not unlock it).
  const conv = await getOrCreatePatientConversation(session.user.id);
  if (!conv) {
    const [careStatus, profile] = await Promise.all([
      getPatientCareStatus(session.user.id),
      getDoctorProfile(),
    ]);
    return (
      <PatientPageShell>
        <Reveal>
          <PatientHero
            eyebrow="Secure messages"
            icon={MessageCircle}
            title="Messaging is part of MediFlow Care"
            description="Direct messaging with your doctor is included with the care plan. Start the plan to message between visits — booking a one-off consultation does not include messaging."
          />
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <CareCard care={toCareStatusDTO(careStatus)} timezone={profile?.timezone ?? "Asia/Kolkata"} />
          <PatientEmptyState
            icon={MessageCircle}
            title="Why a plan?"
            description="The care plan funds ongoing, between-visit support: messaging, a monthly follow-up, reminders, and refill help — beyond a single paid consultation."
            action={
              <Button asChild variant="outline">
                <Link href="/patient/book">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Book a one-off visit
                </Link>
              </Button>
            }
          />
        </div>
      </PatientPageShell>
    );
  }

  const doctor = await getDoctorCard();
  return (
    <PatientPageShell className="space-y-6 py-6">
      <Reveal>
        <PatientHero
          eyebrow="Secure messages"
          icon={MessageCircle}
          title="Chat with your doctor"
          description="Use this for follow-up questions, report sharing, and prescription clarifications. Emergency concerns should go to local emergency care."
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-4 ring-1 ring-white/20">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700">
                <Stethoscope className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">
                  {doctor?.name ? `Dr. ${doctor.name}` : "Your doctor"}
                </p>
                <p className="text-sm text-teal-50/75">Clinic follow-up channel</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 text-sm text-teal-50/80 ring-1 ring-white/20">
              Attach PDF, JPG, or PNG reports when the doctor asks for more context.
            </div>
          </div>
        </PatientHero>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="glass flex h-[calc(100dvh-22rem)] min-h-[560px] flex-col overflow-hidden rounded-3xl p-0">
          <ChatThread
            conversationId={conv.conversation.id}
            currentRole="patient"
            peerName={doctor?.name ? `Dr. ${doctor.name}` : "Your doctor"}
          />
        </Card>

        <aside className="space-y-6">
          <PatientSideCard title="Messaging rules" description="For safer online care">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>This chat is not monitored 24/7. Use emergency care for urgent symptoms.</p>
              </div>
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>Keep questions specific and include relevant timing, symptoms, and reports.</p>
              </div>
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>For new symptoms, booking a visit is safer than relying on chat alone.</p>
              </div>
            </div>
          </PatientSideCard>

          <PatientSideCard title="Need a consultation?">
            <p className="text-sm text-muted-foreground">
              If your question needs diagnosis, medicine changes, or a new prescription, book a
              follow-up visit.
            </p>
            <Button asChild className="w-full">
              <Link href="/patient/book">Book follow-up</Link>
            </Button>
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}
