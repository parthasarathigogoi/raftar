import { Schema, model, models } from "mongoose";

const ExpenseSchema = new Schema(
  {
    tripEventId: { type: Schema.Types.ObjectId, ref: "TripEvent", index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ["transport", "stay", "food", "permits", "crew", "equipment", "marketing", "misc"], default: "misc" },
    amount: { type: Number, required: true, min: 0 },
    incurredAt: { type: Date, default: Date.now },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Expense = models.Expense || model("Expense", ExpenseSchema);
