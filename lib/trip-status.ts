/**
 * Pure, client-safe trip presentation helpers.
 *
 * Kept free of database/framework imports so trip cards, filters and the booking flow
 * can share one source of truth for availability both on the server and in the browser.
 */

export type TripAvailabilityState = "upcoming" | "registration_open" | "almost_full" | "fully_booked" | "registration_closed";

export type TripAvailability = { state: TripAvailabilityState; label: string; bookable: boolean };

/**
 * Derive the truthful, customer-facing availability state of a trip.
 * Never invent urgency: "Almost full" only appears when seats genuinely run low.
 */
export function tripAvailability(trip: {
  status?: string;
  availableSeats: number;
  totalSeats: number;
  registrationOpen: boolean;
  registrationMessage?: string;
  registrationStartDate?: string | Date | null;
}): TripAvailability {
  if (trip.status === "completed") return { state: "registration_closed", label: "Trip completed", bookable: false };
  if (trip.status === "cancelled") return { state: "registration_closed", label: "Trip cancelled", bookable: false };
  if (trip.status === "full" || trip.availableSeats <= 0) return { state: "fully_booked", label: "Fully booked", bookable: false };

  const opensAt = trip.registrationStartDate ? new Date(trip.registrationStartDate).getTime() : null;
  if (opensAt && opensAt > Date.now()) return { state: "upcoming", label: "Registration opens soon", bookable: false };
  if (!trip.registrationOpen) return { state: "registration_closed", label: trip.registrationMessage || "Registration closed", bookable: false };

  const lowSeatThreshold = Math.max(2, Math.ceil((trip.totalSeats || 0) * 0.15));
  if (trip.availableSeats <= lowSeatThreshold) return { state: "almost_full", label: "Almost full", bookable: true };
  return { state: "registration_open", label: "Registration open", bookable: true };
}

export type TripMediaAddon = {
  code: string;
  name: string;
  kind: string;
  description: string;
  price: number;
  perPerson: boolean;
};

/** Minimal, serialisable trip shape shared by trip cards and listing filters. */
export type TripCardData = {
  slug: string;
  title: string;
  destination: string;
  coverImage?: string;
  shortDescription?: string;
  startDate: string | Date;
  endDate: string | Date;
  pricePerPerson: number;
  availableSeats: number;
  totalSeats: number;
  status: string;
  registrationOpen: boolean;
  registrationMessage: string;
  registrationStartDate?: string | Date | null;
  photographyOptions: TripMediaAddon[];
  filmmakingOptions: TripMediaAddon[];
  featured?: boolean;
};
