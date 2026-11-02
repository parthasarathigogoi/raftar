import { Schema, model, models } from "mongoose";
// Capture consent (photography & filming) is always recorded separately from
// marketing/publication consent, which must be granted explicitly.
const CustomerConsentSchema = new Schema({ customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, bookingId: { type: Schema.Types.ObjectId, ref: "TripBooking", required: true, index: true }, tripEventId: { type: Schema.Types.ObjectId, ref: "TripEvent" }, photographyAndFilming: { type: Boolean, required: true }, marketingUse: { type: Boolean, default: false }, consentScope: String, consentedAt: { type: Date, default: Date.now }, withdrawnAt: Date }, { timestamps: true });
export const CustomerConsent = models.CustomerConsent || model("CustomerConsent", CustomerConsentSchema);
