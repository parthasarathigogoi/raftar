import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Partner } from "@/models/Partner";
import { partnerInputSchema } from "@/schemas/admin";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const params = request.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (params.get("role")) filter.role = params.get("role");
  if (params.get("status")) filter.status = params.get("status");

  const partners = await Partner.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  return ok({
    partners: partners.map((partner) => ({ ...partner, id: String(partner._id) })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = partnerInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the crew member details.", 422);

  await connectToDatabase();
  const partner = await Partner.create({
    ...parsed.data,
    email: parsed.data.email ? parsed.data.email.toLowerCase() : undefined,
  });
  return ok({ partner: { ...partner.toObject(), id: String(partner._id) } }, 201);
}
