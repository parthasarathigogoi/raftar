"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { formatCurrency, formatDate, humanise } from "@/lib/format";

type BookingRow = {
  id: string;
  reference: string;
  tripEvent: { title: string; slug: string } | null;
  contact: { name: string; email: string; phone: string };
  numberOfAdults: number;
  numberOfChildren: number;
  amounts: { totalAmount: number; amountPaid: number; amountRefunded: number };
  paymentStatus: string;
  bookingStatus: string;
  bookingDate: string;
  source: string;
};

const paymentTone: Record<string, string> = { paid: "green", partially_paid: "amber", pending: "amber", failed: "red", refunded: "grey" };
const bookingTone: Record<string, string> = { confirmed: "green", pending_payment: "amber", cancelled: "red", refunded: "grey", completed: "blue" };

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (bookingStatus) params.set("bookingStatus", bookingStatus);
    if (query) params.set("q", query);
    const response = await fetch(`/api/admin/bookings?${params.toString()}`);
    const payload = await response.json();
    if (response.ok) setBookings(payload.data.bookings);
    setLoading(false);
  }, [paymentStatus, bookingStatus, query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Bookings</p>
          <h2>The full booking ledger.</h2>
        </div>
        <a className="admin-btn" href="/api/admin/bookings/export">
          <Download /> Export all
        </a>
      </div>

      <div className="admin-toolbar">
        <select className="admin-select" style={{ maxWidth: 190 }} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
          <option value="">All payment statuses</option>
          {["pending", "paid", "partially_paid", "failed", "refunded"].map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
        <select className="admin-select" style={{ maxWidth: 190 }} value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}>
          <option value="">All booking statuses</option>
          {["pending_payment", "confirmed", "cancelled", "refunded", "completed"].map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
        <form onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <input className="admin-input" style={{ maxWidth: 240 }} placeholder="Search reference, name, email" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="admin-btn" type="submit">
            <Search /> Search
          </button>
        </form>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="admin-empty">No bookings match these filters.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Trip</th>
                <th>Customer</th>
                <th>Travellers</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Booked</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <Link href={`/admin/registrations`}>{booking.reference}</Link>
                    <div className="muted">{humanise(booking.source)}</div>
                  </td>
                  <td>{booking.tripEvent?.title ?? "—"}</td>
                  <td>
                    {booking.contact.name}
                    <div className="muted">{booking.contact.email}</div>
                  </td>
                  <td>
                    {booking.numberOfAdults}A{booking.numberOfChildren ? ` · ${booking.numberOfChildren}C` : ""}
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
                  <td>{formatDate(booking.bookingDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
