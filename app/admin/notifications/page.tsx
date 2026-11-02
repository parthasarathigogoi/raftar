"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { formatDateTime } from "@/lib/format";

type AnnouncementRow = { id: string; title: string; message: string; createdAt: string };

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AnnouncementRow[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all_customers");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/notifications");
    const payload = await response.json();
    if (response.ok) setNotifications(payload.data.notifications);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setSending(true);
    setError("");
    setFeedback("");
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, audience }),
    });
    const payload = await response.json();
    setSending(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not send the announcement.");
      return;
    }
    setTitle("");
    setMessage("");
    setFeedback(`Announcement delivered to ${payload.data.sent} customer(s).`);
    await load();
  }

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Notifications</p>
          <h2>Reach your travellers.</h2>
        </div>
      </div>

      {feedback && <div className="admin-note">{feedback}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-card">
        <h3>Broadcast an announcement</h3>
        <p className="hint">Appears in the customer dashboard for the chosen audience.</p>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Audience</span>
            <select className="admin-select" value={audience} onChange={(event) => setAudience(event.target.value)}>
              <option value="all_customers">All customers</option>
              <option value="confirmed_travellers">Confirmed travellers only</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Title</span>
            <input className="admin-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="admin-field full">
            <span>Message</span>
            <textarea className="admin-textarea" value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
        </div>
        <button className="admin-btn primary" style={{ marginTop: 16 }} type="button" onClick={send} disabled={sending || !title || !message}>
          <Megaphone /> {sending ? "Sending…" : "Send announcement"}
        </button>
      </div>

      <div className="admin-table-wrap">
        {notifications.length === 0 ? (
          <div className="admin-empty">No announcements sent yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td>{notification.title}</td>
                  <td>{notification.message}</td>
                  <td>{formatDateTime(notification.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
