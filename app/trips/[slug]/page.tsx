import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bus,
  CalendarDays,
  Camera,
  Check,
  Clapperboard,
  Clock,
  Compass,
  Film,
  MapPin,
  Package,
  Route,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import { getPublicTripBySlug, type PublicTrip } from "@/lib/trips";
import { tripAvailability, type TripMediaAddon } from "@/lib/trip-status";
import { formatCurrency, formatDateRange, formatDuration } from "@/lib/format";
import { getRazorpayPublicConfig } from "@/lib/razorpay";
import { resolveTaxPercent } from "@/lib/booking-service";
import BookingPanel from "./booking-panel";

export const dynamic = "force-dynamic";

type ItineraryDay = { day: number; title: string; description?: string; locations?: string[]; activities?: string[] };

function cleanAddons(addons: Array<Record<string, unknown>>): TripMediaAddon[] {
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

  let trip: PublicTrip | null = null;
  let loadError = false;
  try {
    trip = await getPublicTripBySlug(slug);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <main className="trip-detail">
        <PublicNav tone="light" />
        <section className="shell empty-state" style={{ padding: "120px 0" }}>
          <Camera />
          <h2>This trip is temporarily unavailable.</h2>
          <p>We could not load the trip right now. Please try again shortly or browse all departures.</p>
          <Link className="btn btn-solid" href="/trips">
            Browse all trips
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!trip) notFound();

  const availability = tripAvailability(trip);
  const photography = cleanAddons(trip.photographyOptions);
  const filmmaking = cleanAddons(trip.filmmakingOptions);
  const mediaAddons = [...photography, ...filmmaking];
  const hasMedia = mediaAddons.length > 0;
  const razorpay = getRazorpayPublicConfig();
  const gallery = (trip.gallery ?? []).filter(Boolean);

  const practical = [
    { icon: Bus, title: "Transport", copy: trip.transportDetails },
    { icon: Package, title: "Accommodation", copy: trip.accommodationDetails },
    { icon: Compass, title: "Food", copy: trip.foodDetails },
  ].filter((item) => Boolean(item.copy));

  const panelTrip = {
    slug: trip.slug,
    pricePerPerson: trip.pricePerPerson,
    childPricing: trip.childPricing,
    availableSeats: trip.availableSeats,
    totalSeats: trip.totalSeats,
    startDate: trip.startDate,
    endDate: trip.endDate,
    photographyOptions: photography,
    filmmakingOptions: filmmaking,
  };

  return (
    <main className="trip-detail">
      <PublicNav tone="light" />

      {/* A. Hero */}
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
              <Clock /> {formatDuration(trip.startDate, trip.endDate)}
            </span>
            <span>
              <MapPin /> {trip.departureLocation || trip.destination}
            </span>
            <span>
              <UsersRound /> {trip.availableSeats} seats left
            </span>
          </div>
          <div style={{ marginTop: 16 }}>
            <span className={`state-pill ${availability.state}`}>{availability.label}</span>
          </div>
        </div>
      </header>

      <div className="shell trip-detail-grid">
        <div className="trip-content">
          {/* B. About this trip */}
          {(trip.shortDescription || trip.fullDescription) && (
            <section className="trip-section" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
              <h2>About this trip</h2>
              {trip.shortDescription && <p className="trip-lead">{trip.shortDescription}</p>}
              {trip.fullDescription && <p className="trip-body">{trip.fullDescription}</p>}
              {trip.locations.length > 0 && (
                <div className="chips" style={{ marginTop: 14 }}>
                  {trip.locations.map((location: string) => (
                    <span className="chip" key={location}>
                      <MapPin /> {location}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* C. Photo gallery */}
          {gallery.length > 0 && (
            <section className="trip-section">
              <h2>Gallery</h2>
              <div className="gallery-assets" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
                {gallery.map((image: string, index: number) => (
                  <div key={`${image}-${index}`} style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", background: "#e7dfce" }}>
                    <Image src={image} alt={`${trip!.title} ${index + 1}`} fill sizes="(max-width: 800px) 50vw, 240px" style={{ objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* D. Complete itinerary */}
          {trip.itinerary.length > 0 && (
            <section className="trip-section">
              <h2>Day by day</h2>
              <ol className="itinerary">
                {trip.itinerary.map((day: ItineraryDay) => (
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

          {/* E & F. Includes / Excludes */}
          {(trip.inclusions.length > 0 || trip.exclusions.length > 0) && (
            <section className="trip-section">
              <h2>Package includes</h2>
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

          {/* G. Important information */}
          {(practical.length > 0 ||
            trip.departureLocation ||
            trip.returnLocation ||
            trip.packingList.length > 0 ||
            trip.permitInformation ||
            trip.importantInformation ||
            trip.cancellationPolicy ||
            trip.bookingTerms) && (
            <section className="trip-section">
              <h2>Important information</h2>

              {practical.length > 0 && (
                <div className="trip-practical" style={{ marginBottom: 22 }}>
                  {practical.map((item) => (
                    <article key={item.title}>
                      <h3>
                        <item.icon style={{ width: 16, verticalAlign: "-2px", marginRight: 6 }} /> {item.title}
                      </h3>
                      <p>{item.copy}</p>
                    </article>
                  ))}
                </div>
              )}

              <div className="trip-practical">
                {trip.departureLocation && (
                  <article>
                    <h3>Meeting point</h3>
                    <p>{trip.departureLocation}</p>
                  </article>
                )}
                {trip.returnLocation && (
                  <article>
                    <h3>Return</h3>
                    <p>{trip.returnLocation}</p>
                  </article>
                )}
                {trip.permitInformation && (
                  <article>
                    <h3>Permits</h3>
                    <p>{trip.permitInformation}</p>
                  </article>
                )}
                {trip.importantInformation && (
                  <article>
                    <h3>Travel notes</h3>
                    <p>{trip.importantInformation}</p>
                  </article>
                )}
              </div>

              {trip.packingList.length > 0 && (
                <>
                  <h3 style={{ marginTop: 26 }}>Packing list</h3>
                  <div className="chips">
                    {trip.packingList.map((item: string) => (
                      <span className="chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {(trip.cancellationPolicy || trip.bookingTerms) && (
                <div style={{ marginTop: 26 }}>
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
                </div>
              )}
            </section>
          )}

          {/* H. Photography & filmmaking */}
          {hasMedia ? (
            <section className="trip-section">
              <h2>Photography & filmmaking</h2>
              <p className="trip-body">
                Add a RAFTAR crew to your trip. Choose any of the options below while booking — your edited photographs and films
                are delivered to your private gallery after the journey.
              </p>
              <div className="media-addon-grid">
                {mediaAddons.map((addon) => (
                  <article key={addon.code}>
                    <p className="eyebrow">
                      {addon.kind === "filmmaking" ? <Film /> : <Camera />} {addon.kind}
                    </p>
                    <h3>{addon.name}</h3>
                    <p>{addon.description}</p>
                    <span>
                      {formatCurrency(addon.price)} {addon.perPerson ? "per person" : "one-time"}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="trip-section">
              <h2>Photography & filmmaking</h2>
              <p className="trip-body">
                This departure does not include a RAFTAR media crew. Browse our other trips to travel with photography and filmmaking
                support, or explore the RAFTAR journal for our original travel films.
              </p>
              <Link className="text-link dark-link" href="/stories">
                <Clapperboard /> Read the travel journal
              </Link>
            </section>
          )}

          <div style={{ marginTop: 40 }}>
            <span className="state-pill upcoming">
              <ShieldCheck /> {availability.label}
            </span>
          </div>
        </div>

        {/* I. Booking panel */}
        <aside className="trip-aside">
          <BookingPanel trip={panelTrip} availability={availability} taxPercent={resolveTaxPercent()} razorpayConfigured={razorpay.configured} />
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}
