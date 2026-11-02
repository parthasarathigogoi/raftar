import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export type Role = "admin" | "staff" | "partner" | "customer";
export type SessionUser = { id: string; role: Role; email: string; name: string };
const cookieName = "raftar_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");

export async function createSession(user: SessionUser) { if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not configured."); return new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret()); }
export async function readSession(token?: string): Promise<SessionUser | null> { try { if (!token || !process.env.AUTH_SECRET) return null; const { payload } = await jwtVerify(token, secret()); return { id: String(payload.id), role: payload.role as Role, email: String(payload.email), name: String(payload.name) }; } catch { return null; } }
export async function currentUser() { return readSession((await cookies()).get(cookieName)?.value); }
export type AuthResult = { user: SessionUser } | { error: string; status: 401 | 403 };
export async function requireRole(request: NextRequest, allowed: Role[]): Promise<AuthResult> { const user = await readSession(request.cookies.get(cookieName)?.value); if (!user) return { error: "Authentication required", status: 401 }; if (!allowed.includes(user.role)) return { error: "Insufficient permissions", status: 403 }; return { user }; }
export const sessionCookie = (token: string) => ({ name: cookieName, value: token, options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 } });
export const clearSessionCookie = { name: cookieName, value: "", options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 } };
