import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { TripEvent } from "@/models/TripEvent";
import { TripTask } from "@/models/TripTask";

const TASK_CATEGORIES = ["accommodation", "transport", "guide", "activities", "photography", "videography", "editing", "permits", "participants", "departure", "emergency", "other"] as const;

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

const taskInputSchema = z.object({
  tripEventId: objectId,
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.enum(TASK_CATEGORIES).default("other"),
  assignedTo: objectId.optional().or(z.literal("")),
  dueDate: z.coerce.date().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function taskDto(task: Record<string, any>) {
  const assignee = task.assignedTo && typeof task.assignedTo === "object" ? (task.assignedTo as Record<string, any>) : null;
  return {
    id: String(task._id),
    title: task.title,
    description: task.description ?? "",
    category: task.category,
    status: task.status,
    dueDate: task.dueDate ?? null,
    notes: task.notes ?? "",
    completedAt: task.completedAt ?? null,
    assignedTo: assignee ? { id: String(assignee._id), name: assignee.name, email: assignee.email } : null,
    createdAt: task.createdAt,
  };
}

export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const tripEventId = request.nextUrl.searchParams.get("tripEventId");
  if (!tripEventId) return fail("Select a trip to view its operations.", 400);
  if (!isValidObjectId(tripEventId)) return fail("That trip could not be found.", 404);

  await connectToDatabase();
  const trip = await TripEvent.findById(tripEventId)
    .select("title slug startDate endDate totalSeats seatsBooked seatsReserved status assignedCrew")
    .lean();
  if (!trip) return fail("That trip could not be found.", 404);

  const tasks = await TripTask.find({ tripEventId })
    .sort({ createdAt: 1 })
    .populate({ path: "assignedTo", select: "name email role" })
    .lean();

  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return ok({
    trip: {
      id: String(trip._id),
      title: trip.title,
      slug: trip.slug,
      startDate: trip.startDate,
      endDate: trip.endDate,
      totalSeats: trip.totalSeats,
      seatsBooked: trip.seatsBooked,
      seatsReserved: trip.seatsReserved,
      status: trip.status,
      assignedCrew: trip.assignedCrew ?? null,
    },
    tasks: tasks.map((task) => taskDto(task)),
    readiness: { total, done, percent },
  });
});

export const POST = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = taskInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the task details.", 422);

  await connectToDatabase();
  const task = await TripTask.create({
    ...parsed.data,
    assignedTo: parsed.data.assignedTo || undefined,
    dueDate: parsed.data.dueDate || undefined,
    createdBy: auth.user.id,
  });
  await task.populate({ path: "assignedTo", select: "name email role" });

  await recordAudit({
    userId: auth.user.id,
    action: "operation.task_created",
    module: "operations",
    recordId: String(task._id),
    description: `Task "${task.title}" created`,
  });

  return ok({ task: taskDto(task.toObject()) }, 201);
});
