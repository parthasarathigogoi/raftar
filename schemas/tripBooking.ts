import { z } from "zod";

const travellerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(0).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().trim().max(25).optional(),
  email: z.string().trim().max(160).optional(),
  idProof: z.string().trim().max(80).optional(),
  travellerType: z.enum(["adult", "child"]).default("adult"),
});

export const tripRegistrationSchema = z
  .object({
    numberOfAdults: z.coerce.number().int().min(1).max(50),
    numberOfChildren: z.coerce.number().int().min(0).max(50).default(0),
    travellers: z.array(travellerSchema).min(1).max(100),
    addonCodes: z.array(z.string().trim().min(1)).max(20).default([]),
    contactName: z.string().trim().min(2).max(120),
    contactEmail: z.string().trim().max(160),
    contactPhone: z.string().trim().min(7).max(25),
    captureConsent: z.boolean().default(false),
    marketingConsent: z.boolean().default(false),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => value.travellers.length === value.numberOfAdults + value.numberOfChildren, {
    message: "Traveller details must match the number of adults and children",
    path: ["travellers"],
  });

export type TripRegistrationInput = z.infer<typeof tripRegistrationSchema>;

export const adminBookingInputSchema = z.object({
  numberOfAdults: z.coerce.number().int().min(1).max(50),
  numberOfChildren: z.coerce.number().int().min(0).max(50).default(0),
  travellers: z.array(travellerSchema).min(1).max(100),
  addonCodes: z.array(z.string().trim().min(1)).max(20).default([]),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().max(160),
  contactPhone: z.string().trim().min(7).max(25),
  discountAmount: z.coerce.number().min(0).default(0),
  confirmImmediately: z.boolean().default(true),
  // Capture consent is recorded per booking; marketing consent is always separate.
  captureConsent: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});
