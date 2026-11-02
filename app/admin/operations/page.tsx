"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { formatDate, formatDateRange, humanise } from "@/lib/format";

type TripOption = { id: string; title: string };
type StaffOption = { id: string; name: string };
type TripSummary = {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  totalSeats: number;
  seatsBooked: number;
  seatsReserved: number;
  status: string;
};
type TaskRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  dueDate: string | null;
  notes: string;
  completedAt: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdAt: string;
};
type Readiness = { total: number; done: number; percent: number };

const CATEGORIES = ["accommodation", "transport", "guide", "activities", "photography", "videography", "editing", "permits", "participants", "departure", "emergency", "other"];
const STATUSES = ["pending", "in_progress", "done", "blocked"];
const statusTone: Record<string, string> = { pending: "grey", in_progress: "blue", done: "green", blocked: "red" };

export default function AdminOperationsPage() {
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [tripEventId, setTripEventId] = useState("");
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [readiness, setReadiness] = useState<Readiness>({ total: 0, done: 0, percent: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "other", assignedTo: "", dueDate: "", notes: "" });

  useEffect(() => {
    (async () => {
      const [tripResponse, staffResponse] = await Promise.all([fetch("/api/admin/trips"), fetch("/api/admin/staff")]);
      const tripPayload = await tripResponse.json();
      const staffPayload = await staffResponse.json();
      if (tripResponse.ok) {
        const list: TripOption[] = tripPayload.data.trips;
        setTrips(list);
        if (list[0]) setTripEventId((current) => current || list[0].id);
      }
      if (staffResponse.ok) setStaff(staffPayload.data.staff);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!tripEventId) {
      setTrip(null);
      setTasks([]);
      setReadiness({ total: 0, done: 0, percent: 0 });
      return;
    }
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/operations?tripEventId=${tripEventId}`);
    const payload = await response.json();
    if (response.ok) {
      setTrip(payload.data.trip);
      setTasks(payload.data.tasks);
      setReadiness(payload.data.readiness);
    } else {
      setError(payload.error?.message ?? "Could not load operations.");
    }
    setLoading(false);
  }, [tripEventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripEventId,
        title: form.title,
        description: form.description,
        category: form.category,
        assignedTo: form.assignedTo,
        dueDate: form.dueDate,
        notes: form.notes,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not create the task.");
      return;
    }
    setForm({ title: "", description: "", category: "other", assignedTo: "", dueDate: "", notes: "" });
    setMessage("Task added.");
    await load();
  }

  async function updateStatus(id: string, status: string) {
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/operations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not update the task.");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/operations/${id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("Task removed.");
      await load();
    } else {
      const payload = await response.json();
      setError(payload.error?.message ?? "Could not delete the task.");
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Operations</p>
          <h2>Trip Operations</h2>
        </div>
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-toolbar">
        <select className="admin-select" style={{ maxWidth: 360 }} value={tripEventId} onChange={(event) => setTripEventId(event.target.value)}>
          <option value="">Select a trip event</option>
          {trips.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
        <button className="admin-btn ghost spacer" onClick={() => void load()} type="button" disabled={!tripEventId}>
          <RefreshCw /> Refresh
        </button>
      </div>

      {!tripEventId ? (
        <div className="admin-empty">Select a trip to manage its operations.</div>
      ) : (
        <>
          {trip && (
            <div className="admin-card">
              <h3>{trip.title}</h3>
              <p className="hint">
                {formatDateRange(trip.startDate, trip.endDate)} · {trip.seatsBooked}/{trip.totalSeats} seats booked
              </p>
              <p className="eyebrow">Operational readiness: {readiness.percent}%</p>
              <div style={{ height: 10, background: "#e3e8e2", borderRadius: 6, overflow: "hidden", maxWidth: 420 }}>
                <div style={{ height: "100%", width: `${readiness.percent}%`, background: "#183D32", transition: "width .2s ease" }} />
              </div>
              <p className="fade" style={{ marginTop: 8 }}>
                {readiness.done} of {readiness.total} tasks complete
              </p>
            </div>
          )}

          <div className="admin-card">
            <h3>New task</h3>
            <p className="hint">Pre-departure checklist items for this trip.</p>
            <div className="admin-form-grid">
              <label className="admin-field full">
                <span>Title</span>
                <input className="admin-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              <label className="admin-field full">
                <span>Description</span>
                <textarea className="admin-textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
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
                <span>Assigned to</span>
                <select className="admin-select" value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}>
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Due date</span>
                <input className="admin-input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </label>
              <label className="admin-field">
                <span>Notes</span>
                <input className="admin-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>
            </div>
            <button className="admin-btn primary" style={{ marginTop: 16 }} type="button" onClick={create} disabled={saving || form.title.trim().length < 2}>
              <Plus /> {saving ? "Saving…" : "Add task"}
            </button>
          </div>

          <div className="admin-table-wrap">
            {loading ? (
              <div className="admin-empty">Loading operations…</div>
            ) : tasks.length === 0 ? (
              <div className="admin-empty">No tasks yet for this trip.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Category</th>
                    <th>Assigned to</th>
                    <th>Due date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        {task.title}
                        {task.description && <div className="muted">{task.description}</div>}
                      </td>
                      <td>
                        <span className="badge grey">{humanise(task.category)}</span>
                      </td>
                      <td>{task.assignedTo?.name ?? "Unassigned"}</td>
                      <td>{task.dueDate ? formatDate(task.dueDate) : "—"}</td>
                      <td>
                        <span className={`badge ${statusTone[task.status] ?? "grey"}`}>{humanise(task.status)}</span>
                      </td>
                      <td>
                        <div className="chips">
                          <select className="admin-select" style={{ maxWidth: 150 }} value={task.status} onChange={(event) => void updateStatus(task.id, event.target.value)}>
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {humanise(status)}
                              </option>
                            ))}
                          </select>
                          <button className="admin-btn danger small" type="button" onClick={() => void remove(task.id)}>
                            <Trash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}
