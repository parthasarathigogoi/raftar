import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { slugify } from "@/lib/booking-math";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { Destination } from "@/models/Destination";
import { TripEvent } from "@/models/TripEvent";

const destinationInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  state: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(4000),
  coverImage: z.string().trim().max(500).optional().or(z.literal("")),
  gallery: z.array(z.string().trim().min(1).max(500)).default([]),
  bestTimeToVisit: z.string().trim().max(200).optional().or(z.literal("")),
  travelInformation: z.string().trim().max(4000).optional().or(z.literal("")),
  permitInformation: z.string().trim().max(4000).optional().or(z.literal("")),
});

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const params = request.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};

  const search = params.get("search")?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { state: pattern }];
  }

  const published = params.get("published");
  if (published === "true" || published === "false") filter.published = published === "true";

  const destinations = await Destination.find(filter).sort({ featured: -1, name: 1 }).limit(500).lean();

  const rows = await Promise.all(
    destinations.map(async (destination) => ({
      id: String(destination._id),
      name: destination.name,
      slug: destination.slug,
      state: destination.state,
      description: destination.description,
      coverImage: destination.coverImage ?? "",
      gallery: destination.gallery ?? [],
      bestTimeToVisit: destination.bestTimeToVisit ?? "",
      travelInformation: destination.travelInformation ?? "",
      permitInformation: destination.permitInformation ?? "",
      featured: Boolean(destination.featured),
      published: Boolean(destination.published),
      tripCount: await TripEvent.countDocuments({ destination: destination.name }),
    }))
  );

  return ok({ destinations: rows });
});

export const POST = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = destinationInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the destination details.", 422);

  await connectToDatabase();

  const baseSlug = slugify(parsed.data.name) || "destination";
  let slug = baseSlug;
  let counter = 2;
  while (await Destination.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const destination = await Destination.create({
    ...parsed.data,
    coverImage: parsed.data.coverImage || "",
    slug,
    published: false,
  });

  await recordAudit({
    userId: auth.user.id,
    action: "destination.created",
    module: "destinations",
    recordId: String(destination._id),
    description: `Destination "${destination.name}" created`,
  });

  return ok({ destination: { ...destination.toObject(), id: String(destination._id) } }, 201);
});
