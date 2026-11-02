import { Schema, model, models } from "mongoose";

export const TRIP_EVENT_STATUSES = ["draft", "published", "registration_open", "full", "completed", "cancelled"] as const;
export type TripEventStatus = (typeof TRIP_EVENT_STATUSES)[number];

const ItineraryDaySchema = new Schema(
  {
    day: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    locations: [{ type: String }],
    activities: [{ type: String }],
  },
  { _id: false }
);

const MediaAddonSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["photography", "filmmaking", "other"], default: "photography" },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    perPerson: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const ChildPricingSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    maxAge: { type: Number, default: 12, min: 0 },
  },
  { _id: false }
);

const CrewSchema = new Schema(
  {
    photographers: [{ type: Schema.Types.ObjectId, ref: "Partner" }],
    videographers: [{ type: Schema.Types.ObjectId, ref: "Partner" }],
    editors: [{ type: Schema.Types.ObjectId, ref: "Partner" }],
  },
  { _id: false }
);

const TripEventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shortDescription: { type: String, default: "" },
    fullDescription: { type: String, default: "" },
    destination: { type: String, required: true, trim: true },
    locations: [{ type: String }],
    coverImage: { type: String, default: "" },
    gallery: [{ type: String }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationStartDate: { type: Date },
    registrationEndDate: { type: Date },
    departureLocation: { type: String, default: "" },
    returnLocation: { type: String, default: "" },
    itinerary: [ItineraryDaySchema],
    accommodationDetails: { type: String, default: "" },
    transportDetails: { type: String, default: "" },
    foodDetails: { type: String, default: "" },
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    importantInformation: { type: String, default: "" },
    packingList: [{ type: String }],
    permitInformation: { type: String, default: "" },
    cancellationPolicy: { type: String, default: "" },
    pricePerPerson: { type: Number, required: true, min: 0 },
    childPricing: { type: ChildPricingSchema, default: () => ({}) },
    totalSeats: { type: Number, required: true, min: 1 },
    minimumParticipants: { type: Number, default: 1, min: 1 },
    photographyOptions: [MediaAddonSchema],
    filmmakingOptions: [MediaAddonSchema],
    bookingTerms: { type: String, default: "" },
    status: { type: String, enum: TRIP_EVENT_STATUSES, default: "draft", index: true },
    featured: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: Date,
    // Seat inventory counters. Reserved seats are temporary holds awaiting verified payment.
    seatsBooked: { type: Number, default: 0, min: 0 },
    seatsReserved: { type: Number, default: 0, min: 0 },
    assignedCrew: { type: CrewSchema, default: () => ({}) },
  },
  { timestamps: true }
);

TripEventSchema.index({ status: 1, startDate: 1 });

export const TripEvent = models.TripEvent || model("TripEvent", TripEventSchema);
