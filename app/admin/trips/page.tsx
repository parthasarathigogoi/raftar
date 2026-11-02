"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Search } from "lucide-react";
import { formatDateRange, humanise } from "@/lib/format";

type TripRow = {
  id: string;
  title: string;
  slug: string;
  destination: string;
  status: string;
  featured: boolean;
  startDate: string;
  endDate: string;
  totalSeats: number;
  seatsBooked: number;
  seatsReserved: number;
  availableSeats: number;
  pricePerPerson: number;
};

const statusTone: Record<string, string> = {
  draft: "grey",
  published: "blue",
  registration_open: "green",
  full: "amber",
  completed: "grey",
  cancelled: "red",
};

const ACTIONS: Record<string, { label: string; action: string }[]> = {
  draft: [{ label: "Publish", action: "publish" }],
  published: [
    { label: "Open registration", action: "open_registration" },
    { label: "Unpublish", action: "unpublish" },
    { label: "Cancel", action: "cancel" },
  ],
  registration_open: [
    { label: "Close registration", action: "close_registration" },
    { label: "Cancel", action: "cancel" },
  ],
  full: [{ label: "Complete", action: "complete" }, { label: "Cancel", action: "cancel" }],
  completed: [],
  cancelled: [],
};

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    const response = await fetch(`/api/admin/trips?${params.toString()}`);
    const payload = await response.json();
    if (response.ok) setTrips(payload.data.trips);
    else setError(payload.error?.message ?? "Could not load trips.");
    setLoading(false);
  }, [status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(id: string, action: string) {
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/trips/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Action failed.");
      return;
    }
    setMessage(`Trip ${action.replace(/_/g, " ")}.`);
    await load();
  }

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Trip Events</p>
          <h2>Departures you can publish and sell.</h2>
        </div>
        <Link className="admin-btn primary" href="/admin/trips/new">
          <Plus /> New trip event
        </Link>
      </div>

      <div className="admin-toolbar">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <input className="admin-input" style={{ maxWidth: 260 }} placeholder="Search title or destination" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="admin-select" style={{ maxWidth: 190 }} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(statusTone).map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
          <button className="admin-btn" type="submit">
            <Search /> Search
          </button>
        </form>
        {message && <span className="admin-toast spacer">{message}</span>}
      </div>

      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading trip events…</div>
        ) : trips.length === 0 ? (
          <div className="admin-empty">No trip events yet. Create your first departure.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Seats</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td>
                    <Link href={`/admin/trips/${trip.id}`}>{trip.title}</Link>
                    <div className="muted">{trip.destination}{trip.featured ? " · featured" : ""}</div>
                  </td>
                  <td>{formatDateRange(trip.startDate, trip.endDate)}</td>
                  <td>
                    <span className={`badge ${statusTone[trip.status] ?? "grey"}`}>{humanise(trip.status)}</span>
                  </td>
                  <td>
                    {trip.seatsBooked}/{trip.totalSeats}
                    <div className="muted">{trip.availableSeats} available{trip.seatsReserved ? ` · ${trip.seatsReserved} on hold` : ""}</div>
                  </td>
                  <td>₹{trip.pricePerPerson.toLocaleString("en-IN")}</td>
                  <td>
                    <div className="chips">
                      <Link className="admin-btn small" href={`/admin/trips/${trip.id}`}>
                        Edit
                      </Link>
                      <button className="admin-btn small" onClick={() => runAction(trip.id, "duplicate")} type="button">
                        <Copy /> Duplicate
                      </button>
                      {(ACTIONS[trip.status] ?? []).map((item) => (
                        <button
                          key={item.action}
                          className={`admin-btn small ${item.action === "cancel" ? "danger" : ""}`}
                          onClick={() => runAction(trip.id, item.action)}
                          type="button"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
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
