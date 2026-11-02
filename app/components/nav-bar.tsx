"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, LogOut, Menu, UserRound, X } from "lucide-react";

export type NavUser = { name: string; role: string } | null;

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/trips", label: "Explore Trips" },
  { href: "/destinations", label: "Destinations" },
  { href: "/stories", label: "Travel Stories" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export default function NavBar({ user, tone = "light" }: { user: NavUser; tone?: "light" | "dark" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className={`site-nav ${tone === "dark" ? "on-dark" : "on-light"}`}>
      <div className="shell site-nav-inner">
        <Link href="/" className="wordmark" onClick={() => setOpen(false)}>
          RAF<span>TAR</span>
        </Link>

        <nav className="site-nav-links" aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-nav-actions">
          {user ? (
            <>
              <Link className="site-nav-account" href="/customer/dashboard">
                <UserRound /> {user.name.split(" ")[0] || "My Account"}
              </Link>
              <Link className="site-nav-text" href="/customer/bookings">
                My Bookings
              </Link>
              <button type="button" className="site-nav-text" onClick={signOut}>
                <LogOut /> Logout
              </button>
            </>
          ) : (
            <>
              <Link className="site-nav-text" href="/login">
                Log in
              </Link>
              <Link className="btn btn-solid" href="/trips">
                Book Your Trip <ArrowUpRight />
              </Link>
            </>
          )}
        </div>

        <button type="button" className="site-nav-burger" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="site-nav-panel">
          <div className="shell">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : undefined}>
                {link.label}
              </Link>
            ))}
            <div className="site-nav-panel-actions">
              {user ? (
                <>
                  <Link href="/customer/dashboard">My Account</Link>
                  <Link href="/customer/bookings">My Bookings</Link>
                  <button type="button" onClick={signOut}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login">Log in</Link>
                  <Link className="btn btn-solid" href="/trips">
                    Book Your Trip <ArrowUpRight />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
