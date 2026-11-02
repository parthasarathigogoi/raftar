import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { User } from "@/models/User";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(7).max(25).optional().or(z.literal("")),
  password: z.string().min(12).max(128).optional().or(z.literal("")),
});

export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["customer", "admin", "staff", "partner"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const user = await User.findById(auth.user.id).select("name email phone role profileImage status createdAt").lean();
  if (!user) return fail("Your account could not be found.", 404);
  return ok({ profile: { id: String(user._id), name: user.name, email: user.email, phone: user.phone ?? null, role: user.role, profileImage: user.profileImage ?? null, createdAt: user.createdAt } });
});

export const PATCH = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["customer", "admin", "staff", "partner"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review your details.", 422);

  await connectToDatabase();
  const update: Record<string, unknown> = {};
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.phone !== undefined) update.phone = parsed.data.phone || undefined;
  if (parsed.data.password) update.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  if (!Object.keys(update).length) return fail("Nothing to update.", 422);

  const user = await User.findByIdAndUpdate(auth.user.id, update, { new: true }).select("name email phone role").lean();
  if (!user) return fail("Your account could not be found.", 404);
  return ok({ profile: { id: String(user._id), name: user.name, email: user.email, phone: user.phone ?? null, role: user.role } });
});
