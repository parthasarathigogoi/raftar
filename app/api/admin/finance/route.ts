import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { financeSummary, listCustomers, listPayments } from "@/lib/admin-reports";
import { tripRegistrationReport } from "@/lib/bookings";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  try {
    const [finance, report, customers, payments] = await Promise.all([
      financeSummary(),
      tripRegistrationReport(),
      listCustomers(),
      listPayments(),
    ]);
    return ok({ finance, report, customers, payments });
  } catch {
    return fail("We could not load the finance summary.", 500);
  }
}
