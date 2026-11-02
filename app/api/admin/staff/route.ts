import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const users = await User.find({ role: { $in: ["admin", "staff", "partner"] } })
    .sort({ createdAt: -1 })
    .limit(300)
    .select("name email phone role status createdAt")
    .lean();

  return ok({
    staff: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    })),
  });
}
