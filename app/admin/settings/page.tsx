import { getRazorpayPublicConfig } from "@/lib/razorpay";
import { resolveTaxPercent } from "@/lib/booking-service";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  const razorpay = getRazorpayPublicConfig();
  const taxPercent = resolveTaxPercent();
  const holdMinutes = Number(process.env.BOOKING_HOLD_MINUTES ?? "15") || 15;
  const authConfigured = Boolean(process.env.AUTH_SECRET);
  const databaseConfigured = Boolean(process.env.MONGODB_URI);

  const rows = [
    { label: "Razorpay", value: razorpay.configured ? `Configured (${razorpay.keyId})` : "Not configured", ok: razorpay.configured },
    { label: "Webhook secret", value: process.env.RAZORPAY_WEBHOOK_SECRET ? "Set" : "Not set", ok: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) },
    { label: "Booking tax", value: `${taxPercent}%`, ok: true },
    { label: "Seat hold window", value: `${holdMinutes} minutes`, ok: true },
    { label: "Database", value: databaseConfigured ? "MONGODB_URI set" : "MONGODB_URI missing", ok: databaseConfigured },
    { label: "Auth secret", value: authConfigured ? "AUTH_SECRET set" : "AUTH_SECRET missing", ok: authConfigured },
  ];

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Configuration at a glance.</h2>
        </div>
        <span>Secrets are never displayed — only whether they are set.</span>
      </div>

      {!razorpay.configured && (
        <div className="admin-note warn">
          Payments are disabled until RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are set. Bookings cannot be confirmed without verified
          payment — RAFTAR never simulates a successful payment.
        </div>
      )}

      <div className="admin-card">
        <h3>Environment</h3>
        <p className="hint">Managed on the server. Restart the app after changing these values.</p>
        <dl className="kv">
          {rows.map((row) => (
            <div key={row.label} style={{ display: "contents" }}>
              <dt>{row.label}</dt>
              <dd>
                <span className={`badge ${row.ok ? "green" : "red"}`}>{row.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
