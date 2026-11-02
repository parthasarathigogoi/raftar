"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { humanise } from "@/lib/format";

type PartnerRow = { id: string; name: string; email: string | null; phone: string | null; role: string; skills: string[]; notes: string | null; status: string };

const ROLES = ["photographer", "videographer", "editor", "other"];

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "photographer", skills: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/partners");
    const payload = await response.json();
    if (response.ok) setPartners(payload.data.partners);
    else setError(payload.error?.message ?? "Could not load partners.");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        notes: form.notes,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not add the crew member.");
      return;
    }
    setForm({ name: "", email: "", phone: "", role: "photographer", skills: "", notes: "" });
    setMessage("Crew member added.");
    await load();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("Crew member removed.");
      await load();
    } else {
      const payload = await response.json();
      setError(payload.error?.message ?? "Could not remove the crew member.");
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Partners</p>
          <h2>Photographers, filmmakers and editors.</h2>
        </div>
        <span>Assign them to trip events from the trip editor.</span>
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-card">
        <h3>Add a crew member</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Name</span>
            <input className="admin-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Role</span>
            <select className="admin-select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {humanise(role)}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Email</span>
            <input className="admin-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Phone</span>
            <input className="admin-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label className="admin-field full">
            <span>Skills (comma separated)</span>
            <input className="admin-input" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
          </label>
          <label className="admin-field full">
            <span>Notes</span>
            <input className="admin-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <button className="admin-btn primary" style={{ marginTop: 16 }} type="button" onClick={create} disabled={saving || !form.name}>
          <Plus /> {saving ? "Saving…" : "Add crew member"}
        </button>
      </div>

      <div className="admin-table-wrap">
        {partners.length === 0 ? (
          <div className="admin-empty">No partners yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Skills</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td>{partner.name}</td>
                  <td>{humanise(partner.role)}</td>
                  <td>
                    {partner.email ?? "—"}
                    <div className="muted">{partner.phone ?? ""}</div>
                  </td>
                  <td>{partner.skills?.length ? partner.skills.join(", ") : "—"}</td>
                  <td>
                    <span className={`badge ${partner.status === "active" ? "green" : "grey"}`}>{humanise(partner.status)}</span>
                  </td>
                  <td>
                    <button className="admin-btn danger small" type="button" onClick={() => remove(partner.id)}>
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
