import Link from "next/link";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";

export const dynamic = "force-static";

export default function ContactPage() {
  return (
    <main className="trips-page">
      <PublicNav tone="light" />

      <header className="shell about-hero">
        <p className="eyebrow">Contact</p>
        <h1>Talk to the RAFTAR team.</h1>
        <p className="trip-body">
          Questions about a trip, your booking, or the media you have ordered? Reach us directly — we are happy to help.
        </p>
      </header>

      <div className="shell contact-grid">
        <div className="contact-card">
          <a href="mailto:hello@raftar.travel">
            <Mail /> hello@raftar.travel
          </a>
          <a href="tel:+919000000000">
            <Phone /> +91 90000 00000
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            <Instagram /> @raftar.travel
          </a>
          <p>
            <MapPin style={{ width: 16, verticalAlign: "-2px", marginRight: 6 }} /> Guwahati, Assam — India
          </p>
          <p className="account-note">We usually reply within one working day.</p>
        </div>

        <div>
          <h2>Planning to travel with us?</h2>
          <p className="trip-body">
            You do not need to request a destination or wait for a quotation. Every RAFTAR trip is already planned and published —
            browse the departures, read the full itinerary and book your seats directly.
          </p>
          <div className="book-actions" style={{ justifyContent: "flex-start" }}>
            <Link className="btn btn-solid" href="/trips">
              Explore trips
            </Link>
            <Link className="btn btn-ghost" href="/customer/bookings">
              My bookings
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
