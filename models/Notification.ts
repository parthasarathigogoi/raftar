import { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripEventId: { type: Schema.Types.ObjectId, ref: "TripEvent" },
    bookingId: { type: Schema.Types.ObjectId, ref: "TripBooking" },
    type: { type: String, enum: ["booking", "payment", "trip", "media", "announcement"], default: "trip" },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = models.Notification || model("Notification", NotificationSchema);
