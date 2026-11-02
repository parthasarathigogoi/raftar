import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Notification } from "@/models/Notification";
import { TripBooking } from "@/models/TripBooking";
import { TripEvent } from "@/models/TripEvent";

/** Send a trip announcement to every confirmed traveller on an event. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { title?: string; message?: string } | null;
  if (!body?.title || !body.message) return fail("An announcement needs a title and a message.", 422);

  await connectToDatabase();
  const event = await TripEvent.findById(id).select("title").lean();
  if (!event) return fail("Trip event not found.", 404);

  const recipients = await TripBooking.find({ tripEventId: id, bookingStatus: { $in: ["confirmed", "completed"] }, customerId: { $exists: true } })
    .select("customerId")
    .lean();
  const seen = new Set<string>();
  let sent = 0;
  for (const booking of recipients) {
    const customerId = String(booking.customerId);
    if (seen.has(customerId)) continue;
    seen.add(customerId);
    await Notification.create({ userId: booking.customerId, tripEventId: id, type: "announcement", title: body.title, message: body.message });
    sent += 1;
  }

  await recordAudit({ userId: auth.user.id, action: "trip.announcement_sent", module: "trip_events", recordId: id, description: `Announcement sent to ${sent} traveller(s) for "${event.title}"`, metadata: { sent } });
  return ok({ sent });
}
