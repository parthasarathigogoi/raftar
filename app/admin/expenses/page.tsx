"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, humanise } from "@/lib/format";

type ExpenseRow = { id: string; title: string; category: string; amount: number; incurredAt: string; notes: string | null; tripEventId: string | null; tripTitle: string | null };
type TripOption = { id: string; title: string };

const CATEGORIES = ["transport", "stay", "food", "permits", "crew", "equipment", "marketing", "misc"];

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", category: "misc", amount: 0, tripEventId: "", notes: "" });

  const load = useCallback(async () => {
    const [expenseResponse, tripResponse] = await Promise.all([fetch("/api/admin/expenses"), fetch("/api/admin/trips")]);
    const expensePayload = await expenseResponse.json();
    const tripPayload = await tripResponse.json();
    if (expenseResponse.ok) setExpenses(expensePayload.data.expenses);
    if (tripResponse.ok) setTrips(tripPayload.data.trips);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not record the expense.");
      return;
    }
    setForm({ title: "", category: "misc", amount: 0, tripEventId: "", notes: "" });
    setMessage("Expense recorded.");
    await load();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("Expense removed.");
      await load();
    } else {
      const payload = await response.json();
      setError(payload.error?.message ?? "Could not remove the expense.");
    }
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Expenses</p>
          <h2>Trip costs, logged honestly.</h2>
        </div>
        <span>Total recorded: {formatCurrency(total)}</span>
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-card">
        <h3>Record an expense</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Title</span>
            <input className="admin-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
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
            <span>Amount (₹)</span>
            <input className="admin-input" type="number" min={0} value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} />
          </label>
          <label className="admin-field">
            <span>Trip (optional)</span>
            <select className="admin-select" value={form.tripEventId} onChange={(event) => setForm({ ...form, tripEventId: event.target.value })}>
              <option value="">Unallocated</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field full">
            <span>Notes</span>
            <input className="admin-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <button className="admin-btn primary" style={{ marginTop: 16 }} type="button" onClick={create} disabled={saving || !form.title}>
          <Plus /> {saving ? "Saving…" : "Record expense"}
        </button>
      </div>

      <div className="admin-table-wrap">
        {expenses.length === 0 ? (
          <div className="admin-empty">No expenses recorded yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Category</th>
                <th>Trip</th>
                <th>Amount</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    {expense.title}
                    {expense.notes && <div className="muted">{expense.notes}</div>}
                  </td>
                  <td>{humanise(expense.category)}</td>
                  <td>{expense.tripTitle ?? "Unallocated"}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>{formatDate(expense.incurredAt)}</td>
                  <td>
                    <button className="admin-btn danger small" type="button" onClick={() => remove(expense.id)}>
                      <Trash2 /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
