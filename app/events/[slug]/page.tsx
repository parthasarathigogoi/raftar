import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, MapPin, Route, UsersRound, X } from "lucide-react";
import { getPublicTripBySlug } from "@/lib/trips";
import { getRazorpayPublicConfig } from "@/lib/razorpay";
import { formatCurrency, formatDateRange } from "@/lib/format";
import RegisterPanel from "./register-panel";

export const dynamic = "force-dynamic";

function cleanAddons(addons: Array<Record<string, unknown>>) {
  return (addons ?? []).map((addon) => ({
    code: String(addon.code ?? ""),
    name: String(addon.name ?? ""),
    kind: String(addon.kind ?? "photography"),
    description: String(addon.description ?? ""),
    price: Number(addon.price ?? 0),
    perPerson: Boolean(addon.perPerson),
  }));
}

export default async function TripDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getPublicTripBySlug(slug);
  if (!trip) notFound();

  const razorpay = getRazorpayPublicConfig();
  const bookingTrip = {
    slug: trip.slug,
    title: trip.title,
    destination: trip.destination,
    pricePerPerson: trip.pricePerPerson,
    childPricing: trip.childPricing,
    photographyOptions: cleanAddons(trip.photographyOptions),
    filmmakingOptions: cleanAddons(trip.filmmakingOptions),
    availableSeats: trip.availableSeats,
    totalSeats: trip.totalSeats,
    seatsBooked: trip.seatsBooked,
    registrationOpen: trip.registrationOpen,
    registrationMessage: trip.registrationMessage,
  };

  const hasMedia = trip.photographyOptions.length > 0 || trip.filmmakingOptions.length > 0;

  return (
    <main className="trip-detail">
      <nav className="shell trips-nav">
        <Link href="/" className="wordmark">
          RAF<span>TAR</span>
        </Link>
        <div className="trips-nav-links">
          <Link href="/events">All trips</Link>
          <Link href="/dashboard">My bookings</Link>
        </div>
      </nav>

      <header className="trip-hero">
        {trip.coverImage ? (
          <Image src={trip.coverImage} alt={trip.title} fill priority sizes="100vw" />
        ) : (
          <span className="trip-hero-placeholder" />
        )}
        <span className="film-wash" />
        <div className="shell trip-hero-copy">
          <p className="eyebrow light">{trip.destination}</p>
          <h1>{trip.title}</h1>
          <div className="trip-hero-meta">
            <span>
              <CalendarDays /> {formatDateRange(trip.startDate, trip.endDate)}
            </span>
            <span>
              <MapPin /> {trip.departureLocation || trip.destination}
            </span>
            <span>
              <UsersRound /> {trip.availableSeats} seats left
            </span>
          </div>
        </div>
      </header>

      <div className="shell trip-detail-grid">
        <div className="trip-content">
          {trip.shortDescription && <p className="trip-lead">{trip.shortDescription}</p>}
          {trip.fullDescription && <p className="trip-body">{trip.fullDescription}</p>}

          {trip.locations.length > 0 && (
            <section className="trip-section">
              <h2>Places you'll travel</h2>
              <div className="chips">
                {trip.locations.map((location: string) => (
                  <span className="chip" key={location}>
                    {location}
                  </span>
                ))}
              </div>
            </section>
          )}

          {trip.itinerary.length > 0 && (
            <section className="trip-section">
              <h2>Day by day</h2>
              <ol className="itinerary">
                {trip.itinerary.map((day: { day: number; title: string; description?: string; locations?: string[]; activities?: string[] }) => (
                  <li key={day.day}>
                    <span className="itinerary-day">Day {day.day}</span>
                    <div>
                      <h3>{day.title}</h3>
                      {day.description && <p>{day.description}</p>}
                      {day.locations && day.locations.length > 0 && (
                        <p className="itinerary-meta">
                          <Route /> {day.locations.join(" · ")}
                        </p>
                      )}
                      {day.activities && day.activities.length > 0 && (
                        <div className="chips" style={{ marginTop: 8 }}>
                          {day.activities.map((activity: string) => (
                            <span className="chip" key={activity}>
                              {activity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="trip-section">
            <h2>The practical details</h2>
            <div className="trip-practical">
              {trip.accommodationDetails && (
                <article>
                  <h3>Accommodation</h3>
                  <p>{trip.accommodationDetails}</p>
                </article>
              )}
              {trip.transportDetails && (
                <article>
                  <h3>Transport</h3>
                  <p>{trip.transportDetails}</p>
                </article>
              )}
              {trip.foodDetails && (
                <article>
                  <h3>Food</h3>
                  <p>{trip.foodDetails}</p>
                </article>
              )}
              {trip.permitInformation && (
                <article>
                  <h3>Permits</h3>
                  <p>{trip.permitInformation}</p>
                </article>
              )}
            </div>
          </section>

          {(trip.inclusions.length > 0 || trip.exclusions.length > 0) && (
            <section className="trip-section">
              <h2>Inclusions & exclusions</h2>
              <div className="trip-inclusions">
                {trip.inclusions.length > 0 && (
                  <div>
                    <h3>Included</h3>
                    <ul className="tick-list">
                      {trip.inclusions.map((item: string) => (
                        <li key={item}>
                          <Check /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trip.exclusions.length > 0 && (
                  <div>
                    <h3>Not included</h3>
                    <ul className="cross-list">
                      {trip.exclusions.map((item: string) => (
                        <li key={item}>
                          <X /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {hasMedia && (
            <section className="trip-section">
              <h2>RAFTAR photography & filmmaking</h2>
              <p className="trip-body">Add a RAFTAR crew to your trip. Your edited photographs and films are delivered to your private gallery afterwards.</p>
              <div className="media-addon-grid">
                {[...trip.photographyOptions, ...trip.filmmakingOptions].map((addon) => (
                  <article key={addon.code}>
                    <p className="eyebrow">{addon.kind}</p>
                    <h3>{addon.name}</h3>
                    <p>{addon.description}</p>
                    <span>
                      {formatCurrency(addon.price)} {addon.perPerson ? "per person" : "one-time"}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {trip.packingList.length > 0 && (
            <section className="trip-section">
              <h2>Packing list</h2>
              <div className="chips">
                {trip.packingList.map((item: string) => (
                  <span className="chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {trip.importantInformation && (
            <section className="trip-section">
              <h2>Important information</h2>
              <p className="trip-body">{trip.importantInformation}</p>
            </section>
          )}

          {(trip.cancellationPolicy || trip.bookingTerms) && (
            <section className="trip-section">
              <h2>Policy & terms</h2>
              {trip.cancellationPolicy && (
                <>
                  <h3>Cancellation policy</h3>
                  <p className="trip-body">{trip.cancellationPolicy}</p>
                </>
              )}
              {trip.bookingTerms && (
                <>
                  <h3>Booking terms</h3>
                  <p className="trip-body">{trip.bookingTerms}</p>
                </>
              )}
            </section>
          )}
        </div>

        <aside className="trip-aside">
          <RegisterPanel trip={bookingTrip} razorpayConfigured={razorpay.configured} />
        </aside>
      </div>

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
