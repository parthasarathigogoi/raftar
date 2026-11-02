import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { roundCurrency } from "@/lib/booking-math";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { FundTransaction } from "@/models/FundTransaction";

// Amounts in this ledger are RUPEES (consistent with the rest of the app).
const fundEntrySchema = z.object({
  type: z.enum(["allocation", "withdrawal"]),
  amount: z.coerce.number().min(1),
  category: z.enum(["surplus_allocation", "exploration_trip", "photography", "filmmaking", "equipment", "other"]).default("other"),
  description: z.string().trim().min(2),
  reference: z.string().trim().optional().or(z.literal("")),
  tripEventId: z.string().trim().optional().or(z.literal("")),
  occurredAt: z.coerce.date().optional(),
});

/** Current ledger totals, computed straight from stored transactions. */
async function loadTotals() {
  const rows = await FundTransaction.aggregate<{ _id: string; total: number }>([
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);
  let allocated = 0;
  let withdrawn = 0;
  for (const row of rows) {
    if (row._id === "allocation") allocated = roundCurrency(row.total);
    if (row._id === "withdrawal") withdrawn = roundCurrency(row.total);
  }
  return { allocated, withdrawn, balance: roundCurrency(allocated - withdrawn) };
}

export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();

  const transactions = await FundTransaction.find()
    .sort({ occurredAt: -1 })
    .populate({ path: "tripEventId", select: "title slug" })
    .lean();

  const { allocated, withdrawn, balance } = await loadTotals();

  return ok({
    balance,
    allocated,
    withdrawn,
    transactions: transactions.map((transaction) => {
      const trip = transaction.tripEventId && typeof transaction.tripEventId === "object" ? (transaction.tripEventId as Record<string, any>) : null;
      return {
        id: String(transaction._id),
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        reference: transaction.reference ?? null,
        occurredAt: transaction.occurredAt,
        tripEventId: trip ? String(trip._id) : null,
        tripTitle: trip?.title ?? null,
      };
    }),
  });
});

export const POST = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const parsed = fundEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please review the fund entry details.", 422);

  await connectToDatabase();

  // A withdrawal can never exceed the genuinely available surplus balance.
  if (parsed.data.type === "withdrawal") {
    const { balance } = await loadTotals();
    if (parsed.data.amount > balance) return fail("Insufficient travel fund balance.", 422);
  }

  const transaction = await FundTransaction.create({
    type: parsed.data.type,
    amount: parsed.data.amount,
    category: parsed.data.category,
    description: parsed.data.description,
    reference: parsed.data.reference || undefined,
    tripEventId: parsed.data.tripEventId || undefined,
    occurredAt: parsed.data.occurredAt,
    createdBy: auth.user.id,
  });

  await recordAudit({
    userId: auth.user.id,
    action: "travel_fund.entry_recorded",
    module: "travel_fund",
    recordId: String(transaction._id),
    description: `${parsed.data.type === "allocation" ? "Allocation" : "Withdrawal"} of ₹${parsed.data.amount} recorded`,
    metadata: { type: parsed.data.type, amount: parsed.data.amount, category: parsed.data.category },
  });

  return ok({ transaction: { ...transaction.toObject(), id: String(transaction._id) } }, 201);
});
