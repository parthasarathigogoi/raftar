import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { BookingError, confirmBookingPayment } from "@/lib/booking-service";
import { bookingDto } from "@/lib/bookings";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Payment } from "@/models/Payment";
import { TripBooking } from "@/models/TripBooking";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { orderId?: string; paymentId?: string; signature?: string } | null;
  if (!body?.orderId || !body?.paymentId || !body?.signature) return fail("Missing payment verification details.", 422);

  try {
    await connectToDatabase();
    const payment = await Payment.findOne({ orderId: body.orderId }).select("bookingId").lean();
    if (!payment) return fail("No payment found for this order.", 404);

    const booking = await TripBooking.findById(payment.bookingId).select("customerId").lean();
    if (!booking) return fail("Booking not found.", 404);

    const isOwner = booking.customerId && String(booking.customerId) === auth.user.id;
    if (!isOwner && !["admin", "staff"].includes(auth.user.role)) return fail("You cannot verify this payment.", 403);

    const result = await confirmBookingPayment({ orderId: body.orderId, paymentId: body.paymentId, signature: body.signature, source: "checkout" });
    const record = result.booking;
    return ok({
      booking: record ? bookingDto(record.toObject ? record.toObject() : record) : null,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not verify the payment. If money was deducted it will be confirmed automatically.", 500);
  }
}
