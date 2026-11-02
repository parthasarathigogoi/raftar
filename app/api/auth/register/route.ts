import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { createSession, sessionCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { registerSchema } from "@/schemas/auth";

export const POST = withDatabase(async (request: NextRequest) => {
  if (!rateLimit(`register:${request.headers.get("x-forwarded-for") || "unknown"}`, 3)) return fail("Please try again later.", 429);
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid registration details.", 422);

  await connectToDatabase();
  if (await User.exists({ email: parsed.data.email.toLowerCase() })) return fail("An account already exists for this email.", 409);

  const user = await User.create({
    ...parsed.data,
    email: parsed.data.email.toLowerCase(),
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
  });
  const token = await createSession({ id: String(user._id), role: user.role, email: user.email, name: user.name });
  const response = ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 201);
  response.cookies.set(sessionCookie(token));
  return response;
});
