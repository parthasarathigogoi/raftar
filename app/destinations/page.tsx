import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import { listDestinationProfiles, type DestinationProfile } from "@/lib/destinations";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  let destinations: DestinationProfile[] = [];
  let loadError = false;
  try {
    destinations = await listDestinationProfiles();
  } catch {
    loadError = true;
  }

  return (
    <main className="trips-page">
      <PublicNav tone="light" />

      <header className="shell trips-head">
        <p className="eyebrow">Destinations</p>
        <h1>Where will you go?</h1>
        <p>
          Explore the places RAFTAR travels across Northeast India. Each destination lists the upcoming trips currently scheduled to
          travel there — pick a place and see the departures that are ready to book.
        </p>
      </header>

      <div className="shell" style={{ paddingBottom: 60 }}>
        {loadError || destinations.length === 0 ? (
          <section className="empty-state">
            <MapPin />
            <h2>Destinations open as trips are published.</h2>
            <p>As soon as RAFTAR publishes a trip, its destination appears here with every scheduled departure.</p>
            <Link className="btn btn-solid" href="/trips">
              Explore trips
            </Link>
          </section>
        ) : (
          <section className="dest-grid">
            {destinations.map((destination) => (
              <Link className="dest-card" href={`/destinations/${destination.slug}`} key={destination.slug}>
                {destination.coverImage ? (
                  <Image src={destination.coverImage} alt={destination.name} fill sizes="(max-width: 800px) 100vw, 33vw" />
                ) : (
                  <span className="trip-card-placeholder" />
                )}
                <span className="image-wash" />
                <div className="dest-card-body">
                  <h3>{destination.name}</h3>
                  <p>
                    {destination.trips.length > 0
                      ? `${destination.trips.length} upcoming ${destination.trips.length === 1 ? "trip" : "trips"}`
                      : "Browsing this destination"}
                  </p>
                  <span className="text-link light-link">
                    Explore trips <ArrowUpRight />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
