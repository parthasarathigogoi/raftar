import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { Destination } from "@/models/Destination";

const destinationUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    state: z.string().trim().min(2).max(120),
    description: z.string().trim().min(2).max(4000),
    coverImage: z.string().trim().max(500).optional().or(z.literal("")),
    gallery: z.array(z.string().trim().min(1).max(500)),
    bestTimeToVisit: z.string().trim().max(200).optional().or(z.literal("")),
    travelInformation: z.string().trim().max(4000).optional().or(z.literal("")),
    permitInformation: z.string().trim().max(4000).optional().or(z.literal("")),
    featured: z.coerce.boolean(),
    published: z.coerce.boolean(),
  })
  .partial();

export const PATCH = withDatabase(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = destinationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the destination details.", 422);

  await connectToDatabase();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("That destination could not be found.", 404);

  const destination = await Destination.findByIdAndUpdate(id, { $set: parsed.data }, { new: true });
  if (!destination) return fail("That destination could not be found.", 404);

  await recordAudit({
    userId: auth.user.id,
    action: "destination.updated",
    module: "destinations",
    recordId: String(destination._id),
    description: `Destination "${destination.name}" updated`,
  });

  return ok({ destination: { ...destination.toObject(), id: String(destination._id) } });
});

export const DELETE = withDatabase(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("That destination could not be found.", 404);

  const destination = await Destination.findByIdAndDelete(id);
  if (!destination) return fail("That destination could not be found.", 404);

  await recordAudit({
    userId: auth.user.id,
    action: "destination.deleted",
    module: "destinations",
    recordId: String(destination._id),
    description: `Destination "${destination.name}" deleted`,
  });

  return ok({ removed: true });
});
