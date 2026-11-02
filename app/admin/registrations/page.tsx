"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Megaphone, Plus, RefreshCw, Search, UserPlus } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, humanise } from "@/lib/format";

type TripOption = { id: string; title: string; status: string; seatsBooked: number; totalSeats: number };
type BookingRow = {
  id: string;
  reference: string;
  contact: { name: string; email: string; phone: string };
  numberOfAdults: number;
  numberOfChildren: number;
  travellers: Array<Record<string, unknown>>;
  addons: Array<{ name: string }>;
  amounts: { totalAmount: number; amountPaid: number; amountRefunded: number };
  paymentStatus: string;
  bookingStatus: string;
  bookingDate: string;
  source: string;
};
type BookingDetail = { booking: BookingRow & { notes?: string; mediaConsent?: Record<string, boolean>; statusHistory?: Array<Record<string, unknown>> }; payments: Array<Record<string, unknown>> };

const paymentTone: Record<string, string> = { paid: "green", partially_paid: "amber", pending: "amber", failed: "red", refunded: "grey" };
const bookingTone: Record<string, string> = { confirmed: "green", pending_payment: "amber", cancelled: "red", refunded: "grey", completed: "blue" };

export default function AdminRegistrationsPage() {
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [tripEventId, setTripEventId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [query, setQuery] = useState("");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [showAnnounce, setShowAnnounce] = useState(false);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/admin/trips");
      const payload = await response.json();
      if (response.ok) {
        setTrips(payload.data.trips);
        if (payload.data.trips[0]) setTripEventId((current) => current || payload.data.trips[0].id);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!tripEventId) return;
    setLoading(true);
    const params = new URLSearchParams({ tripEventId });
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (query) params.set("q", query);
    const response = await fetch(`/api/admin/bookings?${params.toString()}`);
    const payload = await response.json();
    if (response.ok) setBookings(payload.data.bookings);
    else setError(payload.error?.message ?? "Could not load registrations.");
    setLoading(false);
  }, [tripEventId, paymentStatus, query]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  async function openDetail(id: string) {
    const response = await fetch(`/api/admin/bookings/${id}`);
    const payload = await response.json();
    if (response.ok) setDetail(payload.data);
  }

  async function runAction(id: string, action: string, extra: Record<string, unknown> = {}) {
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/bookings/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Action failed.");
      return;
    }
    setMessage(`Registration ${action.replace(/_/g, " ")}.`);
    setDetail(null);
    await load();
  }

  const selectedTrip = trips.find((trip) => trip.id === tripEventId);

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Registrations</p>
          <h2>Who's travelling, and what they've paid.</h2>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="admin-btn" onClick={() => setShowManual((value) => !value)} type="button">
            <UserPlus /> Manual registration
          </button>
          <button className="admin-btn" onClick={() => setShowAnnounce((value) => !value)} type="button" disabled={!tripEventId}>
            <Megaphone /> Announcement
          </button>
          {tripEventId && (
            <a className="admin-btn primary" href={`/api/admin/bookings/export?tripEventId=${tripEventId}`}>
              <Download /> Export CSV
            </a>
          )}
        </div>
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-toolbar">
        <select className="admin-select" style={{ maxWidth: 320 }} value={tripEventId} onChange={(event) => setTripEventId(event.target.value)}>
          <option value="">Select a trip event</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title} ({trip.seatsBooked}/{trip.totalSeats})
            </option>
          ))}
        </select>
        <select className="admin-select" style={{ maxWidth: 190 }} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
          <option value="">All payment statuses</option>
          {["pending", "paid", "partially_paid", "failed", "refunded"].map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
        <form onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <input className="admin-input" style={{ maxWidth: 220 }} placeholder="Search name, email, reference" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="admin-btn" type="submit">
            <Search /> Search
          </button>
        </form>
        <button className="admin-btn ghost spacer" onClick={load} type="button">
          <RefreshCw /> Refresh
        </button>
      </div>

      {selectedTrip && (
        <p className="fade" style={{ marginBottom: 14 }}>
          {selectedTrip.title} · {selectedTrip.seatsBooked}/{selectedTrip.totalSeats} seats booked
        </p>
      )}

      {showManual && <ManualRegistration tripEventId={tripEventId} onDone={() => { setShowManual(false); void load(); }} trips={trips} />}
      {showAnnounce && tripEventId && <Announcement tripEventId={tripEventId} onDone={() => { setShowAnnounce(false); setMessage("Announcement sent."); }} />}

      <div className="admin-split">
        <div className="admin-table-wrap">
          {!tripEventId ? (
            <div className="admin-empty">Select a trip event to view its registrations.</div>
          ) : loading ? (
            <div className="admin-empty">Loading registrations…</div>
          ) : bookings.length === 0 ? (
            <div className="admin-empty">No registrations match these filters.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Travellers</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      {booking.contact.name}
                      <div className="muted">{booking.reference}</div>
                    </td>
                    <td>
                      {booking.numberOfAdults}A {booking.numberOfChildren ? `· ${booking.numberOfChildren}C` : ""}
                      <div className="muted">{booking.addons.length ? booking.addons.map((a) => a.name).join(", ") : "No add-ons"}</div>
                    </td>
                    <td>
                      {formatCurrency(booking.amounts.totalAmount)}
                      <div className="muted">Paid {formatCurrency(booking.amounts.amountPaid)}</div>
                    </td>
                    <td>
                      <span className={`badge ${paymentTone[booking.paymentStatus] ?? "grey"}`}>{humanise(booking.paymentStatus)}</span>
                    </td>
                    <td>
                      <span className={`badge ${bookingTone[booking.bookingStatus] ?? "grey"}`}>{humanise(booking.bookingStatus)}</span>
                    </td>
                    <td>
                      <button className="admin-btn small" onClick={() => openDetail(booking.id)} type="button">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          {detail ? (
            <BookingDetailPanel detail={detail} onAction={runAction} />
          ) : (
            <div className="admin-empty">Select a registration to view traveller and payment details.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function BookingDetailPanel({ detail, onAction }: { detail: BookingDetail; onAction: (id: string, action: string, extra?: Record<string, unknown>) => void }) {
  const { booking, payments } = detail;
  const [refundAmount, setRefundAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  return (
    <div className="admin-card">
      <h3>{booking.contact.name}</h3>
      <p className="hint">
        {booking.reference} · {humanise(booking.bookingStatus)} · {humanise(booking.paymentStatus)}
      </p>

      <dl className="kv" style={{ marginBottom: 18 }}>
        <dt>Email</dt>
        <dd>{booking.contact.email || "—"}</dd>
        <dt>Phone</dt>
        <dd>{booking.contact.phone || "—"}</dd>
        <dt>Booked</dt>
        <dd>{formatDateTime(booking.bookingDate)}</dd>
        <dt>Source</dt>
        <dd>{humanise(booking.source)}</dd>
        <dt>Adults</dt>
        <dd>{booking.numberOfAdults}</dd>
        <dt>Children</dt>
        <dd>{booking.numberOfChildren}</dd>
        <dt>Total</dt>
        <dd>{formatCurrency(booking.amounts.totalAmount)}</dd>
        <dt>Paid</dt>
        <dd>{formatCurrency(booking.amounts.amountPaid)}</dd>
        <dt>Refunded</dt>
        <dd>{formatCurrency(booking.amounts.amountRefunded)}</dd>
      </dl>

      <p className="eyebrow">Travellers</p>
      <div className="chips" style={{ marginBottom: 18 }}>
        {booking.travellers.map((traveller, index) => (
          <span className="chip" key={index}>
            {String(traveller.name ?? "Traveller")} · {String(traveller.travellerType ?? "adult")}
          </span>
        ))}
      </div>

      {booking.addons.length > 0 && (
        <>
          <p className="eyebrow">Add-ons</p>
          <div className="chips" style={{ marginBottom: 18 }}>
            {booking.addons.map((addon, index) => (
              <span className="chip" key={index}>
                {addon.name}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="eyebrow">Payment history</p>
      <div style={{ marginBottom: 18 }}>
        {payments.length === 0 ? (
          <p className="fade">No payments recorded.</p>
        ) : (
          payments.map((payment, index) => (
            <div key={index} className="fade" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef0ec" }}>
              <span>
                {humanise(String(payment.provider))} · {String(payment.paymentId ?? payment.orderId)}
              </span>
              <span>
                {formatCurrency(Number(payment.amount))} · {humanise(String(payment.status))}
              </span>
            </div>
          ))
        )}
      </div>

      {booking.statusHistory && booking.statusHistory.length > 0 && (
        <>
          <p className="eyebrow">History</p>
          <div style={{ marginBottom: 18 }}>
            {booking.statusHistory.map((entry, index) => (
              <div key={index} className="fade">
                {humanise(String(entry.status))} — {String(entry.note ?? "")} ({formatDate(String(entry.at ?? ""))})
              </div>
            ))}
          </div>
        </>
      )}

      <div className="admin-toolbar" style={{ marginTop: 20 }}>
        <span className="eyebrow">Record offline payment</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="admin-input" type="number" min={0} placeholder="Amount ₹" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} />
        <select className="admin-select" style={{ maxWidth: 130 }} value={payMethod} onChange={(event) => setPayMethod(event.target.value)}>
          {["cash", "upi", "bank_transfer", "cheque"].map((method) => (
            <option key={method} value={method}>
              {humanise(method)}
            </option>
          ))}
        </select>
        <button className="admin-btn" type="button" onClick={() => onAction(booking.id, "record_payment", { amount: Number(payAmount), method: payMethod })} disabled={!payAmount}>
          Record
        </button>
      </div>

      <div className="admin-toolbar" style={{ marginTop: 10 }}>
        <span className="eyebrow">Refund</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="admin-input" type="number" min={0} placeholder="Refund ₹" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} />
        <button className="admin-btn danger" type="button" onClick={() => onAction(booking.id, "refund", { amount: refundAmount ? Number(refundAmount) : undefined, reason: "Admin refund" })}>
          Process refund
        </button>
      </div>

      <div className="chips">
        <button className="admin-btn danger small" type="button" onClick={() => onAction(booking.id, "cancel", { reason: "Cancelled by admin" })}>
          Cancel registration
        </button>
        <button className="admin-btn small" type="button" onClick={() => onAction(booking.id, "complete")}>
          Mark complete
        </button>
      </div>
    </div>
  );
}

function ManualRegistration({ tripEventId, trips, onDone }: { tripEventId: string; trips: TripOption[]; onDone: () => void }) {
  const [trip, setTrip] = useState(tripEventId);
  const [form, setForm] = useState({ contactName: "", contactEmail: "", contactPhone: "", numberOfAdults: 1, numberOfChildren: 0, discountAmount: 0, notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError("");
    const travellers = Array.from({ length: Number(form.numberOfAdults) + Number(form.numberOfChildren) }, (_, index) => ({
      name: index === 0 ? form.contactName || `Guest ${index + 1}` : `Guest ${index + 1}`,
      travellerType: index < Number(form.numberOfAdults) ? "adult" : "child",
    }));
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripEventId: trip,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        numberOfAdults: Number(form.numberOfAdults),
        numberOfChildren: Number(form.numberOfChildren),
        travellers,
        discountAmount: Number(form.discountAmount),
        confirmImmediately: true,
        captureConsent: false,
        marketingConsent: false,
        notes: form.notes,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not create the registration.");
      return;
    }
    onDone();
  }

  return (
    <div className="admin-card">
      <h3>Manual registration</h3>
      <p className="hint">Admin-added participants are recorded with an audit entry and confirmed immediately.</p>
      {error && <div className="admin-note error">{error}</div>}
      <div className="admin-form-grid">
        <label className="admin-field full">
          <span>Trip event</span>
          <select className="admin-select" value={trip} onChange={(event) => setTrip(event.target.value)}>
            {trips.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Contact name</span>
          <input className="admin-input" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
        </label>
        <label className="admin-field">
          <span>Contact email</span>
          <input className="admin-input" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
        </label>
        <label className="admin-field">
          <span>Contact phone</span>
          <input className="admin-input" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
        </label>
        <label className="admin-field">
          <span>Discount (₹)</span>
          <input className="admin-input" type="number" min={0} value={form.discountAmount} onChange={(event) => setForm({ ...form, discountAmount: Number(event.target.value) })} />
        </label>
        <label className="admin-field">
          <span>Adults</span>
          <input className="admin-input" type="number" min={1} value={form.numberOfAdults} onChange={(event) => setForm({ ...form, numberOfAdults: Number(event.target.value) })} />
        </label>
        <label className="admin-field">
          <span>Children</span>
          <input className="admin-input" type="number" min={0} value={form.numberOfChildren} onChange={(event) => setForm({ ...form, numberOfChildren: Number(event.target.value) })} />
        </label>
        <label className="admin-field full">
          <span>Notes</span>
          <input className="admin-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
      </div>
      <button className="admin-btn primary" style={{ marginTop: 16 }} type="button" onClick={submit} disabled={saving}>
        <Plus /> {saving ? "Saving…" : "Create registration"}
      </button>
    </div>
  );
}

function Announcement({ tripEventId, onDone }: { tripEventId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setError("");
    const response = await fetch(`/api/admin/trips/${tripEventId}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message: body }),
    });
    const payload = await response.json();
    setSending(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not send the announcement.");
      return;
    }
    onDone();
  }

  return (
    <div className="admin-card">
      <h3>Send trip announcement</h3>
      <p className="hint">Delivered to every confirmed traveller on this trip.</p>
      {error && <div className="admin-note error">{error}</div>}
      <div className="admin-form-grid">
        <label className="admin-field full">
          <span>Title</span>
          <input className="admin-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="admin-field full">
          <span>Message</span>
          <textarea className="admin-textarea" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
      </div>
      <button className="admin-btn primary" style={{ marginTop: 16 }} type="button" onClick={send} disabled={sending || !title || !body}>
        <Megaphone /> {sending ? "Sending…" : "Send announcement"}
      </button>
      <p className="fade" style={{ marginTop: 12 }}>
        Export includes every registration for the selected trip.
      </p>
    </div>
  );
}
