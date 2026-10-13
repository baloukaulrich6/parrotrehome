import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { formatDateUTC, formatUsd } from "@/lib/constants";
import { ParrotRehomeLogo } from "@/components/parrotrehome/logo";
import { Video, Clock, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Video call" };

export default async function VideoCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(`/sign-in?callbackUrl=/my-requests/${id}/video-call`);
  }

  const request = await db.request.findUnique({
    where: { id },
    select: { id: true, reference: true, customerId: true, customerEmail: true, status: true },
  });
  if (!request) return notFound();

  // T-05: ownership check (customerId OR customerEmail match)
  if (user.role === "CLIENT") {
    const isOwner =
      request.customerId === user.id ||
      request.customerEmail.toLowerCase() === user.email.toLowerCase();
    if (!isOwner) return notFound();
  } else {
    // Staff can also access (for oversight / debugging) — no separate page yet
    // but they should be redirected to /admin/requests/[id]
    redirect(`/admin/requests/${request.id}`);
  }

  // Find the appointment linked to this request with a video token
  const appt = await db.appointment.findFirst({
    where: { requestId: id, videoCallToken: { not: null } },
    include: { professional: true },
  });
  if (!appt || !appt.videoCallUrl) {
    return (
      <div className="min-h-[60vh] bg-ivory flex flex-col items-center justify-center px-4 py-10">
        <ParrotRehomeLogo size="md" />
        <div className="mt-8 bg-white rounded-2xl border border-feather/20 shadow-sm p-8 max-w-md text-center">
          <Video className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
          <h1 className="font-heading text-slate text-[22px] font-semibold mb-2">
            No video link available
          </h1>
          <p className="text-feather text-[14px] font-body mb-5">
            Your appointment hasn&apos;t been confirmed yet, or no video link
            has been generated. Please wait for our team to confirm your slot —
            you&apos;ll receive an email with the secure link.
          </p>
          <Link
            href={`/my-requests/${request.id}`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to request
          </Link>
        </div>
      </div>
    );
  }

  // Compute active window: 15 min before slot → 30 min after
  const now = new Date();
  const slotStart = appt.slotStartUtc;
  const windowStart = new Date(slotStart.getTime() - 15 * 60 * 1000);
  const windowEnd = new Date(slotStart.getTime() + appt.durationMinutes * 60 * 1000 + 30 * 60 * 1000);
  const isActive = now >= windowStart && now <= windowEnd;

  return (
    <div className="min-h-[80vh] bg-ivory flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-feather/20 px-4 py-3 flex items-center justify-between">
        <Link href={`/my-requests/${request.id}`} className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[13px] font-body font-semibold">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {request.reference}
        </Link>
        <div className="flex items-center gap-3 text-[12px] font-body text-feather">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {formatDateUTC(slotStart)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {appt.durationMinutes} min
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            with {appt.professional.name}
          </span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {isActive ? (
          <div className="w-full max-w-4xl">
            <div className="bg-white rounded-xl border border-feather/20 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-feather/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-forest animate-pulse" aria-hidden />
                  <span className="font-body font-semibold text-slate text-[14px]">Live video call</span>
                </div>
                <span className="text-[11px] font-body text-feather">ParrotRehome · {appt.professional.name}</span>
              </div>
              {/* Jitsi Meet iframe — secure, no API key required */}
              <iframe
                src={`${appt.videoCallUrl}#config.prejoinPageEnabled=false&config.subject=ParrotRehome%20${encodeURIComponent(request.reference)}&userInfo.displayName=${encodeURIComponent(user.name ?? user.email)}`}
                allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
                className="w-full"
                style={{ height: "70vh", border: 0 }}
                title={`ParrotRehome video call — ${request.reference}`}
              />
            </div>
            <p className="text-center text-[12px] text-feather font-body mt-3">
              This call is end-to-end secured via Jitsi Meet. Your conversation is not recorded by ParrotRehome.
              Please ensure you have a stable internet connection and headphones for privacy.
            </p>
          </div>
        ) : now < windowStart ? (
          <div className="bg-white rounded-2xl border border-feather/20 shadow-sm p-8 max-w-md text-center">
            <Clock className="h-12 w-12 text-iris mx-auto mb-3" aria-hidden />
            <h1 className="font-heading text-slate text-[22px] font-semibold mb-2">
              Your call starts soon
            </h1>
            <p className="text-feather text-[14px] font-body mb-1">
              The video link will be active 15 minutes before your scheduled time:
            </p>
            <p className="font-heading text-slate text-[18px] font-bold mb-5">
              {formatDateUTC(slotStart)}
            </p>
            <p className="text-feather text-[12px] font-body mb-5">
              You&apos;ll receive email reminders 24 hours and 1 hour before the call.
              Please come back to this page at the scheduled time.
            </p>
            <Link
              href={`/my-requests/${request.id}`}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[13px] font-body font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to request
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-feather/20 shadow-sm p-8 max-w-md text-center">
            <Video className="h-12 w-12 text-feather mx-auto mb-3" aria-hidden />
            <h1 className="font-heading text-slate text-[22px] font-semibold mb-2">
              Call window has passed
            </h1>
            <p className="text-feather text-[14px] font-body mb-5">
              Your scheduled call window ended at {formatDateUTC(windowEnd)}.
              If you missed your appointment or need to reschedule, please contact our team.
            </p>
            <Link
              href={`/my-requests/${request.id}`}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to request
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
