"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

type Profile = { id: string; name: string; email: string; phone: string | null; role: string; createdAt: string };

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "" });
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/profile");
    const payload = await response.json();
    if (response.ok) {
      const next: Profile = payload.data.profile;
      setProfile(next);
      setDetails({ name: next.name, phone: next.phone ?? "" });
    } else {
      setError(payload.error?.message ?? "Could not load your profile.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDetails() {
    setSavingDetails(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: details.name, phone: details.phone }),
    });
    const payload = await response.json();
    setSavingDetails(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not save your details.");
      return;
    }
    setMessage("Profile updated.");
    await load();
  }

  async function savePassword() {
    if (passwords.password !== passwords.confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setSavingPassword(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwords.password }),
    });
    const payload = await response.json();
    setSavingPassword(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not change your password.");
      return;
    }
    setPasswords({ password: "", confirm: "" });
    setMessage("Password changed.");
  }

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">My account</p>
          <h2>Profile &amp; security.</h2>
        </div>
        {profile && <span className="badge blue">{profile.role}</span>}
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-split">
        <div className="admin-card">
          <h3>Your details</h3>
          <div className="admin-form-grid">
            <label className="admin-field full">
              <span>Full name</span>
              <input className="admin-input" value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} />
            </label>
            <label className="admin-field full">
              <span>Phone</span>
              <input className="admin-input" value={details.phone} onChange={(event) => setDetails({ ...details, phone: event.target.value })} />
            </label>
            <label className="admin-field full">
              <span>Email</span>
              <input className="admin-input" value={profile?.email ?? ""} readOnly disabled />
            </label>
          </div>
          <div className="admin-toolbar" style={{ marginTop: 18, marginBottom: 0 }}>
            <button className="admin-btn primary" onClick={saveDetails} disabled={savingDetails}>
              {savingDetails ? "Saving…" : "Save details"}
            </button>
          </div>
        </div>

        <div className="admin-card">
          <h3>Change password</h3>
          <div className="admin-form-grid">
            <label className="admin-field full">
              <span>New password</span>
              <input
                className="admin-input"
                type="password"
                autoComplete="new-password"
                value={passwords.password}
                onChange={(event) => setPasswords({ ...passwords, password: event.target.value })}
              />
            </label>
            <label className="admin-field full">
              <span>Confirm new password</span>
              <input
                className="admin-input"
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
              />
            </label>
          </div>
          <div className="admin-note" style={{ marginTop: 16 }}>
            Passwords must be at least 12 characters. You will stay signed in on this device.
          </div>
          <div className="admin-toolbar" style={{ marginTop: 18, marginBottom: 0 }}>
            <button className="admin-btn primary" onClick={savePassword} disabled={savingPassword || passwords.password.length < 12}>
              {savingPassword ? "Updating…" : "Change password"}
            </button>
          </div>
        </div>
      </div>

      {profile && (
        <div className="admin-note" style={{ marginTop: 22 }}>
          Account created {formatDate(profile.createdAt)}.
        </div>
      )}
    </section>
  );
}
