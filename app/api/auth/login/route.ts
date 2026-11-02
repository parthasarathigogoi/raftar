import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { createSession, sessionCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { loginSchema } from "@/schemas/auth";
export async function POST(request: NextRequest) { const parsed = loginSchema.safeParse(await request.json()); if (!parsed.success) return fail("Invalid email or password.", 422); const key = `login:${parsed.data.email.toLowerCase()}:${request.headers.get("x-forwarded-for") || "unknown"}`; if (!rateLimit(key)) return fail("Too many login attempts. Please try again later.", 429); await connectToDatabase(); const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash"); if (!user || user.status !== "active" || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return fail("Invalid email or password.", 401); const token = await createSession({ id: user.id, role: user.role, email: user.email, name: user.name }); const response = ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }); response.cookies.set(sessionCookie(token)); return response; }
