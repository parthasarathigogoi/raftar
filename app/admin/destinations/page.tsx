"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from "lucide-react";

type DestinationRow = {
  id: string;
  name: string;
  slug: string;
  state: string;
  description: string;
  coverImage: string;
  gallery: string[];
  bestTimeToVisit: string;
  travelInformation: string;
  permitInformation: string;
  featured: boolean;
  published: boolean;
  tripCount: number;
};

type DestinationForm = {
  name: string;
  state: string;
  description: string;
  coverImage: string;
  gallery: string;
  bestTimeToVisit: string;
  travelInformation: string;
  permitInformation: string;
};

const EMPTY_FORM: DestinationForm = {
  name: "",
  state: "",
  description: "",
  coverImage: "",
  gallery: "",
  bestTimeToVisit: "",
  travelInformation: "",
  permitInformation: "",
};

const parseGallery = (value: string) =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/destinations");
    const payload = await response.json();
    if (response.ok) {
      setDestinations(payload.data.destinations);
    } else {
      setError(payload.error?.message ?? "Could not load destinations.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return destinations;
    return destinations.filter(
      (destination) => destination.name.toLowerCase().includes(needle) || destination.state.toLowerCase().includes(needle)
    );
  }, [destinations, search]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(destination: DestinationRow) {
    setEditingId(destination.id);
    setError("");
    setMessage("");
    setForm({
      name: destination.name,
      state: destination.state,
      description: destination.description,
      coverImage: destination.coverImage,
      gallery: destination.gallery.join("\n"),
      bestTimeToVisit: destination.bestTimeToVisit,
      travelInformation: destination.travelInformation,
      permitInformation: destination.permitInformation,
    });
  }

  async function submit() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch(editingId ? `/api/admin/destinations/${editingId}` : "/api/admin/destinations", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        state: form.state,
        description: form.description,
        coverImage: form.coverImage,
        gallery: parseGallery(form.gallery),
        bestTimeToVisit: form.bestTimeToVisit,
        travelInformation: form.travelInformation,
        permitInformation: form.permitInformation,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not save the destination.");
      return;
    }
    setMessage(editingId ? "Destination updated." : "Destination created.");
    resetForm();
    await load();
  }

  async function patch(id: string, update: Record<string, unknown>, note: string) {
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/destinations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error?.message ?? "Could not update the destination.");
      return;
    }
    setMessage(note);
    await load();
  }

  async function remove(destination: DestinationRow) {
    if (!window.confirm(`Delete "${destination.name}"? This cannot be undone.`)) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/destinations/${destination.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error?.message ?? "Could not delete the destination.");
      return;
    }
    if (editingId === destination.id) resetForm();
    setMessage("Destination deleted.");
    await load();
  }

  const disabled = saving || !form.name.trim() || !form.state.trim() || !form.description.trim();

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Destinations</p>
          <h2>Places RAFTAR travels to.</h2>
        </div>
        <span>
          {destinations.length} destination{destinations.length === 1 ? "" : "s"} on record.
        </span>
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-card">
        <h3>{editingId ? "Edit destination" : "New destination"}</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Name</span>
            <input className="admin-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>State</span>
            <input className="admin-input" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
          </label>
          <label className="admin-field full">
            <span>Description</span>
            <textarea
              className="admin-textarea"
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Cover image URL</span>
            <input className="admin-input" value={form.coverImage} onChange={(event) => setForm({ ...form, coverImage: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Best time to visit</span>
            <input
              className="admin-input"
              value={form.bestTimeToVisit}
              onChange={(event) => setForm({ ...form, bestTimeToVisit: event.target.value })}
            />
          </label>
          <label className="admin-field full">
            <span>Gallery image URLs</span>
            <textarea
              className="admin-textarea"
              rows={2}
              placeholder="One per line or comma separated"
              value={form.gallery}
              onChange={(event) => setForm({ ...form, gallery: event.target.value })}
            />
          </label>
          <label className="admin-field full">
            <span>Travel information</span>
            <textarea
              className="admin-textarea"
              rows={2}
              value={form.travelInformation}
              onChange={(event) => setForm({ ...form, travelInformation: event.target.value })}
            />
          </label>
          <label className="admin-field full">
            <span>Permit information</span>
            <textarea
              className="admin-textarea"
              rows={2}
              value={form.permitInformation}
              onChange={(event) => setForm({ ...form, permitInformation: event.target.value })}
            />
          </label>
        </div>
        <div className="admin-toolbar" style={{ marginTop: 16 }}>
          <button className="admin-btn primary" type="button" onClick={submit} disabled={disabled}>
            <Plus /> {saving ? "Saving…" : editingId ? "Save changes" : "Create destination"}
          </button>
          {editingId && (
            <button className="admin-btn ghost" type="button" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="admin-toolbar">
        <label className="admin-field">
          <span>Search</span>
          <input
            className="admin-input"
            placeholder="Filter by name or state"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="admin-table-wrap">
        {visible.length === 0 ? (
          <div className="admin-empty">
            {destinations.length === 0 ? "No destinations yet." : "No destinations match your search."}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Destination</th>
                <th>State</th>
                <th>Trips</th>
                <th>Status</th>
                <th>Featured</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((destination) => (
                <tr key={destination.id}>
                  <td>
                    {destination.name}
                    <div className="muted">{destination.slug}</div>
                  </td>
                  <td>{destination.state}</td>
                  <td>{destination.tripCount}</td>
                  <td>
                    <span className={`badge ${destination.published ? "green" : "grey"}`}>
                      {destination.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>{destination.featured ? <span className="badge amber">Featured</span> : <span className="muted">—</span>}</td>
                  <td>
                    <div className="chips">
                      <button className="admin-btn ghost small" type="button" onClick={() => startEdit(destination)}>
                        <Pencil /> Edit
                      </button>
                      <button
                        className="admin-btn ghost small"
                        type="button"
                        onClick={() =>
                          patch(
                            destination.id,
                            { published: !destination.published },
                            destination.published ? "Destination unpublished." : "Destination published."
                          )
                        }
                      >
                        {destination.published ? <EyeOff /> : <Eye />} {destination.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        className="admin-btn ghost small"
                        type="button"
                        onClick={() =>
                          patch(
                            destination.id,
                            { featured: !destination.featured },
                            destination.featured ? "Destination unfeatured." : "Destination featured."
                          )
                        }
                      >
                        <Star /> {destination.featured ? "Unfeature" : "Feature"}
                      </button>
                      <Link className="admin-btn ghost small" href={`/trips?destination=${encodeURIComponent(destination.name)}`}>
                        View trips
                      </Link>
                      <button className="admin-btn danger small" type="button" onClick={() => remove(destination)}>
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
    </section>
  );
}
