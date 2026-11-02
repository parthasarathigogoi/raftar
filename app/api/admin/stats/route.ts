import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { dashboardStats } from "@/lib/admin-reports";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  try {
    return ok({ stats: await dashboardStats() });
  } catch {
    return fail("We could not load the dashboard statistics.", 500);
  }
}
