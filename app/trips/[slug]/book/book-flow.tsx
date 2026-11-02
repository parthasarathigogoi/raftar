"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { computeBookingAmounts } from "@/lib/booking-math";
import { formatCurrency, formatDateRange, formatDuration } from "@/lib/format";
import type { TripAvailability, TripMediaAddon } from "@/lib/trip-status";

type BookTrip = {
  slug: string;
  title: string;
  destination: string;
  coverImage?: string;
  startDate: string | Date;
  endDate: string | Date;
  pricePerPerson: number;
  childPricing: { enabled: boolean; price: number; maxAge: number };
  totalSeats: number;
  availableSeats: number;
  photographyOptions: TripMediaAddon[];
  filmmakingOptions: TripMediaAddon[];
};

type Traveller = { name: string; age: string; travellerType: "adult" | "child" };
type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = Record<string, unknown> & { handler: (response: RazorpayResult) => void };

const STEPS = ["Travellers", "Add-ons", "Details", "Summary", "Payment"];

const emptyTraveller = (type: "adult" | "child"): Traveller => ({ name: "", age: "", travellerType: type });

export default function BookFlow({
  trip,
  availability,
  taxPercent,
  razorpayConfigured,
  signedIn,
  initialAdults,
  initialChildren,
  initialAddons,
  loginHref,
}: {
  trip: BookTrip;
  availability: TripAvailability;
  taxPercent: number;
  razorpayConfigured: boolean;
  signedIn: boolean;
  initialAdults: number;
  initialChildren: number;
  initialAddons: string[];
  loginHref: string;
}) {
  const addons = useMemo(() => [...trip.photographyOptions, ...trip.filmmakingOptions], [trip.photographyOptions, trip.filmmakingOptions]);

  const [step, setStep] = useState(0);
  const [adults, setAdults] = useState(Math.max(1, initialAdults));
  const [children, setChildren] = useState(Math.max(0, initialChildren));
  const [travellers, setTravellers] = useState<Traveller[]>(() => {
    const list: Traveller[] = [];
    for (let i = 0; i < Math.max(1, initialAdults); i += 1) list.push(emptyTraveller("adult"));
    for (let i = 0; i < Math.max(0, initialChildren); i += 1) list.push(emptyTraveller("child"));
    return list;
  });
  const [selected, setSelected] = useState<string[]>(initialAddons);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [emergency, setEmergency] = useState({ name: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState({ capture: false, marketing: false, terms: false });
  const [status, setStatus] = useState<"idle" | "loading" | "paying" | "confirmed" | "error">("idle");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [orderId, setOrderId] = useState("");

  const seats = adults + children;

  function syncTravellers(nextAdults: number, nextChildren: number) {
    const total = nextAdults + nextChildren;
    setTravellers((current) => {
      const next: Traveller[] = [];
      for (let index = 0; index < total; index += 1) {
        const type: "adult" | "child" = index < nextAdults ? "adult" : "child";
        next.push(current[index] ? { ...current[index], travellerType: type } : emptyTraveller(type));
      }
      return next;
    });
  }

  function setAdultsCount(value: number) {
    const next = Math.min(Math.max(1, value), Math.max(1, trip.availableSeats));
    setAdults(next);
    syncTravellers(next, children);
  }

  function setChildrenCount(value: number) {
    const next = Math.min(Math.max(0, value), Math.max(0, trip.availableSeats - adults));
    setChildren(next);
    syncTravellers(adults, next);
  }

  function updateTraveller(index: number, patch: Partial<Traveller>) {
    setTravellers((current) => current.map((traveller, i) => (i === index ? { ...traveller, ...patch } : traveller)));
  }

  function toggleAddon(code: string) {
    setSelected((current) => (current.includes(code) ? current.filter((value) => value !== code) : [...current, code]));
  }

  const amounts = useMemo(
    () =>
      computeBookingAmounts({
        pricePerPerson: trip.pricePerPerson,
        childPricingEnabled: trip.childPricing.enabled,
        childPrice: trip.childPricing.price,
        numberOfAdults: adults,
        numberOfChildren: children,
        addons: addons
          .filter((addon) => selected.includes(addon.code))
          .map((addon) => ({ code: addon.code, name: addon.name, price: addon.price, perPerson: addon.perPerson })),
        taxPercent,
      }),
    [addons, adults, children, selected, taxPercent, trip.childPricing.enabled, trip.childPricing.price, trip.pricePerPerson]
  );

  const selectedAddons = addons.filter((addon) => selected.includes(addon.code));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function validateStep(current: number): string {
    if (current === 0) {
      if (seats > trip.availableSeats) return `Only ${trip.availableSeats} seats remain for this departure.`;
      return "";
    }
    if (current === 2) {
      if (travellers.some((traveller) => traveller.name.trim().length < 2)) return "Please enter a name for every traveller.";
      if (!contact.name.trim() || contact.name.trim().length < 2) return "Please add the primary contact name.";
      if (!contact.email.trim()) return "Please add an email for the booking.";
      if (contact.phone.trim().length < 7) return "Please add a valid phone number.";
      if (!consent.terms) return "Please accept the booking terms to continue.";
      return "";
    }
    return "";
  }

  function next() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  function back() {
    setError("");
    setStep((value) => Math.max(value - 1, 0));
  }

  async function startPayment() {
    setError("");
    if (!availability.bookable) {
      setError(availability.label + " — booking is unavailable for this departure.");
      return;
    }

    setStatus("loading");
    const composedNotes = [
      notes.trim(),
      emergency.name.trim() || emergency.phone.trim() ? `Emergency contact: ${emergency.name.trim()} ${emergency.phone.trim()}`.trim() : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const response = await fetch(`/api/trips/${trip.slug}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numberOfAdults: adults,
        numberOfChildren: children,
        travellers: travellers.map((traveller) => ({
          name: traveller.name.trim(),
          age: traveller.age ? Number(traveller.age) : undefined,
          travellerType: traveller.travellerType,
        })),
        addonCodes: selected,
        contactName: contact.name.trim(),
        contactEmail: contact.email.trim(),
        contactPhone: contact.phone.trim(),
        captureConsent: consent.capture,
        marketingConsent: consent.marketing,
        notes: composedNotes || undefined,
      }),
    });

    const payload = await response.json();
    if (response.status === 401) {
      setStatus("error");
      setError("Please sign in to complete your booking.");
      return;
    }
    if (!response.ok) {
      setStatus("error");
      setError(payload.error?.message ?? "We could not start your booking.");
      return;
    }

    const booking = payload.data.booking;
    const order = payload.data.payment;
    setReference(booking.reference);
    setOrderId(order.orderId);
    await openCheckout(order);
  }

  async function openCheckout(order: { keyId: string; orderId: string; amount: number; currency: string }) {
    setStatus("paying");
    let RazorpayCtor: (new (options: RazorpayOptions) => { open: () => void }) | undefined;
    try {
      RazorpayCtor = await loadRazorpay();
    } catch {
      setStatus("error");
      setError("We could not load the payment window. Please check your connection and try again.");
      return;
    }
    if (!RazorpayCtor) {
      setStatus("error");
      setError("The payment window is unavailable right now.");
      return;
    }

    const checkout = new RazorpayCtor({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: "RAFTAR",
      description: trip.title,
      order_id: order.orderId,
      prefill: { name: contact.name, email: contact.email, contact: contact.phone },
      notes: { trip: trip.title },
      theme: { color: "#183D32" },
      handler: async (result: RazorpayResult) => {
        await verifyPayment(result);
      },
      modal: {
        ondismiss: () => {
          setStatus("error");
          setError("Payment was not completed. Your seats are held for a short time — you can try again.");
        },
      },
    });
    checkout.open();
  }

  async function verifyPayment(result: RazorpayResult) {
    setStatus("loading");
    const verify = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature }),
    });
    const payload = await verify.json();
    if (!verify.ok) {
      setStatus("error");
      setError(payload.error?.message ?? "We could not verify the payment. If money was deducted it will be confirmed automatically.");
      return;
    }
    setStatus("confirmed");
  }

  // Step 6 — Confirmation
  if (status === "confirmed") {
    return (
      <section className="shell" style={{ paddingBottom: 110 }}>
        <div className="confirm-card">
          <ShieldCheck />
          <h1>You&apos;re going to {trip.destination}.</h1>
          <p className="trip-body">Your seats are confirmed. A confirmation is in your account along with the full trip details.</p>
          <span className="confirm-ref">{reference}</span>
          <div className="confirm-grid">
            <div>
              <small>Trip</small>
              <strong>{trip.title}</strong>
            </div>
            <div>
              <small>Dates</small>
              <strong>{formatDateRange(trip.startDate, trip.endDate)}</strong>
            </div>
            <div>
              <small>Travellers</small>
              <strong>
                {adults} adult(s){children > 0 ? ` · ${children} child(ren)` : ""}
              </strong>
            </div>
            <div>
              <small>Amount paid</small>
              <strong>{formatCurrency(amounts.totalAmount)}</strong>
            </div>
          </div>
          <div className="confirm-actions">
            <Link className="btn btn-solid" href="/customer/bookings">
              View my bookings
            </Link>
            <Link className="btn btn-ghost" href={`/trips/${trip.slug}`}>
              Back to trip
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="shell">
      <header className="book-head">
        <p className="eyebrow">Book your seat</p>
        <h1>{trip.title}</h1>
        <p style={{ color: "#55655d" }}>
          {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)} · {formatDuration(trip.startDate, trip.endDate)}
        </p>
      </header>

      <ol className="book-steps">
        {STEPS.map((label, index) => (
          <li key={label} className={`book-step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}>
            {index < step ? <Check style={{ width: 13, verticalAlign: "-2px" }} /> : `0${index + 1}`} &nbsp;{label}
          </li>
        ))}
      </ol>

      {!availability.bookable && (
        <div className="register-closed" style={{ marginBottom: 22 }}>
          <AlertTriangle />
          <p>{availability.label}. Booking is unavailable for this departure.</p>
        </div>
      )}

      {!signedIn && (
        <div className="register-config" style={{ marginBottom: 22 }}>
          <Lock />
          <p>
            You need a RAFTAR account to book. <Link className="text-link dark-link" href={loginHref}>Sign in or create one</Link> — you&apos;ll come right back here.
          </p>
        </div>
      )}

      {error && <div className="account-error">{error}</div>}

      <div className="book-layout">
        <div>
          {step === 0 && (
            <div className="book-card">
              <h2>Who&apos;s travelling?</h2>
              <p className="book-hint">Choose how many seats you need. You can add traveller names in the next steps.</p>
              <div className="stepper-block">
                <span>
                  <strong>Adults</strong>
                  <small>Age 13 and above</small>
                </span>
                <span className="bp-stepper">
                  <button type="button" onClick={() => setAdultsCount(adults - 1)} disabled={adults <= 1} aria-label="Fewer adults">
                    −
                  </button>
                  <b>{adults}</b>
                  <button type="button" onClick={() => setAdultsCount(adults + 1)} disabled={seats >= trip.availableSeats} aria-label="More adults">
                    +
                  </button>
                </span>
              </div>
              <div className="stepper-block">
                <span>
                  <strong>Children</strong>
                  <small>{trip.childPricing.enabled ? `${formatCurrency(trip.childPricing.price)} each · up to age ${trip.childPricing.maxAge}` : "Travel free on this trip"}</small>
                </span>
                <span className="bp-stepper">
                  <button type="button" onClick={() => setChildrenCount(children - 1)} disabled={children <= 0} aria-label="Fewer children">
                    −
                  </button>
                  <b>{children}</b>
                  <button type="button" onClick={() => setChildrenCount(children + 1)} disabled={seats >= trip.availableSeats} aria-label="More children">
                    +
                  </button>
                </span>
              </div>
              <p className="book-hint" style={{ marginTop: 18 }}>
                {seats} of {trip.availableSeats} available seats selected.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="book-card">
              <h2>Photography & filmmaking</h2>
              <p className="book-hint">
                {addons.length > 0
                  ? "Optional add-ons for this trip. Your edited media is delivered to your private gallery afterwards."
                  : "This departure does not offer RAFTAR media add-ons."}
              </p>
              {addons.map((addon) => (
                <label key={addon.code} className={selected.includes(addon.code) ? "option-row active" : "option-row"}>
                  <input type="checkbox" checked={selected.includes(addon.code)} onChange={() => toggleAddon(addon.code)} />
                  <span>
                    <strong>{addon.name}</strong>
                    <small>{addon.description || addon.kind}</small>
                  </span>
                  <span className="option-price">
                    {formatCurrency(addon.price)}
                    <br />
                    <small>{addon.perPerson ? "per person" : "one-time"}</small>
                  </span>
                </label>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="book-card">
              <h2>Traveller information</h2>
              <p className="book-hint">We only ask for what we need to operate the trip and keep everyone safe.</p>

              {travellers.map((traveller, index) => (
                <div className="traveller-card" key={index}>
                  <p>{traveller.travellerType === "adult" ? `Adult ${index + 1}` : `Child ${index + 1}`}</p>
                  <div className="field-grid">
                    <label className="field">
                      <span>Full name</span>
                      <input value={traveller.name} onChange={(event) => updateTraveller(index, { name: event.target.value })} />
                    </label>
                    <label className="field">
                      <span>Age {traveller.travellerType === "child" ? "(required)" : "(optional)"}</span>
                      <input inputMode="numeric" value={traveller.age} onChange={(event) => updateTraveller(index, { age: event.target.value.replace(/[^0-9]/g, "") })} />
                    </label>
                  </div>
                </div>
              ))}

              <h2 style={{ marginTop: 28 }}>Primary contact</h2>
              <div className="field-grid">
                <label className="field">
                  <span>Name</span>
                  <input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input inputMode="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
                </label>
                <label className="field full">
                  <span>Email</span>
                  <input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
                </label>
              </div>

              <h2 style={{ marginTop: 28 }}>Emergency contact</h2>
              <div className="field-grid">
                <label className="field">
                  <span>Name</span>
                  <input value={emergency.name} onChange={(event) => setEmergency({ ...emergency, name: event.target.value })} />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input inputMode="tel" value={emergency.phone} onChange={(event) => setEmergency({ ...emergency, phone: event.target.value })} />
                </label>
                <label className="field full">
                  <span>Special requirements (optional)</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dietary needs, medical notes, accessibility, anything the crew should know." />
                </label>
              </div>

              <div className="consent-list" style={{ marginTop: 24 }}>
                <label>
                  <input type="checkbox" checked={consent.capture} onChange={(event) => setConsent({ ...consent, capture: event.target.checked })} />
                  <span>I consent to being photographed and filmed during the trip.</span>
                </label>
                <label>
                  <input type="checkbox" checked={consent.marketing} onChange={(event) => setConsent({ ...consent, marketing: event.target.checked })} />
                  <span>I separately consent to RAFTAR using my media for marketing.</span>
                </label>
                <label>
                  <input type="checkbox" checked={consent.terms} onChange={(event) => setConsent({ ...consent, terms: event.target.checked })} />
                  <span>I accept the booking terms, cancellation policy and confirm the traveller details are correct.</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="book-card">
              <h2>Review your booking</h2>
              <p className="book-hint">Check everything below. All amounts are calculated on our server when you pay.</p>
              <div className="summary-row">
                <span>Trip</span>
                <span>{trip.title}</span>
              </div>
              <div className="summary-row">
                <span>Dates</span>
                <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              </div>
              <div className="summary-row">
                <span>Travellers</span>
                <span>
                  {adults} adult(s){children > 0 ? ` · ${children} child(ren)` : ""}
                </span>
              </div>
              <div className="summary-row">
                <span>Base price</span>
                <span>{formatCurrency(amounts.baseAmount)}</span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="summary-row">
                  <span>Add-ons</span>
                  <span>{formatCurrency(amounts.addonAmount)}</span>
                </div>
              )}
              {amounts.discountAmount > 0 && (
                <div className="summary-row">
                  <span>Discounts</span>
                  <span>− {formatCurrency(amounts.discountAmount)}</span>
                </div>
              )}
              {amounts.taxAmount > 0 && (
                <div className="summary-row">
                  <span>Taxes</span>
                  <span>{formatCurrency(amounts.taxAmount)}</span>
                </div>
              )}
              <div className="summary-total">
                <span>Total payable</span>
                <strong>{formatCurrency(amounts.totalAmount)}</strong>
              </div>
              {selectedAddons.length > 0 && (
                <div className="chips" style={{ marginTop: 18 }}>
                  {selectedAddons.map((addon) => (
                    <span className="chip" key={addon.code}>
                      {addon.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="book-card">
              <h2>Payment</h2>
              <p className="book-hint">You&apos;ll be taken to Razorpay&apos;s secure checkout. Your booking is confirmed only after we verify the payment on our server.</p>
              <div className="summary-total">
                <span>Total payable</span>
                <strong>{formatCurrency(amounts.totalAmount)}</strong>
              </div>
              {!razorpayConfigured && (
                <div className="register-config" style={{ marginTop: 18 }}>
                  <Lock />
                  <p>Online payment is not configured yet. Please contact RAFTAR to complete this booking.</p>
                </div>
              )}
              <div className="book-actions" style={{ justifyContent: "flex-start" }}>
                <button className="btn btn-solid" type="button" onClick={startPayment} disabled={status === "loading" || status === "paying" || !availability.bookable || !signedIn}>
                  {status === "loading" || status === "paying" ? (
                    <>
                      <Loader2 className="spin" /> Processing…
                    </>
                  ) : (
                    <>
                      <Lock /> Proceed to payment
                    </>
                  )}
                </button>
              </div>
              <p className="bp-note">Seats are held for a short window while you pay. If the payment fails or is cancelled, no booking is confirmed.</p>
            </div>
          )}

          <div className="book-actions">
            <button className="btn btn-ghost" type="button" onClick={back} disabled={step === 0}>
              <ArrowLeft /> Back
            </button>
            {step < 3 && (
              <button className="btn btn-solid" type="button" onClick={next}>
                Continue <ArrowRight />
              </button>
            )}
            {step === 3 && (
              <button className="btn btn-solid" type="button" onClick={next}>
                Proceed to payment <ArrowRight />
              </button>
            )}
          </div>
        </div>

        <aside>
          <div className="booking-panel">
            <p className="eyebrow">{trip.destination}</p>
            <h3 style={{ margin: "0 0 8px", fontSize: 22 }}>{trip.title}</h3>
            <div className="bp-meta">
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              <span>{seats} seat(s) selected</span>
            </div>
            <div className="bp-row">
              <span>Base ({adults}A{children > 0 ? ` · ${children}C` : ""})</span>
              <span>{formatCurrency(amounts.baseAmount)}</span>
            </div>
            {selectedAddons.length > 0 && (
              <div className="bp-row">
                <span>Add-ons</span>
                <span>{formatCurrency(amounts.addonAmount)}</span>
              </div>
            )}
            <div className="bp-total">
              <span>Estimated total</span>
              <strong>{formatCurrency(amounts.totalAmount)}</strong>
            </div>
            <p className="bp-note">Order {orderId ? orderId.slice(-8) : "—"} · Final amount is recalculated and confirmed on the server.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function loadRazorpay(): Promise<new (options: RazorpayOptions) => { open: () => void }> {
  return new Promise((resolve, reject) => {
    const existing = (window as unknown as { Razorpay?: new (options: RazorpayOptions) => { open: () => void } }).Razorpay;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { Razorpay?: new (options: RazorpayOptions) => { open: () => void } }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error("Razorpay failed to initialise"));
    };
    script.onerror = () => reject(new Error("Razorpay script failed to load"));
    document.body.appendChild(script);
  });
}
