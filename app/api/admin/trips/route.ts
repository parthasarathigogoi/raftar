import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createTripEvent, adminTripDto } from "@/lib/admin-trips";
import { BookingError } from "@/lib/booking-errors";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { tripEventInputSchema } from "@/schemas/tripEvent";
import { TripEvent } from "@/models/TripEvent";

export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const params = request.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (params.get("status")) filter.status = params.get("status");
  if (params.get("featured") === "true") filter.featured = true;
  const search = params.get("q")?.trim();
  if (search) filter.$or = [{ title: new RegExp(search, "i") }, { destination: new RegExp(search, "i") }, { slug: new RegExp(search, "i") }];

  const events = await TripEvent.find(filter).sort({ startDate: -1 }).limit(200).lean();
  return ok({ trips: events.map((event) => adminTripDto(event)) });
});

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = tripEventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the trip details.", 422);

  try {
    const event = await createTripEvent(parsed.data, auth.user.id);
    return ok({ trip: adminTripDto(event) }, 201);
  } catch (error) {
    if (error instanceof BookingError) return fail(error.message, error.status);
    return fail("We could not create the trip event.", 500);
  }
}
