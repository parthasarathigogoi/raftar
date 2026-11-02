import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import { listStories } from "@/lib/stories";

export const dynamic = "force-static";

export default function StoriesPage() {
  const stories = listStories();
  const [feature, ...rest] = stories;

  return (
    <main className="trips-page">
      <PublicNav tone="light" />

      <header className="shell trips-head">
        <p className="eyebrow">Travel journal</p>
        <h1>Stories from the road.</h1>
        <p>
          RAFTAR Originals, travel films, photography and destination writing from across Northeast India. Only customer media
          shared with consent ever appears here.
        </p>
      </header>

      <div className="shell" style={{ paddingBottom: 80 }}>
        {feature && (
          <article className="story-feature">
            <Link className="story-feature-media" href={`/stories/${feature.slug}`}>
              <Image src={feature.coverImage} alt={feature.title} fill priority sizes="(max-width: 1080px) 100vw, 55vw" />
            </Link>
            <div className="story-feature-body">
              <span className="story-meta">{feature.source} · {feature.readingTime}</span>
              <h2>{feature.title}</h2>
              <p>{feature.excerpt}</p>
              <Link className="text-link dark-link" href={`/stories/${feature.slug}`}>
                Read the story <ArrowRight />
              </Link>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <div className="story-grid">
            {rest.map((story) => (
              <article className="story-card" key={story.slug}>
                <Link className="story-card-media" href={`/stories/${story.slug}`}>
                  <Image src={story.coverImage} alt={story.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
                </Link>
                <div className="story-card-body">
                  <span className="story-meta">{story.source} · {story.readingTime}</span>
                  <h3>
                    <Link href={`/stories/${story.slug}`}>{story.title}</Link>
                  </h3>
                  <p>{story.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
