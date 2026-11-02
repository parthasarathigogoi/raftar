import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, UsersRound } from "lucide-react";
import { listPublicTrips } from "@/lib/trips";
import { formatCurrency, formatDateRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let trips: Awaited<ReturnType<typeof listPublicTrips>> = [];
  let error = "";
  try {
    trips = await listPublicTrips({ scope: "all" });
  } catch {
    error = "Trips will appear here once the database is connected.";
  }

  const upcoming = trips.filter((trip) => new Date(trip.startDate) >= new Date());
  const past = trips.filter((trip) => new Date(trip.startDate) < new Date());

  return (
    <main className="trips-page">
      <nav className="shell trips-nav">
        <Link href="/" className="wordmark">
          RAF<span>TAR</span>
        </Link>
        <div className="trips-nav-links">
          <Link href="/events">Upcoming travel</Link>
          <Link href="/dashboard">My bookings</Link>
        </div>
      </nav>

      <header className="shell trips-head">
        <p className="eyebrow">Upcoming travel</p>
        <h1>Trips you can join today.</h1>
        <p>Every departure below is a complete, published RAFTAR journey — dates, itinerary, stays and media options included. Choose your trip and register directly.</p>
      </header>

      {error ? (
        <section className="shell trips-empty">
          <CalendarDays />
          <p>{error}</p>
        </section>
      ) : upcoming.length === 0 ? (
        <section className="shell trips-empty">
          <CalendarDays />
          <h2>New departures are being mapped.</h2>
          <p>No trips are open for booking right now. Check back soon, or plan a private journey in the meantime.</p>
          <Link className="button button-forest" href="/plan">
            Plan a private journey
          </Link>
        </section>
      ) : (
        <section className="shell trip-grid">
          {upcoming.map((trip) => (
            <article className="trip-card" key={trip.id}>
              <Link href={`/events/${trip.slug}`} className="trip-card-image">
                {trip.coverImage ? (
                  <Image src={trip.coverImage} alt={trip.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
                ) : (
                  <span className="trip-card-placeholder" />
                )}
                <span className="image-wash" />
                {trip.featured && <span className="trip-flag">Featured</span>}
              </Link>
              <div className="trip-card-body">
                <p className="trip-destination">
                  <MapPin /> {trip.destination}
                </p>
                <h3>
                  <Link href={`/events/${trip.slug}`}>{trip.title}</Link>
                </h3>
                <p className="trip-card-copy">{trip.shortDescription}</p>
                <div className="trip-meta">
                  <span>
                    <CalendarDays /> {formatDateRange(trip.startDate, trip.endDate)}
                  </span>
                  <span>
                    <UsersRound /> {trip.availableSeats} seats left
                  </span>
                </div>
                <div className="trip-card-foot">
                  <span className="trip-price">{formatCurrency(trip.pricePerPerson)} <i>/ person</i></span>
                  {trip.registrationOpen ? (
                    <Link className="button button-forest" href={`/events/${trip.slug}#register`}>
                      Book now <ArrowUpRight />
                    </Link>
                  ) : (
                    <span className="trip-closed">{trip.registrationMessage || "Registration closed"}</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="shell trips-past">
          <p className="eyebrow">Past departures</p>
          <div className="trips-past-list">
            {past.map((trip) => (
              <Link href={`/events/${trip.slug}`} key={trip.id}>
                {trip.title} <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="trips-footer">
        <div className="shell">
          <Link href="/" className="wordmark">
            RAF<span>TAR</span>
          </Link>
          <p>Travel. Live. Relive.</p>
        </div>
      </footer>
    </main>
  );
}
