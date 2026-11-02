import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Partner } from "@/models/Partner";
import { partnerUpdateSchema } from "@/schemas/admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = partnerUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the crew member details.", 422);

  await connectToDatabase();
  const { id } = await params;
  const partner = await Partner.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!partner) return fail("That crew member could not be found.", 404);
  return ok({ partner: { ...partner.toObject(), id: String(partner._id) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const { id } = await params;
  const partner = await Partner.findByIdAndDelete(id);
  if (!partner) return fail("That crew member could not be found.", 404);
  return ok({ deleted: true });
}
