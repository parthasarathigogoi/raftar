import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { BookingError, createBookingHold, releaseExpiredHolds } from "@/lib/booking-service";
import { bookingDto } from "@/lib/bookings";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { PaymentConfigError } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { tripRegistrationSchema } from "@/schemas/tripBooking";
import { TripEvent } from "@/models/TripEvent";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  if (!rateLimit(`register:${auth.user.id}`, 10)) return fail("Too many booking attempts. Please try again in a minute.", 429);

  const { slug } = await params;
  const parsed = tripRegistrationSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the traveller details and try again.", 422);

  try {
    await connectToDatabase();
    const event = await TripEvent.findOne({ slug }).select("_id").lean();
    if (!event) return fail("This trip could not be found.", 404);

    await releaseExpiredHolds();

    const result = await createBookingHold({ tripEventId: String(event._id), customerId: auth.user.id, payload: parsed.data });
    return ok(
      {
        booking: bookingDto(result.booking.toObject ? result.booking.toObject() : result.booking),
        payment: {
          provider: "razorpay",
          orderId: result.order.id,
          amount: result.order.amount,
          currency: result.order.currency,
          keyId: result.order.keyId,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof PaymentConfigError) return fail(error.message, 503);
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not start your booking. Please try again.", 500);
  }
}
