import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { tripRegistrationReport } from "@/lib/bookings";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  try {
    return ok({ report: await tripRegistrationReport() });
  } catch {
    return fail("We could not load the trip reports.", 500);
  }
}
