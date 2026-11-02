"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Addon = { code: string; name: string; kind: string; description: string; price: number; perPerson: boolean };

type TripForBooking = {
  slug: string;
  title: string;
  destination: string;
  pricePerPerson: number;
  childPricing: { enabled: boolean; price: number; maxAge: number };
  photographyOptions: Addon[];
  filmmakingOptions: Addon[];
  availableSeats: number;
  totalSeats: number;
  seatsBooked: number;
  registrationOpen: boolean;
  registrationMessage: string;
};

type Traveller = { name: string; age: string; gender: string; phone: string; idProof: string; travellerType: "adult" | "child" };

type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = Record<string, unknown> & { handler: (response: RazorpayResult) => void };

const emptyTraveller = (type: "adult" | "child"): Traveller => ({ name: "", age: "", gender: "", phone: "", idProof: "", travellerType: type });

export default function RegisterPanel({ trip, razorpayConfigured }: { trip: TripForBooking; razorpayConfigured: boolean }) {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [travellers, setTravellers] = useState<Traveller[]>([emptyTraveller("adult")]);
  const [selected, setSelected] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [captureConsent, setCaptureConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "paying" | "confirmed" | "error">("idle");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const allAddons = useMemo(() => [...trip.photographyOptions, ...trip.filmmakingOptions], [trip.photographyOptions, trip.filmmakingOptions]);

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

  const estimatedTotal = useMemo(() => {
    const childUnit = trip.childPricing.enabled ? trip.childPricing.price : 0;
    const base = adults * trip.pricePerPerson + children * childUnit;
    const addonTotal = allAddons
      .filter((addon) => selected.includes(addon.code))
      .reduce((sum, addon) => sum + addon.price * (addon.perPerson ? adults + children : 1), 0);
    return base + addonTotal;
  }, [adults, children, selected, allAddons, trip.childPricing, trip.pricePerPerson]);

  const seatsRequested = adults + children;
  const seatsAvailable = seatsRequested <= trip.availableSeats;

  function updateTraveller(index: number, patch: Partial<Traveller>) {
    setTravellers((current) => current.map((traveller, i) => (i === index ? { ...traveller, ...patch } : traveller)));
  }

  function toggleAddon(code: string) {
    setSelected((current) => (current.includes(code) ? current.filter((value) => value !== code) : [...current, code]));
  }

  async function startPayment() {
    setError("");
    if (travellers.some((traveller) => traveller.name.trim().length < 2)) {
      setError("Please enter a name for each traveller.");
      return;
    }
    if (!contact.name || !contact.email || !contact.phone) {
      setError("Please add contact details for this booking.");
      return;
    }
    if (!terms) {
      setError("Please accept the booking terms to continue.");
      return;
    }
    if (!seatsAvailable) {
      setError("Only the available number of seats can be booked.");
      return;
    }

    setStatus("loading");
    const response = await fetch(`/api/trips/${trip.slug}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numberOfAdults: adults,
        numberOfChildren: children,
        travellers: travellers.map((traveller) => ({
          name: traveller.name.trim(),
          age: traveller.age ? Number(traveller.age) : undefined,
          gender: traveller.gender || undefined,
          phone: traveller.phone || undefined,
          idProof: traveller.idProof || undefined,
          travellerType: traveller.travellerType,
        })),
        addonCodes: selected,
        contactName: contact.name,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        captureConsent,
        marketingConsent,
        notes: notes || undefined,
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
      handler: async (response: RazorpayResult) => {
        await verifyPayment(response);
      },
      modal: {
        ondismiss: () => {
          setStatus("idle");
          setError("Payment was not completed. Your seats are held for a short time — you can try again.");
        },
      },
    });
    checkout.open();
  }

  async function verifyPayment(response: RazorpayResult) {
    setStatus("loading");
    const verify = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
    });
    const payload = await verify.json();
    if (!verify.ok) {
      setStatus("error");
      setError(payload.error?.message ?? "We could not verify the payment. If money was deducted it will be confirmed automatically.");
      return;
    }
    setStatus("confirmed");
  }

  if (status === "confirmed") {
    return (
      <div className="register-panel" id="register">
        <div className="register-success">
          <ShieldCheck />
          <h3>Booking confirmed</h3>
          <p>
            Your booking <strong>{reference}</strong> is confirmed. A confirmation is now in your dashboard, along with the trip details and any media you selected.
          </p>
          <Link className="button button-forest" href="/dashboard">
            Go to my dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="register-panel" id="register">
      <div className="register-head">
        <p className="eyebrow">Register</p>
        <h3>Join this trip</h3>
        <p className="register-price">
          {formatCurrency(trip.pricePerPerson)} <span>/ person</span>
        </p>
        <p className="register-seats">
          {trip.availableSeats} of {trip.totalSeats} seats available
        </p>
      </div>

      {!trip.registrationOpen ? (
        <div className="register-closed">
          <AlertTriangle />
          <p>{trip.registrationMessage || "Registration is not open for this trip."}</p>
        </div>
      ) : (
        <>
          {!razorpayConfigured && (
            <div className="register-config">
              <Lock />
              <p>Online payment is not configured yet. Please contact RAFTAR to complete this booking.</p>
            </div>
          )}

          {error && <div className="register-error">{error}</div>}

          <div className="register-group">
            <label>
              <span>Adults</span>
              <input
                type="number"
                min={1}
                max={trip.availableSeats || 1}
                value={adults}
                onChange={(event) => {
                  const value = Math.max(1, Number(event.target.value));
                  setAdults(value);
                  syncTravellers(value, children);
                }}
              />
            </label>
            <label>
              <span>Children {trip.childPricing.enabled ? `(₹${trip.childPricing.price})` : "(free)"}</span>
              <input
                type="number"
                min={0}
                value={children}
                onChange={(event) => {
                  const value = Math.max(0, Number(event.target.value));
                  setChildren(value);
                  syncTravellers(adults, value);
                }}
              />
            </label>
          </div>

          {allAddons.length > 0 && (
            <div className="register-block">
              <p className="register-label">Photography & filmmaking add-ons</p>
              <div className="register-addons">
                {allAddons.map((addon) => (
                  <label key={addon.code} className={selected.includes(addon.code) ? "addon active" : "addon"}>
                    <input type="checkbox" checked={selected.includes(addon.code)} onChange={() => toggleAddon(addon.code)} />
                    <span>
                      <strong>{addon.name}</strong>
                      <small>
                        {formatCurrency(addon.price)} {addon.perPerson ? "per person" : "one-time"} · {addon.kind}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="register-block">
            <p className="register-label">Traveller details</p>
            {travellers.map((traveller, index) => (
              <div className="traveller-row" key={index}>
                <span className="traveller-tag">{traveller.travellerType === "adult" ? `Adult ${index + 1}` : `Child ${index + 1}`}</span>
                <input placeholder="Full name" value={traveller.name} onChange={(event) => updateTraveller(index, { name: event.target.value })} />
                <input placeholder="Age" value={traveller.age} onChange={(event) => updateTraveller(index, { age: event.target.value })} />
                <input placeholder="ID / passport (optional)" value={traveller.idProof} onChange={(event) => updateTraveller(index, { idProof: event.target.value })} />
              </div>
            ))}
          </div>

          <div className="register-block">
            <p className="register-label">Contact for this booking</p>
            <div className="register-group">
              <label>
                <span>Name</span>
                <input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} />
              </label>
              <label>
                <span>Phone</span>
                <input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
              </label>
            </div>
            <label className="register-full">
              <span>Email</span>
              <input value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
            </label>
            <label className="register-full">
              <span>Notes for the crew (optional)</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </div>

          <div className="register-consent">
            <label>
              <input type="checkbox" checked={captureConsent} onChange={(event) => setCaptureConsent(event.target.checked)} />
              <span>I consent to being photographed and filmed during the trip.</span>
            </label>
            <label>
              <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} />
              <span>I separately consent to RAFTAR using my media for marketing.</span>
            </label>
            <label>
              <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
              <span>I accept the booking terms and cancellation policy.</span>
            </label>
          </div>

          <div className="register-total">
            <span>Estimated total</span>
            <strong>{formatCurrency(estimatedTotal)}</strong>
          </div>

          <button className="button button-forest register-submit" type="button" onClick={startPayment} disabled={status === "loading" || status === "paying"}>
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
          <p className="register-note">Seats are held for a short window while you pay. Your booking is confirmed only after the payment is verified.</p>
        </>
      )}
    </div>
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
