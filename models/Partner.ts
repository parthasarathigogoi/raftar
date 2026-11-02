import { Schema, model, models } from "mongoose";

const PartnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    role: { type: String, enum: ["photographer", "videographer", "editor", "other"], default: "other" },
    skills: [{ type: String }],
    notes: String,
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Partner = models.Partner || model("Partner", PartnerSchema);
