import { Schema, model, models } from "mongoose";

const RefundSchema = new Schema(
  {
    refundId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: String,
    status: { type: String, enum: ["created", "processed", "failed"], default: "created" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "TripBooking", required: true, index: true },
    tripEventId: { type: Schema.Types.ObjectId, ref: "TripEvent", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    provider: { type: String, enum: ["razorpay", "manual"], default: "razorpay" },
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String },
    signature: String,
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed", "refunded", "partially_refunded"], default: "created", index: true },
    method: String,
    receiptNumber: { type: String, unique: true, sparse: true },
    refunds: [RefundSchema],
    // Unique per gateway event so webhooks cannot double-process a payment.
    gatewayEventId: { type: String, unique: true, sparse: true },
    verifiedAt: Date,
    failureReason: String,
    rawPayload: { type: Schema.Types.Mixed, select: false },
  },
  { timestamps: true }
);

export const Payment = models.Payment || model("Payment", PaymentSchema);
