"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, formatDateTime, humanise } from "@/lib/format";

type PaymentRow = {
  id: string;
  provider: string;
  orderId: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  receiptNumber: string | null;
  refunds: Array<{ refundId: string; amount: number }>;
  bookingReference: string | null;
  contactName: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

const tone: Record<string, string> = { paid: "green", created: "amber", partially_refunded: "amber", refunded: "grey", failed: "red" };

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    const response = await fetch(`/api/admin/payments?${params.toString()}`);
    const payload = await response.json();
    if (response.ok) setPayments(payload.data.payments);
    setLoading(false);
  }, [status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Payments</p>
          <h2>Every transaction and refund.</h2>
        </div>
        <span>Razorpay and recorded offline payments.</span>
      </div>

      <div className="admin-toolbar">
        <select className="admin-select" style={{ maxWidth: 190 }} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {["created", "paid", "failed", "refunded", "partially_refunded"].map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
        <form onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <input className="admin-input" style={{ maxWidth: 250 }} placeholder="Search order, payment or receipt" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="admin-btn" type="submit">
            <Search /> Search
          </button>
        </form>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading payments…</div>
        ) : payments.length === 0 ? (
          <div className="admin-empty">No payments recorded yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Booking</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.receiptNumber ?? payment.orderId}
                    <div className="muted">{payment.paymentId ?? "—"}</div>
                  </td>
                  <td>
                    {payment.bookingReference ?? "—"}
                    <div className="muted">{payment.contactName ?? ""}</div>
                  </td>
                  <td>{humanise(payment.provider)}</td>
                  <td>
                    {formatCurrency(payment.amount)}
                    {payment.refunds.length > 0 && <div className="muted">Refunded {formatCurrency(payment.refunds.reduce((sum, refund) => sum + refund.amount, 0))}</div>}
                  </td>
                  <td>
                    <span className={`badge ${tone[payment.status] ?? "grey"}`}>{humanise(payment.status)}</span>
                  </td>
                  <td>{payment.method ? humanise(payment.method) : "—"}</td>
                  <td>{formatDateTime(payment.verifiedAt ?? payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
