import { NextRequest } from "next/server";
import { readSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
export async function GET(request: NextRequest) { const user = await readSession(request.cookies.get("raftar_session")?.value); return user ? ok({ user }) : fail("Authentication required", 401); }
