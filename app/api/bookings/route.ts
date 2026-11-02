import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { listCustomerBookings } from "@/lib/bookings";
import { releaseExpiredHolds } from "@/lib/booking-service";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  try {
    await releaseExpiredHolds();
    const bookings = await listCustomerBookings(auth.user.id, { status: request.nextUrl.searchParams.get("status") || undefined });
    return ok({ bookings });
  } catch {
    return fail("We could not load your bookings.", 500);
  }
}
