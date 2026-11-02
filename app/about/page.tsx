import Link from "next/link";
import { ArrowRight, Camera, Clapperboard, Compass } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";

export const dynamic = "force-static";

const PRINCIPLES = [
  {
    icon: Compass,
    title: "Trips, not quotations",
    copy: "Every RAFTAR journey is planned, priced and published before you see it. You choose a departure that already exists — no waiting for a custom quotation.",
  },
  {
    icon: Camera,
    title: "Travel and storytelling together",
    copy: "RAFTAR is a travel brand and a visual crew. On eligible trips you can add professional photography and cinematic films, delivered to a private gallery.",
  },
  {
    icon: Clapperboard,
    title: "Consent, always",
    copy: "We photograph and film with the group's permission, and we publish customer media only when travellers have separately agreed to it.",
  },
];

export default function AboutPage() {
  return (
    <main className="trips-page">
      <PublicNav tone="light" />

      <header className="shell about-hero">
        <p className="eyebrow">About RAFTAR</p>
        <h1>Travel. Live. Relive.</h1>
        <p className="trip-body">
          RAFTAR organises group journeys across Northeast India — the living root bridges of Meghalaya, the grasslands of Kaziranga,
          the monasteries of Arunachal and the festivals of Nagaland. We plan the route, arrange the stays and handle the details, and
          we bring a visual storytelling crew along so the memories are captured while you live them.
        </p>
      </header>

      <div className="shell about-grid">
        {PRINCIPLES.map((principle) => (
          <article key={principle.title}>
            <principle.icon style={{ width: 26, height: 26, color: "#C9794A", marginBottom: 12 }} />
            <h3>{principle.title}</h3>
            <p>{principle.copy}</p>
          </article>
        ))}
      </div>

      <section className="shell" style={{ paddingBottom: 100 }}>
        <h2>Find your next journey.</h2>
        <p className="trip-body">
          Browse the departures that are open for booking right now, or explore the places we travel to and the stories behind them.
        </p>
        <div className="book-actions" style={{ justifyContent: "flex-start" }}>
          <Link className="btn btn-solid" href="/trips">
            Explore trips <ArrowRight />
          </Link>
          <Link className="btn btn-ghost" href="/contact">
            Contact us
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
