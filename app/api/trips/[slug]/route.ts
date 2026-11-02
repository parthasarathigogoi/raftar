import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { getPublicTripBySlug } from "@/lib/trips";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const trip = await getPublicTripBySlug(slug);
    return trip ? ok({ trip }) : fail("This trip could not be found.", 404);
  } catch {
    return fail("This trip is temporarily unavailable.", 503);
  }
}
