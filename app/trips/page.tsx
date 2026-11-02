import Link from "next/link";
import { SearchX } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import TripCard from "@/app/components/trip-card";
import { listPublicTrips, type PublicTrip } from "@/lib/trips";
import { tripAvailability, type TripAvailabilityState } from "@/lib/trip-status";
import { tripDuration } from "@/lib/format";
import TripFilters from "./trip-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DURATION_BUCKETS: Record<string, (days: number) => boolean> = {
  "1-3": (days) => days <= 3,
  "4-6": (days) => days >= 4 && days <= 6,
  "7+": (days) => days >= 7,
};

const AVAILABILITY_LABELS: Record<string, string> = {
  registration_open: "Registration open",
  almost_full: "Almost full",
  fully_booked: "Fully booked",
  registration_closed: "Registration closed",
  upcoming: "Upcoming",
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TripsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (single(params.q) ?? "").trim().toLowerCase();
  const destination = single(params.destination) ?? "";
  const from = single(params.from) ?? "";
  const to = single(params.to) ?? "";
  const maxPrice = Number(single(params.maxPrice) ?? "");
  const duration = single(params.duration) ?? "";
  const availabilityFilter = single(params.availability) ?? "";
  const sort = single(params.sort) ?? "date";

  let trips: PublicTrip[] = [];
  let loadError = "";
  try {
    trips = await listPublicTrips({ scope: "upcoming", limit: 120 });
  } catch {
    loadError = "Trips will appear here once the database is connected.";
  }

  const destinations = [...new Set(trips.map((trip) => trip.destination).filter(Boolean))].sort();

  let results = trips.filter((trip) => {
    if (q && !`${trip.title} ${trip.destination}`.toLowerCase().includes(q)) return false;
    if (destination && trip.destination !== destination) return false;
    if (from && new Date(trip.startDate).getTime() < new Date(from).getTime()) return false;
    if (to && new Date(trip.endDate).getTime() > new Date(to).getTime() + 86_400_000) return false;
    if (Number.isFinite(maxPrice) && maxPrice > 0 && trip.pricePerPerson > maxPrice) return false;
    if (duration && DURATION_BUCKETS[duration]) {
      const { days } = tripDuration(trip.startDate, trip.endDate);
      if (!DURATION_BUCKETS[duration](days)) return false;
    }
    if (availabilityFilter && tripAvailability(trip).state !== (availabilityFilter as TripAvailabilityState)) return false;
    return true;
  });

  results = [...results].sort((a, b) => {
    if (sort === "price-asc") return a.pricePerPerson - b.pricePerPerson;
    if (sort === "price-desc") return b.pricePerPerson - a.pricePerPerson;
    if (sort === "popularity") return (b.seatsBooked ?? 0) - (a.seatsBooked ?? 0);
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  return (
    <main className="trips-page">
      <PublicNav tone="light" />

      <header className="shell trips-head">
        <p className="eyebrow">Explore trips</p>
        <h1>Find the trip that fits.</h1>
        <p>
          Every departure below is a complete, published RAFTAR journey — dates, itinerary, stays and media options included.
          Search, filter and book your seat directly.
        </p>
      </header>

      <div className="shell">
        <TripFilters destinations={destinations} hasTrips={trips.length > 0} />

        {loadError ? (
          <section className="empty-state">
            <SearchX />
            <h2>Trips are unavailable right now.</h2>
            <p>{loadError}</p>
          </section>
        ) : results.length === 0 ? (
          <section className="empty-state">
            <SearchX />
            <h2>{trips.length === 0 ? "New departures are being mapped." : "No trips match your filters."}</h2>
            <p>
              {trips.length === 0
                ? "No trips are open for booking right now. Check back soon for upcoming adventures across Northeast India."
                : "Try widening your search — clear a filter or explore a different destination."}
            </p>
            {trips.length > 0 && (
              <Link className="btn btn-solid" href="/trips">
                Clear filters
              </Link>
            )}
          </section>
        ) : (
          <section className="home-grid" style={{ paddingBottom: 60 }}>
            {results.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </section>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
