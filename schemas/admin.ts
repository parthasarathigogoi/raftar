import { z } from "zod";

export const partnerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  role: z.enum(["photographer", "videographer", "editor", "other"]).default("other"),
  skills: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const partnerUpdateSchema = partnerInputSchema.partial();

export const expenseInputSchema = z.object({
  tripEventId: z.string().trim().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(160),
  category: z.enum(["transport", "stay", "food", "permits", "crew", "equipment", "marketing", "misc"]).default("misc"),
  amount: z.coerce.number().min(0),
  incurredAt: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const expenseUpdateSchema = expenseInputSchema.partial();

export const announcementSchema = z.object({
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(4000),
});
