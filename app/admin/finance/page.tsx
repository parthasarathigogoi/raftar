"use client";

import { useEffect, useState } from "react";
import { humanise } from "@/lib/format";
import { formatCurrency } from "@/lib/format";

type FinanceTrip = { tripEventId: string; title: string; status: string; collected: number; expenses: number; profit: number };
type Finance = { revenue: number; expenses: number; profit: number; unallocatedExpenses: number; perTrip: FinanceTrip[] };
type ReportRow = { tripEventId: string; title: string; participants: number; confirmedBookings: number; totalSeats: number; seatsBooked: number; collected: number };

export default function AdminFinancePage() {
  const [finance, setFinance] = useState<Finance | null>(null);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/admin/finance");
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Could not load finance data.");
        return;
      }
      setFinance(payload.data.finance);
      setReport(payload.data.report);
    })();
  }, []);

  const cards = finance
    ? [
        { label: "Collected revenue", value: formatCurrency(finance.revenue) },
        { label: "Recorded expenses", value: formatCurrency(finance.expenses) },
        { label: "Estimated profit", value: formatCurrency(finance.profit) },
        { label: "Unallocated expenses", value: formatCurrency(finance.unallocatedExpenses) },
      ]
    : [];

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Finance</p>
          <h2>Collections, costs and profit.</h2>
        </div>
        <span>Revenue is net of refunds. No figures are estimated.</span>
      </div>

      {error && <div className="admin-note error">{error}</div>}

      <div className="stat-grid">
        {cards.map((card) => (
          <article key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span>Live totals</span>
          </article>
        ))}
      </div>

      <div className="admin-intro" style={{ marginTop: 40 }}>
        <div>
          <p className="eyebrow">Trip-wise financials</p>
          <h2 style={{ fontSize: 26 }}>Per-departure results.</h2>
        </div>
      </div>

      <div className="admin-table-wrap">
        {!finance ? (
          <div className="admin-empty">Loading finance data…</div>
        ) : finance.perTrip.length === 0 ? (
          <div className="admin-empty">No trip events to report on yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Status</th>
                <th>Participants</th>
                <th>Bookings</th>
                <th>Seats</th>
                <th>Collected</th>
                <th>Expenses</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {finance.perTrip.map((trip) => {
                const reportRow = report.find((row) => row.tripEventId === trip.tripEventId);
                return (
                  <tr key={trip.tripEventId}>
                    <td>{trip.title}</td>
                    <td>{humanise(trip.status)}</td>
                    <td>{reportRow?.participants ?? 0}</td>
                    <td>{reportRow?.confirmedBookings ?? 0}</td>
                    <td>
                      {reportRow?.seatsBooked ?? 0}/{reportRow?.totalSeats ?? 0}
                    </td>
                    <td>{formatCurrency(trip.collected)}</td>
                    <td>{formatCurrency(trip.expenses)}</td>
                    <td>
                      <strong>{formatCurrency(trip.profit)}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
