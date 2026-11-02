import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { listPayments } from "@/lib/admin-reports";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const params = request.nextUrl.searchParams;
  try {
    return ok({
      payments: await listPayments({
        status: params.get("status") || undefined,
        search: params.get("q")?.trim() || undefined,
      }),
    });
  } catch {
    return fail("We could not load the payments ledger.", 500);
  }
}
