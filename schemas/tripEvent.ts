import { z } from "zod";

export const tripEventStatusSchema = z.enum(["draft", "published", "registration_open", "full", "completed", "cancelled"]);

const itineraryDaySchema = z.object({
  day: z.coerce.number().int().min(1),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).default(""),
  locations: z.array(z.string().trim().min(1)).default([]),
  activities: z.array(z.string().trim().min(1)).default([]),
});

const mediaAddonSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["photography", "filmmaking", "other"]).default("photography"),
  description: z.string().trim().max(1000).default(""),
  price: z.coerce.number().min(0),
  perPerson: z.boolean().default(false),
  active: z.boolean().default(true),
});

const childPricingSchema = z.object({
  enabled: z.boolean().default(false),
  price: z.coerce.number().min(0).default(0),
  maxAge: z.coerce.number().int().min(0).max(18).default(12),
});

const crewSchema = z.object({
  photographers: z.array(z.string()).default([]),
  videographers: z.array(z.string()).default([]),
  editors: z.array(z.string()).default([]),
});

const optionalDate = z.union([z.coerce.date(), z.literal(""), z.null()]).optional();

export const tripEventBaseSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(2).max(80).optional(),
  shortDescription: z.string().trim().max(400).default(""),
  fullDescription: z.string().trim().max(20000).default(""),
  destination: z.string().trim().min(2).max(120),
  locations: z.array(z.string().trim().min(1)).default([]),
  coverImage: z.string().trim().max(600).default(""),
  gallery: z.array(z.string().trim().min(1)).default([]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationStartDate: optionalDate,
  registrationEndDate: optionalDate,
  departureLocation: z.string().trim().max(200).default(""),
  returnLocation: z.string().trim().max(200).default(""),
  itinerary: z.array(itineraryDaySchema).default([]),
  accommodationDetails: z.string().trim().max(4000).default(""),
  transportDetails: z.string().trim().max(4000).default(""),
  foodDetails: z.string().trim().max(4000).default(""),
  inclusions: z.array(z.string().trim().min(1)).default([]),
  exclusions: z.array(z.string().trim().min(1)).default([]),
  importantInformation: z.string().trim().max(6000).default(""),
  packingList: z.array(z.string().trim().min(1)).default([]),
  permitInformation: z.string().trim().max(6000).default(""),
  cancellationPolicy: z.string().trim().max(6000).default(""),
  pricePerPerson: z.coerce.number().min(0),
  childPricing: childPricingSchema.optional(),
  totalSeats: z.coerce.number().int().min(1).max(10000),
  minimumParticipants: z.coerce.number().int().min(1).max(10000).default(1),
  photographyOptions: z.array(mediaAddonSchema).default([]),
  filmmakingOptions: z.array(mediaAddonSchema).default([]),
  bookingTerms: z.string().trim().max(6000).default(""),
  status: tripEventStatusSchema.default("draft"),
  featured: z.boolean().default(false),
  assignedCrew: crewSchema.optional(),
});

export const tripEventInputSchema = tripEventBaseSchema
  .refine((value) => value.endDate >= value.startDate, { message: "End date must be on or after the start date", path: ["endDate"] })
  .refine(
    (value) => !value.registrationStartDate || !value.registrationEndDate || (value.registrationEndDate as Date) >= (value.registrationStartDate as Date),
    { message: "Registration end date must be on or after the registration start date", path: ["registrationEndDate"] }
  );

export const tripEventUpdateSchema = tripEventBaseSchema.partial();

export type TripEventInput = z.infer<typeof tripEventInputSchema>;
