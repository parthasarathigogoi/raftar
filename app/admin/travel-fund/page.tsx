"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency, formatDate, humanise } from "@/lib/format";

type EntryType = "allocation" | "withdrawal";
type FundRow = {
  id: string;
  type: EntryType;
  amount: number;
  category: string;
  description: string;
  reference: string | null;
  occurredAt: string;
  tripEventId: string | null;
  tripTitle: string | null;
};
type TripOption = { id: string; title: string };

const CATEGORIES = ["surplus_allocation", "exploration_trip", "photography", "filmmaking", "equipment", "other"];

const emptyForm = () => ({
  type: "allocation" as EntryType,
  amount: 0,
  category: "other",
  tripEventId: "",
  reference: "",
  description: "",
  occurredAt: new Date().toISOString().slice(0, 10),
});

export default function AdminTravelFundPage() {
  const [transactions, setTransactions] = useState<FundRow[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [balance, setBalance] = useState(0);
  const [allocated, setAllocated] = useState(0);
  const [withdrawn, setWithdrawn] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    const [fundResponse, tripResponse] = await Promise.all([fetch("/api/admin/travel-fund"), fetch("/api/admin/trips")]);
    const fundPayload = await fundResponse.json();
    const tripPayload = await tripResponse.json();
    if (tripResponse.ok) setTrips(tripPayload.data.trips);
    if (fundResponse.ok) {
      setTransactions(fundPayload.data.transactions);
      setAllocated(fundPayload.data.allocated);
      setWithdrawn(fundPayload.data.withdrawn);
      setBalance(fundPayload.data.balance);
      return fundPayload.data.balance as number;
    }
    setError(fundPayload.error?.message ?? "Could not load the travel fund.");
    return null;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function record() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/travel-fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        amount: Number(form.amount),
        category: form.category,
        description: form.description,
        reference: form.reference,
        tripEventId: form.tripEventId,
        occurredAt: form.occurredAt || undefined,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not record the fund entry.");
      return;
    }
    setForm(emptyForm());
    const refreshed = await load();
    setMessage(`Entry recorded. Current balance: ${formatCurrency(refreshed ?? 0)}.`);
  }

  const cards = [
    { label: "Current balance", value: formatCurrency(balance), note: "Available surplus", icon: Wallet },
    { label: "Total allocated", value: formatCurrency(allocated), note: "Transferred in", icon: TrendingUp },
    { label: "Total withdrawn", value: formatCurrency(withdrawn), note: "Spent from fund", icon: TrendingDown },
  ];

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Travel Fund</p>
          <h2>RAFTAR Travel Fund</h2>
        </div>
        <span>Internal ledger · append-only</span>
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="stat-grid">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <article key={label}>
            <Icon />
            <p>{label}</p>
            <strong>{value}</strong>
            <span>{note}</span>
          </article>
        ))}
      </div>

      <div className="admin-note" style={{ marginTop: 24 }}>
        This fund may only hold genuinely available business surplus that has been explicitly allocated here. Customer advances, refund liabilities, unpaid
        partner amounts and operational float must never be transferred into this fund.
      </div>

      <div className="admin-card">
        <h3>Record a fund entry</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Type</span>
            <select className="admin-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as EntryType })}>
              <option value="allocation">Allocation</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Amount (₹)</span>
            <input className="admin-input" type="number" min={1} value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} />
          </label>
          <label className="admin-field">
            <span>Category</span>
            <select className="admin-select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {humanise(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Linked trip (optional)</span>
            <select className="admin-select" value={form.tripEventId} onChange={(event) => setForm({ ...form, tripEventId: event.target.value })}>
              <option value="">Unlinked</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Reference (optional)</span>
            <input className="admin-input" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Date</span>
            <input className="admin-input" type="date" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} />
          </label>
          <label className="admin-field full">
            <span>Description</span>
            <textarea className="admin-textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
        </div>
        <button className="admin-btn primary" style={{ marginTop: 16 }} type="button" onClick={record} disabled={saving || !form.description || Number(form.amount) < 1}>
          <Plus /> {saving ? "Saving…" : "Record entry"}
        </button>
      </div>

      <div className="admin-table-wrap">
        {transactions.length === 0 ? (
          <div className="admin-empty">No fund entries recorded yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Linked trip</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.occurredAt)}</td>
                  <td>
                    <span className={transaction.type === "allocation" ? "badge green" : "badge amber"}>
                      {transaction.type === "allocation" ? "Allocation" : "Withdrawal"}
                    </span>
                  </td>
                  <td>{humanise(transaction.category)}</td>
                  <td>
                    {transaction.description}
                    {transaction.reference && <div className="muted">{transaction.reference}</div>}
                  </td>
                  <td>{transaction.tripTitle ?? "Unlinked"}</td>
                  <td style={{ color: transaction.type === "allocation" ? "#1c5a3f" : "#a83e2d", fontWeight: 600 }}>{formatCurrency(transaction.amount)}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
