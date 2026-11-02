import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { listCustomers } from "@/lib/admin-reports";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const search = request.nextUrl.searchParams.get("q")?.trim() || undefined;
  try {
    return ok({ customers: await listCustomers({ search }) });
  } catch {
    return fail("We could not load the customer list.", 500);
  }
}
