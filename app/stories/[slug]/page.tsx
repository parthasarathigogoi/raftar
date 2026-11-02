import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import TripCard from "@/app/components/trip-card";
import { listPublicTrips, type PublicTrip } from "@/lib/trips";
import { getStory, listStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  let relatedTrips: PublicTrip[] = [];
  if (story.destinationName) {
    try {
      relatedTrips = (await listPublicTrips({ scope: "upcoming" })).filter((trip) => trip.destination === story.destinationName).slice(0, 3);
    } catch {
      relatedTrips = [];
    }
  }

  const moreStories = listStories().filter((item) => item.slug !== story.slug).slice(0, 3);

  return (
    <main className="trips-page">
      <PublicNav tone="light" />

      <header className="story-article-hero">
        <Image src={story.coverImage} alt={story.title} fill priority sizes="100vw" />
        <span className="film-wash" />
      </header>

      <article className="shell story-article">
        <span className="story-meta">{story.source} · {story.readingTime}</span>
        <h1>{story.title}</h1>
        <p className="story-lead">{story.excerpt}</p>

        {story.sections.map((section, index) => (
          <section key={index}>
            {section.heading && <h2>{section.heading}</h2>}
            {section.paragraphs.map((paragraph, pIndex) => (
              <p key={pIndex}>{paragraph}</p>
            ))}
          </section>
        ))}

        {story.destinationName && (
          <p>
            <Link className="text-link dark-link" href={`/destinations/${story.destinationSlug}`}>
              Explore {story.destinationName} <ArrowRight />
            </Link>
          </p>
        )}

        {relatedTrips.length > 0 && (
          <div className="story-related">
            <p className="eyebrow">Trips in this story</p>
            <div className="home-grid">
              {relatedTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </div>
        )}

        {moreStories.length > 0 && (
          <div className="story-related">
            <p className="eyebrow">More from the journal</p>
            <div className="story-grid" style={{ marginTop: 0 }}>
              {moreStories.map((item) => (
                <article className="story-card" key={item.slug}>
                  <Link className="story-card-media" href={`/stories/${item.slug}`}>
                    <Image src={item.coverImage} alt={item.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
                  </Link>
                  <div className="story-card-body">
                    <span className="story-meta">{item.source} · {item.readingTime}</span>
                    <h3>
                      <Link href={`/stories/${item.slug}`}>{item.title}</Link>
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </article>

      <SiteFooter />
    </main>
  );
}
