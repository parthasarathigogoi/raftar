import { Schema, model, models } from "mongoose";
const AuditLogSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User" }, action: { type: String, required: true }, module: { type: String, required: true }, recordId: String, description: String, metadata: Schema.Types.Mixed, timestamp: { type: Date, default: Date.now } }, { timestamps: false });
export const AuditLog = models.AuditLog || model("AuditLog", AuditLogSchema);
