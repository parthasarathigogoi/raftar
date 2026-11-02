import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import TripCard from "@/app/components/trip-card";
import { getDestinationProfile } from "@/lib/destinations";
import { listStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function DestinationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let destination: Awaited<ReturnType<typeof getDestinationProfile>> = null;
  let loadError = false;
  try {
    destination = await getDestinationProfile(slug);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <main className="trips-page">
        <PublicNav tone="light" />
        <section className="shell empty-state" style={{ padding: "120px 0" }}>
          <MapPin />
          <h2>This destination is temporarily unavailable.</h2>
          <p>We could not load this destination right now. Please try again shortly.</p>
          <Link className="btn btn-solid" href="/destinations">
            All destinations
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!destination) notFound();

  const relatedStories = listStories().filter((story) => story.destinationSlug === destination!.slug);
  const tripsHref = `/trips?destination=${encodeURIComponent(destination.name)}`;
  const facts = [
    { label: "Best time to visit", value: destination.bestTimeToVisit },
    { label: "Travel information", value: destination.travelInformation },
    { label: "Permits", value: destination.permitInformation },
  ].filter((fact) => Boolean(fact.value));

  return (
    <main className="trips-page">
      <PublicNav tone="light" />

      <header className="dest-hero">
        {destination.coverImage ? (
          <Image src={destination.coverImage} alt={destination.name} fill priority sizes="100vw" />
        ) : (
          <span className="trip-hero-placeholder" />
        )}
        <span className="film-wash" />
        <div className="shell dest-hero-copy">
          <p className="eyebrow light">Destination{destination.state ? ` · ${destination.state}` : ""}</p>
          <h1>{destination.name}</h1>
          <Link className="btn btn-sand" href={tripsHref}>
            Explore Trips to This Destination <ArrowRight />
          </Link>
        </div>
      </header>

      <section className="shell dest-intro">
        <div>
          {destination.description ? (
            <p className="trip-body">{destination.description}</p>
          ) : (
            <p className="trip-body">
              {destination.name} is one of the places RAFTAR travels to. The trips below are complete, date-specific departures —
              open one to see the full itinerary, inclusions and available seats.
            </p>
          )}

          {destination.gallery.length > 0 && (
            <div className="gallery-assets" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginTop: 24 }}>
              {destination.gallery.map((image: string, index: number) => (
                <div key={`${image}-${index}`} style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", background: "#e7dfce" }}>
                  <Image src={image} alt={`${destination!.name} ${index + 1}`} fill sizes="(max-width: 800px) 50vw, 220px" style={{ objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {facts.length > 0 && (
          <aside className="dest-facts">
            <h3>Good to know</h3>
            {facts.map((fact) => (
              <div key={fact.label}>
                <h3 style={{ fontSize: 14 }}>{fact.label}</h3>
                <p>{fact.value}</p>
              </div>
            ))}
          </aside>
        )}
      </section>

      <section className="shell" style={{ paddingBottom: 50 }}>
        <div className="home-section-head">
          <div>
            <p className="eyebrow">Upcoming trips</p>
            <h2>Trips to {destination.name}.</h2>
          </div>
          {destination.trips.length > 0 && (
            <Link className="text-link dark-link" href={tripsHref}>
              View all <ArrowRight />
            </Link>
          )}
        </div>

        {destination.trips.length === 0 ? (
          <section className="empty-state" style={{ padding: "40px 0 80px" }}>
            <MapPin />
            <h2>No trips are currently scheduled for this destination. Check back soon for upcoming adventures.</h2>
          </section>
        ) : (
          <div className="home-grid">
            {destination.trips.slice(0, 6).map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {relatedStories.length > 0 && (
        <section className="shell" style={{ paddingBottom: 90 }}>
          <div className="home-section-head">
            <div>
              <p className="eyebrow">Related stories</p>
              <h2>Read about {destination.name}.</h2>
            </div>
            <Link className="text-link dark-link" href="/stories">
              All stories <ArrowRight />
            </Link>
          </div>
          <div className="story-grid" style={{ marginTop: 0 }}>
            {relatedStories.map((story) => (
              <article className="story-card" key={story.slug}>
                <Link className="story-card-media" href={`/stories/${story.slug}`}>
                  <Image src={story.coverImage} alt={story.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
                </Link>
                <div className="story-card-body">
                  <span className="story-meta">{story.category} · {story.readingTime}</span>
                  <h3>
                    <Link href={`/stories/${story.slug}`}>{story.title}</Link>
                  </h3>
                  <p>{story.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
