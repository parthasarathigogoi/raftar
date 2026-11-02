import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { Enquiry } from "@/models/Enquiry";
import { enquirySchema } from "@/schemas/enquiry";
const reference = () => `ENQ-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
export async function POST(request: NextRequest) { if (!rateLimit(`enquiry:${request.headers.get("x-forwarded-for") || "unknown"}`, 8)) return fail("Please try again later.", 429); const parsed = enquirySchema.safeParse(await request.json()); if (!parsed.success) return fail("Please check the trip details and try again.", 422); await connectToDatabase(); const enquiry = await Enquiry.create({ ...parsed.data, referenceNumber: reference() }); return ok({ referenceNumber: enquiry.referenceNumber, status: enquiry.status }, 201); }
export async function GET(request: NextRequest) { const auth = await requireRole(request, ["admin", "staff"]); if (!("user" in auth)) return fail(auth.error, auth.status); await connectToDatabase(); const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""; const filter = query ? { $or: [{ referenceNumber: new RegExp(query, "i") }, { customerName: new RegExp(query, "i") }, { email: new RegExp(query, "i") }, { phone: new RegExp(query, "i") }] } : {}; const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(50).lean(); return ok({ enquiries }); }
