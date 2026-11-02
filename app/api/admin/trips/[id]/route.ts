import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminTripDto, deleteTripEvent, updateTripEvent } from "@/lib/admin-trips";
import { BookingError } from "@/lib/booking-errors";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { tripEventUpdateSchema } from "@/schemas/tripEvent";
import { TripEvent } from "@/models/TripEvent";

export const GET = withDatabase(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  await connectToDatabase();
  const event = await TripEvent.findById(id).lean();
  return event ? ok({ trip: adminTripDto(event) }) : fail("Trip event not found.", 404);
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  const parsed = tripEventUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the trip details.", 422);

  try {
    const event = await updateTripEvent(id, parsed.data, auth.user.id);
    return ok({ trip: adminTripDto(event) });
  } catch (error) {
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not update the trip event.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  try {
    await deleteTripEvent(id, auth.user.id);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not delete the trip event.", 500);
  }
}
