import { connectToDatabase } from "@/lib/db";
import { availableSeats, slugify } from "@/lib/booking-math";
import { registrationWindow } from "@/lib/booking-service";
import { TripEvent } from "@/models/TripEvent";

export const PUBLIC_TRIP_STATUSES = ["published", "registration_open", "full"] as const;

type AnyEvent = Record<string, any>;

/** Shape safe to expose publicly (never leaks internal crew ids or audit data). */
export function publicTripDto(event: AnyEvent) {
  const available = availableSeats(event.totalSeats, event.seatsBooked, event.seatsReserved);
  const window = registrationWindow(event as never);
  return {
    id: String(event._id),
    title: event.title,
    slug: event.slug,
    shortDescription: event.shortDescription,
    fullDescription: event.fullDescription,
    destination: event.destination,
    locations: event.locations ?? [],
    coverImage: event.coverImage,
    gallery: event.gallery ?? [],
    startDate: event.startDate,
    endDate: event.endDate,
    registrationStartDate: event.registrationStartDate,
    registrationEndDate: event.registrationEndDate,
    departureLocation: event.departureLocation,
    returnLocation: event.returnLocation,
    itinerary: event.itinerary ?? [],
    accommodationDetails: event.accommodationDetails,
    transportDetails: event.transportDetails,
    foodDetails: event.foodDetails,
    inclusions: event.inclusions ?? [],
    exclusions: event.exclusions ?? [],
    importantInformation: event.importantInformation,
    packingList: event.packingList ?? [],
    permitInformation: event.permitInformation,
    cancellationPolicy: event.cancellationPolicy,
    pricePerPerson: event.pricePerPerson,
    childPricing: event.childPricing ?? { enabled: false, price: 0, maxAge: 12 },
    totalSeats: event.totalSeats,
    seatsBooked: event.seatsBooked ?? 0,
    seatsReserved: event.seatsReserved ?? 0,
    availableSeats: available,
    minimumParticipants: event.minimumParticipants,
    photographyOptions: (event.photographyOptions ?? []).filter((addon: AnyEvent) => addon.active !== false),
    filmmakingOptions: (event.filmmakingOptions ?? []).filter((addon: AnyEvent) => addon.active !== false),
    bookingTerms: event.bookingTerms,
    status: event.status,
    featured: Boolean(event.featured),
    registrationOpen: window.open,
    registrationMessage: window.reason,
  };
}

export type PublicTrip = ReturnType<typeof publicTripDto>;

export async function listPublicTrips(options: { scope?: "upcoming" | "past" | "all"; featured?: boolean; limit?: number } = {}) {
  await connectToDatabase();
  const scope = options.scope ?? "upcoming";
  const filter: Record<string, unknown> = { status: { $in: PUBLIC_TRIP_STATUSES } };
  if (scope === "upcoming") filter.startDate = { $gte: new Date() };
  if (scope === "past") filter.startDate = { $lt: new Date() };
  if (options.featured) filter.featured = true;

  const events = await TripEvent.find(filter).sort({ startDate: 1 }).limit(options.limit ?? 60).lean();
  return events.map((event) => publicTripDto(event as AnyEvent));
}

export async function getPublicTripBySlug(slug: string) {
  await connectToDatabase();
  const event = await TripEvent.findOne({ slug, status: { $in: PUBLIC_TRIP_STATUSES } }).lean();
  return event ? publicTripDto(event as AnyEvent) : null;
}

/** Produce a slug that is unique among all trip events. */
export async function uniqueTripSlug(base: string, excludeId?: string) {
  const normalized = slugify(base);
  let candidate = normalized || `trip-${Date.now().toString(36)}`;
  let attempt = 1;
  while (await TripEvent.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    candidate = `${normalized}-${++attempt}`;
  }
  return candidate;
}
