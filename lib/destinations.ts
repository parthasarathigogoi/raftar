import { connectToDatabase } from "@/lib/db";
import { slugify } from "@/lib/booking-math";
import { listPublicTrips, type PublicTrip } from "@/lib/trips";
import { Destination } from "@/models/Destination";

type AnyRecord = Record<string, any>;

export type DestinationProfile = {
  slug: string;
  name: string;
  state: string;
  description: string;
  coverImage: string;
  gallery: string[];
  bestTimeToVisit: string;
  travelInformation: string;
  permitInformation: string;
  trips: PublicTrip[];
};

function destinationDto(doc: AnyRecord) {
  return {
    slug: String(doc.slug),
    name: String(doc.name),
    state: doc.state ? String(doc.state) : "",
    description: doc.description ? String(doc.description) : "",
    coverImage: doc.coverImage ? String(doc.coverImage) : "",
    gallery: (doc.gallery ?? []) as string[],
    bestTimeToVisit: doc.bestTimeToVisit ? String(doc.bestTimeToVisit) : "",
    travelInformation: doc.travelInformation ? String(doc.travelInformation) : "",
    permitInformation: doc.permitInformation ? String(doc.permitInformation) : "",
  };
}

/** Published destination records from the admin-managed Destination collection. */
export async function listPublishedDestinations() {
  await connectToDatabase();
  const docs = await Destination.find({ published: true }).sort({ featured: -1, name: 1 }).lean();
  return docs.map((doc) => destinationDto(doc as AnyRecord));
}

/**
 * Destination discovery profiles: published destination pages, enriched and back-filled
 * with the upcoming published trips that actually visit each place. Destinations are only
 * ever surfaced from real data — never invented.
 */
export async function listDestinationProfiles(): Promise<DestinationProfile[]> {
  const [docs, trips] = await Promise.all([listPublishedDestinations(), listPublicTrips({ scope: "upcoming" })]);

  const map = new Map<string, DestinationProfile>();
  for (const doc of docs) map.set(doc.slug, { ...doc, trips: [] });

  for (const trip of trips) {
    const slug = slugify(trip.destination || "northeast-india");
    const existing = map.get(slug);
    if (existing) {
      existing.trips.push(trip);
      if (!existing.coverImage) existing.coverImage = trip.coverImage ?? "";
    } else {
      map.set(slug, {
        slug,
        name: trip.destination,
        state: "",
        description: "",
        coverImage: trip.coverImage ?? "",
        gallery: [],
        bestTimeToVisit: "",
        travelInformation: "",
        permitInformation: "",
        trips: [trip],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.trips.length - a.trips.length || a.name.localeCompare(b.name));
}

export async function getDestinationProfile(slug: string): Promise<DestinationProfile | null> {
  const profiles = await listDestinationProfiles();
  return profiles.find((profile) => profile.slug === slug) ?? null;
}
