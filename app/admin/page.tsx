import { CircleDollarSign, ClipboardList, TrendingDown, TrendingUp, Ticket, UsersRound } from "lucide-react";
import { dashboardStats } from "@/lib/admin-reports";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  let stats: Awaited<ReturnType<typeof dashboardStats>> | null = null;
  let error = "";
  try {
    stats = await dashboardStats();
  } catch {
    error = "Connect MongoDB to view live statistics.";
  }

  const cards = stats
    ? [
        { label: "Published trips", value: stats.publishedTrips, note: `${stats.upcomingTrips} upcoming`, icon: Ticket },
        { label: "Open registrations", value: stats.openRegistrations, note: "Accepting bookings", icon: ClipboardList },
        { label: "Total participants", value: stats.totalParticipants, note: `${stats.confirmedBookings} confirmed bookings`, icon: UsersRound },
        { label: "Available seats", value: stats.availableSeats, note: "Across all trips", icon: Ticket },
        { label: "Pending payments", value: stats.pendingPayments, note: "Awaiting settlement", icon: TrendingDown },
        { label: "Collected revenue", value: formatCurrency(stats.totalRevenue), note: "Net of refunds", icon: CircleDollarSign },
        { label: "Trip expenses", value: formatCurrency(stats.totalExpenses), note: "Recorded costs", icon: TrendingDown },
        { label: "Estimated profit", value: formatCurrency(stats.estimatedProfit), note: "Revenue − expenses", icon: TrendingUp },
      ]
    : [];

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Business overview</p>
          <h2>Every departure, in one place.</h2>
        </div>
        <span>{error || "Live figures, no estimates."}</span>
      </div>

      <div className="stat-grid">
        {stats ? (
          cards.map(({ label, value, note, icon: Icon }) => (
            <article key={label}>
              <Icon />
              <p>{label}</p>
              <strong>{value}</strong>
              <span>{note}</span>
            </article>
          ))
        ) : (
          <article style={{ gridColumn: "1 / -1" }}>
            <p>{error}</p>
            <span>Statistics will appear here as soon as the database is reachable.</span>
          </article>
        )}
      </div>

      <div className="admin-panels">
        <article>
          <p className="eyebrow">Publish a departure</p>
          <h3>Create your next trip event.</h3>
          <p>Add dates, itinerary, pricing and media add-ons, then publish. Customers book directly — no quotations required.</p>
        </article>
        <article>
          <p className="eyebrow">Trip reports</p>
          <h3>Registrations and revenue, per trip.</h3>
          <p>Open Finance for trip-wise collections, expenses and profit, or Registrations to manage participants.</p>
        </article>
      </div>
    </section>
  );
}
