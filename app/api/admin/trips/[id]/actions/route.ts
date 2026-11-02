import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminTripDto, applyTripAction, duplicateTripEvent, type TripAction } from "@/lib/admin-trips";
import { BookingError } from "@/lib/booking-errors";
import { fail, ok } from "@/lib/http";

const ACTIONS: TripAction[] = ["publish", "unpublish", "open_registration", "close_registration", "cancel", "complete"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;

  try {
    if (action === "duplicate") {
      const copy = await duplicateTripEvent(id, auth.user.id);
      return ok({ trip: adminTripDto(copy) }, 201);
    }
    if (!action || !ACTIONS.includes(action as TripAction)) return fail("Unknown trip action.", 422);
    const event = await applyTripAction(id, action as TripAction, auth.user.id);
    return ok({ trip: adminTripDto(event) });
  } catch (error) {
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not apply that action.", 500);
  }
}
