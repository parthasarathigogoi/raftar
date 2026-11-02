import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { BookingError, cancelBooking, recordManualPayment, refundBooking } from "@/lib/booking-service";
import { bookingDto } from "@/lib/bookings";
import { PaymentConfigError } from "@/lib/razorpay";
import { fail, ok } from "@/lib/http";
import { TripBooking } from "@/models/TripBooking";

const ACTIONS = ["cancel", "refund", "record_payment", "complete"] as const;
type BookingAction = (typeof ACTIONS)[number];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; amount?: number; reason?: string; method?: string; reference?: string }
    | null;
  const action = body?.action as BookingAction | undefined;
  if (!action || !ACTIONS.includes(action)) return fail("Unknown registration action.", 422);

  try {
    if (action === "cancel") {
      const booking = await cancelBooking({ bookingId: id, actorId: auth.user.id, reason: body?.reason, byAdmin: true });
      return ok({ booking: bookingDto(booking.toObject ? booking.toObject() : booking) });
    }

    if (action === "refund") {
      const result = await refundBooking({ bookingId: id, amount: body?.amount, reason: body?.reason, actorId: auth.user.id });
      return ok({ booking: bookingDto(result.booking.toObject ? result.booking.toObject() : result.booking), refundId: result.refundId, amount: result.amount });
    }

    if (action === "record_payment") {
      const amount = Number(body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return fail("Enter the amount collected.", 422);
      const booking = await recordManualPayment({
        bookingId: id,
        amount,
        method: body?.method?.trim() || "cash",
        reference: body?.reference?.trim() || undefined,
        actorId: auth.user.id,
      });
      return ok({ booking: bookingDto(booking.toObject ? booking.toObject() : booking) });
    }

    // complete
    const booking = await TripBooking.findById(id);
    if (!booking) return fail("That registration could not be found.", 404);
    if (booking.bookingStatus !== "confirmed") return fail("Only confirmed registrations can be marked complete.", 409);
    booking.bookingStatus = "completed";
    booking.statusHistory.push({ status: "completed", at: new Date(), by: auth.user.id as never, note: "Marked complete by admin" });
    await booking.save();
    return ok({ booking: bookingDto(booking.toObject ? booking.toObject() : booking) });
  } catch (error) {
    if (error instanceof PaymentConfigError) return fail(error.message, 503);
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not complete that action.", 500);
  }
}
