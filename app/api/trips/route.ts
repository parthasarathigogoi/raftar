import { NextRequest } from "next/server";
import { releaseExpiredHolds } from "@/lib/booking-service";
import { fail, ok } from "@/lib/http";
import { listPublicTrips } from "@/lib/trips";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const scope = (params.get("scope") as "upcoming" | "past" | "all" | null) ?? "upcoming";
  try {
    // Opportunistically free seats whose checkout window has lapsed.
    await releaseExpiredHolds();
    const trips = await listPublicTrips({ scope, featured: params.get("featured") === "true" });
    return ok({ trips });
  } catch {
    return fail("Trips are temporarily unavailable. Please try again shortly.", 503);
  }
}
