import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { Notification } from "@/models/Notification";

export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const notifications = await Notification.find({ userId: auth.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  return ok({
    notifications: notifications.map((notification) => ({
      id: String(notification._id),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      tripEventId: notification.tripEventId ? String(notification.tripEventId) : null,
      bookingId: notification.bookingId ? String(notification.bookingId) : null,
      createdAt: notification.createdAt,
    })),
  });
});

/** Mark one notification, or all of them, as read. */
export const PATCH = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { id?: string; all?: boolean } | null;
  await connectToDatabase();

  if (body?.all) {
    await Notification.updateMany({ userId: auth.user.id, read: false }, { read: true });
    return ok({ updated: "all" });
  }
  if (!body?.id) return fail("Provide a notification id or set all to true.", 422);
  await Notification.updateOne({ _id: body.id, userId: auth.user.id }, { read: true });
  return ok({ updated: body.id });
});
