import { Schema, model, models } from "mongoose";

const TripTaskSchema = new Schema(
  {
    tripEventId: { type: Schema.Types.ObjectId, ref: "TripEvent", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["accommodation", "transport", "guide", "activities", "photography", "videography", "editing", "permits", "participants", "departure", "emergency", "other"],
      default: "other",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    dueDate: Date,
    status: { type: String, enum: ["pending", "in_progress", "done", "blocked"], default: "pending", index: true },
    notes: { type: String, default: "" },
    completedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TripTaskSchema.index({ tripEventId: 1, status: 1 });

export const TripTask = models.TripTask || model("TripTask", TripTaskSchema);
