import { Schema, model, models } from "mongoose";

export const BOOKING_STATUSES = ["pending_payment", "confirmed", "cancelled", "refunded", "completed"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "partially_paid", "failed", "refunded"] as const;

const TravellerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0 },
    gender: { type: String, enum: ["male", "female", "other"] },
    phone: String,
    email: String,
    idProof: String,
    travellerType: { type: String, enum: ["adult", "child"], default: "adult" },
  },
  { _id: false }
);

const SelectedAddonSchema = new Schema(
  {
    addonId: { type: Schema.Types.ObjectId },
    code: { type: String, required: true },
    name: { type: String, required: true },
    kind: { type: String, default: "other" },
    price: { type: Number, required: true, min: 0 },
    perPerson: { type: Boolean, default: false },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema(
  { status: { type: String, required: true }, at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: "User" }, note: String },
  { _id: false }
);

const TripBookingSchema = new Schema(
  {
    bookingReference: { type: String, required: true, unique: true },
    tripEventId: { type: Schema.Types.ObjectId, ref: "TripEvent", required: true, index: true },
    // Manual (admin) registrations may not have a customer account yet.
    customerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    travellerDetails: [TravellerSchema],
    numberOfAdults: { type: Number, required: true, min: 1 },
    numberOfChildren: { type: Number, default: 0, min: 0 },
    selectedAddons: [SelectedAddonSchema],
    baseAmount: { type: Number, required: true, min: 0 },
    addonAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    amountRefunded: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending", index: true },
    bookingStatus: { type: String, enum: BOOKING_STATUSES, default: "pending_payment", index: true },
    paymentReference: String,
    bookingDate: { type: Date, default: Date.now },
    // Temporary inventory hold while the customer completes checkout.
    holdExpiresAt: { type: Date },
    priceSnapshot: { pricePerPerson: Number, childPrice: Number, childPricingEnabled: Boolean, taxPercent: Number },
    tripSnapshot: { title: String, slug: String, destination: String, startDate: Date, endDate: Date },
    mediaConsent: {
      captureConsent: { type: Boolean, default: false },
      marketingConsent: { type: Boolean, default: false },
    },
    contactName: String,
    contactEmail: String,
    contactPhone: String,
    source: { type: String, enum: ["customer", "admin"], default: "customer" },
    notes: String,
    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true }
);

TripBookingSchema.index({ tripEventId: 1, bookingStatus: 1 });
TripBookingSchema.index({ holdExpiresAt: 1, bookingStatus: 1 });

export const TripBooking = models.TripBooking || model("TripBooking", TripBookingSchema);
