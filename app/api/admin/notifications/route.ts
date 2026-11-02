import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Notification } from "@/models/Notification";
import { TripBooking } from "@/models/TripBooking";
import { User } from "@/models/User";
import { announcementSchema } from "@/schemas/admin";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const notifications = await Notification.find({ type: "announcement" }).sort({ createdAt: -1 }).limit(100).lean();
  return ok({
    notifications: notifications.map((notification) => ({
      id: String(notification._id),
      title: notification.title,
      message: notification.message,
      tripEventId: notification.tripEventId ? String(notification.tripEventId) : null,
      createdAt: notification.createdAt,
    })),
  });
}

/** Broadcast an announcement to a chosen audience. */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "An announcement needs a title and a message.", 422);

  const audience = typeof body?.audience === "string" ? body.audience : "all_customers";
  await connectToDatabase();

  let recipientIds: string[] = [];
  if (audience === "confirmed_travellers") {
    const bookings = await TripBooking.find({ bookingStatus: { $in: ["confirmed", "completed"] }, customerId: { $exists: true } }).select("customerId").lean();
    recipientIds = Array.from(new Set(bookings.map((booking) => String(booking.customerId))));
  } else {
    const customers = await User.find({ role: "customer" }).select("_id").lean();
    recipientIds = customers.map((customer) => String(customer._id));
  }

  let sent = 0;
  for (const userId of recipientIds) {
    await Notification.create({ userId, type: "announcement", title: parsed.data.title, message: parsed.data.message });
    sent += 1;
  }

  await recordAudit({ userId: auth.user.id, action: "notification.broadcast", module: "notifications", recordId: "broadcast", description: `Broadcast "${parsed.data.title}" to ${sent} recipient(s)`, metadata: { audience, sent } });

  return ok({ sent });
}
