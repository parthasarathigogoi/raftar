import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Camera, Clapperboard, Compass, Film, ImageIcon, MapPin } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import TripCard from "@/app/components/trip-card";
import { listPublicTrips, type PublicTrip } from "@/lib/trips";
import { listDestinationProfiles, type DestinationProfile } from "@/lib/destinations";

export const dynamic = "force-dynamic";

function scene(prompt: string, size: "landscape_16_9" | "portrait_4_3" | "square_hd" = "landscape_16_9") {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
}

const HERO_IMAGE = scene(
  "Cinematic wide shot of a traveller standing on a misty green mountain ridge in Northeast India, layered hills, soft dawn light, film grain, premium travel photography",
);
const MEDIA_IMAGE = scene(
  "A travel photographer with a camera photographing friends on a forest trail in Northeast India, warm natural light, candid documentary style, cinematic",
  "portrait_4_3",
);
const CTA_IMAGE = scene(
  "A winding road through lush green hills of Northeast India at golden hour, dramatic clouds, cinematic travel landscape photography",
);

const HOW_IT_WORKS = [
  { step: "01", icon: Compass, title: "Choose Your Adventure", copy: "Browse published RAFTAR trips, read the full itinerary and pick the departure that fits your dates." },
  { step: "02", icon: Camera, title: "Book Your Seat", copy: "Register yourself and your fellow travellers, add photography or filmmaking, and pay securely to confirm." },
  { step: "03", icon: Clapperboard, title: "Travel. Live. Relive.", copy: "Travel with the group, and have your memories delivered to a private gallery once they are edited." },
];

export default async function HomePage() {
  let trips: PublicTrip[] = [];
  let destinations: DestinationProfile[] = [];
  try {
    trips = await listPublicTrips({ scope: "upcoming", limit: 6 });
  } catch {
    trips = [];
  }
  try {
    destinations = (await listDestinationProfiles()).slice(0, 4);
  } catch {
    destinations = [];
  }

  return (
    <main>
      <section className="home-hero">
        <div className="home-hero-media">
          <Image src={HERO_IMAGE} alt="Traveller on a mountain ridge in Northeast India" fill priority sizes="100vw" />
          <span className="film-wash" />
        </div>
        <PublicNav tone="dark" />
        <div className="shell home-hero-content">
          <p className="eyebrow light">Northeast India · Group travel · Photography & film</p>
          <h1>
            Your Next Adventure
            <br />
            <i>Starts Here.</i>
          </h1>
          <p>
            Discover extraordinary journeys across Northeast India. Join our trips, meet new people, explore beautiful places,
            and take home memories captured forever.
          </p>
          <div className="home-hero-actions">
            <Link className="btn btn-sand" href="/trips">
              Explore Upcoming Trips <ArrowRight />
            </Link>
            <Link className="btn btn-outline" href="/stories" style={{ color: "#fff" }}>
              <Film /> Discover Our Travel Films
            </Link>
          </div>
        </div>
      </section>

      <section className="manifest-intro shell">
        <p className="eyebrow">More than a trip</p>
        <div>
          <h2>
            The place is only
            <br />
            the beginning.
          </h2>
          <p>
            RAFTAR organises complete group journeys across the Northeast and brings a visual storytelling crew along for the ride.
            You choose a trip that is already planned, we handle the route, the stays and the details — and capture the story
            while you live it.
          </p>
        </div>
        <div className="intro-stats">
          <span>
            <b>Travel</b> thoughtfully
          </span>
          <span>
            <b>Capture</b> beautifully
          </span>
          <span>
            <b>Relive</b> forever
          </span>
        </div>
      </section>

      <section className="home-section tinted">
        <div className="shell">
          <div className="home-section-head">
            <div>
              <p className="eyebrow">Upcoming trips</p>
              <h2>Departures ready to book.</h2>
            </div>
            <Link className="text-link dark-link" href="/trips">
              View all trips <ArrowRight />
            </Link>
          </div>

          {trips.length === 0 ? (
            <div className="empty-state">
              <MapPin />
              <h2>New departures are being mapped.</h2>
              <p>No trips are open for booking right now. Check back soon for upcoming adventures across Northeast India.</p>
            </div>
          ) : (
            <div className="home-grid">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="shell">
          <div className="home-section-head">
            <div>
              <p className="eyebrow">Explore destinations</p>
              <h2>Where will you go?</h2>
            </div>
            <p className="section-aside">Every destination page lists the RAFTAR trips currently scheduled to travel there.</p>
          </div>

          {destinations.length === 0 ? (
            <div className="empty-state">
              <MapPin />
              <h2>Destinations open as trips are published.</h2>
              <p>As soon as RAFTAR publishes a trip, its destination appears here with every scheduled departure.</p>
            </div>
          ) : (
            <div className="dest-grid">
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
            </div>
          )}
        </div>
      </section>

      <section className="home-section tinted" id="films">
        <div className="shell media-section">
          <div className="media-section-photo">
            <Image src={MEDIA_IMAGE} alt="RAFTAR photographer capturing a trip" fill sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
          <div>
            <p className="eyebrow">Travel photography & filmmaking</p>
            <h2>Memories, captured by people who travel with you.</h2>
            <p className="trip-body">
              RAFTAR is a travel brand and a visual storytelling crew. On eligible trips you can add professional photography,
              cinematic travel films and reels when you book — delivered to your private gallery afterwards.
            </p>
            <div className="media-list">
              <div>
                <h3>
                  <ImageIcon /> Travel photography
                </h3>
                <p>Candid and considered images of the places, the people and the in-between moments.</p>
              </div>
              <div>
                <h3>
                  <Film /> Cinematic travel films
                </h3>
                <p>Edited travel films and reels built around your real experience, not staged shots.</p>
              </div>
              <div>
                <h3>
                  <Camera /> Customer experiences
                </h3>
                <p>Shared stories and galleries from travellers — published only with their consent.</p>
              </div>
              <div>
                <h3>
                  <Clapperboard /> RAFTAR originals
                </h3>
                <p>Behind-the-scenes dispatches and original films from the road, in our travel journal.</p>
              </div>
            </div>
            <Link className="text-link dark-link" href="/stories">
              Read the travel journal <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section dark">
        <div className="shell">
          <div className="home-section-head">
            <div>
              <p className="eyebrow light">How it works</p>
              <h2>Three simple steps.</h2>
            </div>
          </div>
          <div className="steps-grid">
            {HOW_IT_WORKS.map((item) => (
              <article className="step-card" key={item.step}>
                <b>{item.step}</b>
                <item.icon />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <Image src={CTA_IMAGE} alt="A mountain road at golden hour" fill sizes="100vw" />
        <span className="film-wash" />
        <div className="shell home-cta-copy">
          <p className="eyebrow light">Your next story is waiting</p>
          <h2>Your next story is waiting.</h2>
          <Link className="btn btn-sand" href="/trips">
            Explore Trips <ArrowRight />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
