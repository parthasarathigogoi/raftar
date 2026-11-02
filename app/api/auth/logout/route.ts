import { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/http";
export async function POST(_request: NextRequest) { const response = ok({ loggedOut: true }); response.cookies.set(clearSessionCookie); return response; }
