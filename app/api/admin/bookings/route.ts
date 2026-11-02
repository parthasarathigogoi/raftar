import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { BookingError, createManualBooking, releaseExpiredHolds } from "@/lib/booking-service";
import { bookingDto, listAdminBookings } from "@/lib/bookings";
import { PaymentConfigError } from "@/lib/razorpay";
import { fail, ok } from "@/lib/http";
import { adminBookingInputSchema } from "@/schemas/tripBooking";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const params = request.nextUrl.searchParams;
  try {
    await releaseExpiredHolds();
    const bookings = await listAdminBookings({
      tripEventId: params.get("tripEventId") || undefined,
      paymentStatus: params.get("paymentStatus") || undefined,
      bookingStatus: params.get("bookingStatus") || undefined,
      search: params.get("q")?.trim() || undefined,
    });
    return ok({ bookings });
  } catch {
    return fail("We could not load the registrations.", 500);
  }
}

/** Admin-authorised manual registration (records an audit entry). */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { tripEventId?: string }) | null;
  const tripEventId = body?.tripEventId;
  if (!tripEventId) return fail("Select the trip this registration belongs to.", 422);

  const { tripEventId: _ignored, ...rest } = body ?? {};
  const parsed = adminBookingInputSchema.safeParse(rest);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the registration details.", 422);

  try {
    const booking = await createManualBooking({ tripEventId: String(tripEventId), actorId: auth.user.id, payload: parsed.data });
    return ok({ booking: bookingDto(booking.toObject ? booking.toObject() : booking) }, 201);
  } catch (error) {
    if (error instanceof PaymentConfigError) return fail(error.message, 503);
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not create that registration.", 500);
  }
}
