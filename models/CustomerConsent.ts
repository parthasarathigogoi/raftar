import { Schema, model, models } from "mongoose";
const CustomerConsentSchema = new Schema({ customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true }, photographyAndFilming: { type: Boolean, required: true }, marketingUse: { type: Boolean, default: false }, consentScope: String, consentedAt: { type: Date, default: Date.now }, withdrawnAt: Date }, { timestamps: true });
export const CustomerConsent = models.CustomerConsent || model("CustomerConsent", CustomerConsentSchema);
