"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, UsersRound } from "lucide-react";
import { computeBookingAmounts } from "@/lib/booking-math";
import { formatCurrency, formatDateRange } from "@/lib/format";
import type { TripAvailability, TripMediaAddon } from "@/lib/trip-status";

type PanelTrip = {
  slug: string;
  pricePerPerson: number;
  childPricing: { enabled: boolean; price: number; maxAge: number };
  availableSeats: number;
  totalSeats: number;
  startDate: string | Date;
  endDate: string | Date;
  photographyOptions: TripMediaAddon[];
  filmmakingOptions: TripMediaAddon[];
};

/**
 * Sticky booking panel used on the trip detail page. It only estimates the price —
 * the authoritative amount and seat availability are always recalculated on the server.
 */
export default function BookingPanel({
  trip,
  availability,
  taxPercent,
  razorpayConfigured,
}: {
  trip: PanelTrip;
  availability: TripAvailability;
  taxPercent: number;
  razorpayConfigured: boolean;
}) {
  const addons = useMemo(() => [...trip.photographyOptions, ...trip.filmmakingOptions], [trip.photographyOptions, trip.filmmakingOptions]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const seats = adults + children;
  const seatsOk = seats <= trip.availableSeats;
  const childPricingEnabled = trip.childPricing.enabled;

  const amounts = useMemo(
    () =>
      computeBookingAmounts({
        pricePerPerson: trip.pricePerPerson,
        childPricingEnabled,
        childPrice: trip.childPricing.price,
        numberOfAdults: adults,
        numberOfChildren: children,
        addons: addons
          .filter((addon) => selected.includes(addon.code))
          .map((addon) => ({ code: addon.code, name: addon.name, price: addon.price, perPerson: addon.perPerson })),
        taxPercent,
      }),
    [addons, adults, children, childPricingEnabled, selected, taxPercent, trip.childPricing.price, trip.pricePerPerson]
  );

  function toggle(code: string) {
    setSelected((current) => (current.includes(code) ? current.filter((value) => value !== code) : [...current, code]));
  }

  function stepAdults(delta: number) {
    setAdults((value) => Math.min(Math.max(1, value + delta), Math.max(1, trip.availableSeats)));
  }

  function stepChildren(delta: number) {
    setChildren((value) => Math.min(Math.max(0, value + delta), Math.max(0, trip.availableSeats - adults)));
  }

  const bookHref = `/trips/${trip.slug}/book?adults=${adults}&children=${children}${selected.length ? `&addons=${selected.join(",")}` : ""}`;

  return (
    <>
      <div className="booking-panel" id="book">
        <p className="bp-price">
          {formatCurrency(trip.pricePerPerson)} <span>/ person</span>
        </p>

        <div className="bp-meta">
          <span>
            <CalendarDays /> {formatDateRange(trip.startDate, trip.endDate)}
          </span>
          <span>
            <UsersRound /> {trip.availableSeats} of {trip.totalSeats} seats available
          </span>
        </div>

        <span className={`state-pill ${availability.state}`}>{availability.label}</span>

        {availability.bookable ? (
          <>
            <div className="bp-row">
              <span>Adults</span>
              <span className="bp-stepper">
                <button type="button" onClick={() => stepAdults(-1)} disabled={adults <= 1} aria-label="Fewer adults">
                  −
                </button>
                <b>{adults}</b>
                <button type="button" onClick={() => stepAdults(1)} disabled={seats >= trip.availableSeats} aria-label="More adults">
                  +
                </button>
              </span>
            </div>

            <div className="bp-row">
              <span>
                Children {childPricingEnabled ? <em>({formatCurrency(trip.childPricing.price)})</em> : <em>(free)</em>}
              </span>
              <span className="bp-stepper">
                <button type="button" onClick={() => stepChildren(-1)} disabled={children <= 0} aria-label="Fewer children">
                  −
                </button>
                <b>{children}</b>
                <button type="button" onClick={() => stepChildren(1)} disabled={seats >= trip.availableSeats} aria-label="More children">
                  +
                </button>
              </span>
            </div>

            {addons.length > 0 && (
              <div style={{ margin: "14px 0" }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5d6d64" }}>
                  Photo & film add-ons
                </p>
                {addons.map((addon) => (
                  <label key={addon.code} className={selected.includes(addon.code) ? "option-row active" : "option-row"}>
                    <input type="checkbox" checked={selected.includes(addon.code)} onChange={() => toggle(addon.code)} />
                    <span>
                      <strong>{addon.name}</strong>
                      <small>{formatCurrency(addon.price)} {addon.perPerson ? "per person" : "one-time"}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {!seatsOk && <p className="bp-note" style={{ color: "#a83e2d" }}>Only {trip.availableSeats} seats remain for this departure.</p>}

            <div className="bp-total">
              <span>Estimated total</span>
              <strong>{formatCurrency(amounts.totalAmount)}</strong>
            </div>
            <Link className="btn btn-solid btn-block" href={bookHref} aria-disabled={!seatsOk} style={!seatsOk ? { pointerEvents: "none", opacity: 0.6 } : undefined}>
              Book This Trip <ArrowRight />
            </Link>
            {!razorpayConfigured && (
              <p className="bp-note">Online payment is not configured yet — you can still register and RAFTAR will get in touch to complete payment.</p>
            )}
            <p className="bp-note">Seats are held for a short window while you pay. Your booking is confirmed only after the payment is verified.</p>
          </>
        ) : (
          <div className="bp-closed">
            <AlertTriangle />
            <span>{availability.label}. Booking is unavailable for this departure.</span>
          </div>
        )}
      </div>

      <div className="mobile-book-bar">
        <span>
          <small>From</small>
          <strong>{formatCurrency(trip.pricePerPerson)}</strong>
        </span>
        {availability.bookable ? (
          <Link className="btn btn-sand" href={bookHref}>
            Book This Trip
          </Link>
        ) : (
          <span className={`state-pill ${availability.state}`}>{availability.label}</span>
        )}
      </div>
    </>
  );
}
