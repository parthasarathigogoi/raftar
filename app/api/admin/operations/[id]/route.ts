import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { TripTask } from "@/models/TripTask";

const TASK_CATEGORIES = ["accommodation", "transport", "guide", "activities", "photography", "videography", "editing", "permits", "participants", "departure", "emergency", "other"] as const;
const TASK_STATUSES = ["pending", "in_progress", "done", "blocked"] as const;

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

const taskUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.enum(TASK_CATEGORIES).optional(),
  assignedTo: objectId.optional().or(z.literal("")),
  dueDate: z.coerce.date().optional().or(z.literal("")),
  status: z.enum(TASK_STATUSES).optional(),
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

export const PATCH = withDatabase(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  if (!isValidObjectId(id)) return fail("That task could not be found.", 404);

  const parsed = taskUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the task details.", 422);

  await connectToDatabase();
  const data = parsed.data;
  const update: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};

  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.category !== undefined) update.category = data.category;
  if (data.notes !== undefined) update.notes = data.notes;

  if (data.assignedTo !== undefined) {
    if (data.assignedTo === "") unset.assignedTo = 1;
    else update.assignedTo = data.assignedTo;
  }

  if (data.dueDate !== undefined) {
    if (data.dueDate === "") unset.dueDate = 1;
    else update.dueDate = data.dueDate;
  }

  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "done") update.completedAt = new Date();
    else unset.completedAt = 1;
  }

  if (Object.keys(unset).length) update.$unset = unset;

  const task = await TripTask.findByIdAndUpdate(id, update, { new: true })
    .populate({ path: "assignedTo", select: "name email role" })
    .lean();
  if (!task) return fail("That task could not be found.", 404);

  await recordAudit({
    userId: auth.user.id,
    action: "operation.task_updated",
    module: "operations",
    recordId: id,
    description: `Task "${task.title}" updated`,
  });

  return ok({ task: taskDto(task) });
});

export const DELETE = withDatabase(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const { id } = await params;
  if (!isValidObjectId(id)) return fail("That task could not be found.", 404);

  await connectToDatabase();
  const task = await TripTask.findByIdAndDelete(id);
  if (!task) return fail("That task could not be found.", 404);

  await recordAudit({
    userId: auth.user.id,
    action: "operation.task_deleted",
    module: "operations",
    recordId: id,
    description: `Task "${task.title}" deleted`,
  });

  return ok({ removed: true });
});
