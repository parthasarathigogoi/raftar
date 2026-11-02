import { Schema, model, models } from "mongoose";
const DestinationSchema = new Schema({ name: { type: String, required: true }, slug: { type: String, required: true, unique: true }, state: { type: String, required: true }, description: { type: String, required: true }, coverImage: String, gallery: [String], bestTimeToVisit: String, travelInformation: String, permitInformation: String, featured: { type: Boolean, default: false }, published: { type: Boolean, default: false } }, { timestamps: true });
export const Destination = models.Destination || model("Destination", DestinationSchema);
