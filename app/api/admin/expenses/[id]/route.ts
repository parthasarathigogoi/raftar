import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Expense } from "@/models/Expense";
import { expenseUpdateSchema } from "@/schemas/admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = expenseUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the expense details.", 422);

  await connectToDatabase();
  const { id } = await params;
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.tripEventId === "") update.tripEventId = undefined;
  const expense = await Expense.findByIdAndUpdate(id, update, { new: true });
  if (!expense) return fail("That expense could not be found.", 404);
  return ok({ expense: { ...expense.toObject(), id: String(expense._id) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const { id } = await params;
  const expense = await Expense.findByIdAndDelete(id);
  if (!expense) return fail("That expense could not be found.", 404);
  return ok({ deleted: true });
}
