import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Expense } from "@/models/Expense";
import { expenseInputSchema } from "@/schemas/admin";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const params = request.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (params.get("tripEventId")) filter.tripEventId = params.get("tripEventId");
  if (params.get("category")) filter.category = params.get("category");

  const expenses = await Expense.find(filter)
    .sort({ incurredAt: -1 })
    .limit(500)
    .populate({ path: "tripEventId", select: "title slug" })
    .lean();

  return ok({
    expenses: expenses.map((expense) => {
      const trip = expense.tripEventId && typeof expense.tripEventId === "object" ? (expense.tripEventId as Record<string, any>) : null;
      return {
        id: String(expense._id),
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        incurredAt: expense.incurredAt,
        notes: expense.notes ?? null,
        tripEventId: trip ? String(trip._id) : null,
        tripTitle: trip?.title ?? null,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = expenseInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the expense details.", 422);

  await connectToDatabase();
  const expense = await Expense.create({
    ...parsed.data,
    tripEventId: parsed.data.tripEventId || undefined,
    createdBy: auth.user.id,
  });

  await recordAudit({
    userId: auth.user.id,
    action: "expense.created",
    module: "expenses",
    recordId: String(expense._id),
    description: `Expense "${expense.title}" of ₹${expense.amount} recorded`,
    metadata: { category: expense.category, tripEventId: parsed.data.tripEventId || null },
  });

  return ok({ expense: { ...expense.toObject(), id: String(expense._id) } }, 201);
}
