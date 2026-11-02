import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminBooking } from "@/lib/bookings";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  try {
    const record = await getAdminBooking(id);
    if (!record) return fail("That registration could not be found.", 404);
    return ok(record);
  } catch {
    return fail("We could not load that registration.", 500);
  }
}
