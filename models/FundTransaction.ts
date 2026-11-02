import { Schema, model, models } from "mongoose";

// Internal travel-fund ledger. `amount` is stored in RUPEES (consistent with
// Expense.amount and trip pricing across the app) — never paise.
const FundTransactionSchema = new Schema(
  {
    type: { type: String, enum: ["allocation", "withdrawal"], required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, enum: ["surplus_allocation", "exploration_trip", "photography", "filmmaking", "equipment", "other"], default: "other" },
    tripEventId: { type: Schema.Types.ObjectId, ref: "TripEvent" },
    description: { type: String, required: true, trim: true },
    reference: { type: String, trim: true },
    occurredAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const FundTransaction = models.FundTransaction || model("FundTransaction", FundTransactionSchema);
