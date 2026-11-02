import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { cancelBooking, BookingError } from "@/lib/booking-service";
import { bookingDto, getCustomerBooking } from "@/lib/bookings";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  const booking = await getCustomerBooking(auth.user.id, id);
  if (!booking) return fail("That booking could not be found.", 404);
  return ok({ booking });
}

/** Customers may cancel their own registration; seats are released immediately. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  const existing = await getCustomerBooking(auth.user.id, id);
  if (!existing) return fail("That booking could not be found.", 404);

  try {
    const booking = await cancelBooking({ bookingId: id, actorId: auth.user.id, reason: "Cancelled by customer" });
    return ok({ booking: bookingDto(booking.toObject ? booking.toObject() : booking) });
  } catch (error) {
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not cancel that booking.", 500);
  }
}
