import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer-grid">
        <div className="site-footer-brand">
          <Link href="/" className="wordmark">
            RAF<span>TAR</span>
          </Link>
          <p>Travel. Live.<br />Relive.</p>
        </div>

        <div>
          <p className="footer-label">Explore</p>
          <Link href="/trips">Upcoming trips</Link>
          <Link href="/destinations">Destinations</Link>
          <Link href="/stories">Travel stories</Link>
        </div>

        <div>
          <p className="footer-label">Your account</p>
          <Link href="/customer/dashboard">My account</Link>
          <Link href="/customer/bookings">My bookings</Link>
          <Link href="/customer/gallery">Private gallery</Link>
        </div>

        <div>
          <p className="footer-label">RAFTAR</p>
          <Link href="/about">About us</Link>
          <Link href="/contact">Contact</Link>
          <a href="mailto:hello@raftar.travel">hello@raftar.travel</a>
        </div>
      </div>

      <div className="shell site-footer-bottom">
        <span>© {new Date().getFullYear()} RAFTAR</span>
        <span>Travel. Live. Relive.</span>
      </div>
    </footer>
  );
}
