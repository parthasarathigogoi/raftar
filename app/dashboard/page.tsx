"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  CreditCard,
  Loader2,
  LogOut,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateRange, formatDateTime, humanise } from "@/lib/format";

type Booking = {
  id: string;
  reference: string;
  trip: { title?: string; slug?: string; destination?: string; startDate?: string; endDate?: string } | null;
  tripEvent: { id: string; title: string; slug: string; coverImage?: string; destination?: string } | null;
  travellers: Array<{ name: string; age?: number; gender?: string; phone?: string; idProof?: string; travellerType?: string }>;
  numberOfAdults: number;
  numberOfChildren: number;
  addons: Array<{ code: string; name: string; kind?: string; price: number; perPerson?: boolean }>;
  amounts: {
    baseAmount: number;
    addonAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    amountPaid?: number;
    amountRefunded?: number;
  };
  paymentStatus: string;
  bookingStatus: string;
  paymentReference?: string;
  bookingDate: string;
  holdExpiresAt?: string | null;
  contact: { name?: string; email?: string; phone?: string };
  statusHistory: Array<{ status: string; at: string; note?: string }>;
  createdAt: string;
};

type Notification = { id: string; type: string; title: string; message: string; read: boolean; createdAt: string };

type GalleryProject = {
  id: string;
  title: string;
  type: string;
  status: string;
  tripTitle: string | null;
  tripCover: string | null;
  deliverables: string[];
  assets: Array<{ id: string; assetType: string; title: string | null; thumbnailUrl: string | null; capturedAt: string | null }>;
};

type Profile = { id: string; name: string; email: string; phone: string | null; role: string; createdAt: string };

type Tab = "trips" | "bookings" | "payments" | "travellers" | "gallery" | "notifications" | "profile";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "trips", label: "My Trips" },
  { id: "bookings", label: "My Bookings" },
  { id: "payments", label: "Payment History" },
  { id: "travellers", label: "Traveller Details" },
  { id: "gallery", label: "My Media Gallery" },
  { id: "notifications", label: "Notifications" },
  { id: "profile", label: "Profile" },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("trips");
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<GalleryProject[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const me = await fetch("/api/auth/me", { cache: "no-store" });
    if (me.status === 401) {
      setSignedOut(true);
      setLoading(false);
      return;
    }
    const [bookingRes, notificationRes, galleryRes, profileRes] = await Promise.all([
      fetch("/api/bookings", { cache: "no-store" }),
      fetch("/api/notifications", { cache: "no-store" }),
      fetch("/api/media/gallery", { cache: "no-store" }),
      fetch("/api/profile", { cache: "no-store" }),
    ]);
    const bookingPayload = bookingRes.ok ? (await bookingRes.json()).data : { bookings: [] };
    const notificationPayload = notificationRes.ok ? (await notificationRes.json()).data : { notifications: [] };
    const galleryPayload = galleryRes.ok ? (await galleryRes.json()).data : { projects: [] };
    const profilePayload = profileRes.ok ? (await profileRes.json()).data : { profile: null };
    setBookings(bookingPayload.bookings ?? []);
    setNotifications(notificationPayload.notifications ?? []);
    setProjects(galleryPayload.projects ?? []);
    setProfile(profilePayload.profile ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upcomingTrips = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          ["confirmed", "completed"].includes(booking.bookingStatus) &&
          (booking.trip?.startDate ? new Date(booking.trip.startDate) >= new Date() : true)
      ),
    [bookings]
  );
  const unread = notifications.filter((notification) => !notification.read).length;

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this registration? Seats are released immediately.")) return;
    const response = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (response.ok) await load();
    else setError((await response.json()).error?.message ?? "We could not cancel that booking.");
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }

  async function saveProfile(payload: { name?: string; phone?: string; password?: string }) {
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) return { error: body.error?.message ?? "We could not save your changes." };
    setProfile((current) => (current ? { ...current, ...body.data.profile } : body.data.profile));
    return { error: "" };
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (signedOut) {
    return (
      <main className="account-page">
        <nav className="shell trips-nav">
          <Link href="/" className="wordmark">RAF<span>TAR</span></Link>
        </nav>
        <section className="shell account-gate">
          <UserRound />
          <h1>Sign in to view your journeys.</h1>
          <p>Your bookings, payment history and private media gallery live behind your RAFTAR account.</p>
          <Link className="button button-forest" href="/login">Sign in or create an account</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <nav className="shell trips-nav">
        <Link href="/" className="wordmark">RAF<span>TAR</span></Link>
        <div className="trips-nav-links">
          <Link href="/events">Upcoming travel</Link>
          <button type="button" className="link-button" onClick={signOut}>
            <LogOut /> Sign out
          </button>
        </div>
      </nav>

      <header className="shell account-head">
        <p className="eyebrow">Your dashboard</p>
        <h1>{profile ? `Welcome back, ${profile.name.split(" ")[0]}.` : "Your journeys."}</h1>
        <p>Everything about your RAFTAR travel in one place — trips, payments, travellers and your private media gallery.</p>
      </header>

      <div className="shell account-tabs">
        {TABS.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "account-tab active" : "account-tab"} onClick={() => setTab(item.id)}>
            {item.label}
            {item.id === "notifications" && unread > 0 && <span className="account-badge">{unread}</span>}
          </button>
        ))}
      </div>

      {error && <div className="shell account-error">{error}</div>}

      {loading ? (
        <section className="shell account-loading">
          <Loader2 className="spin" />
          <p>Loading your account…</p>
        </section>
      ) : (
        <section className="shell account-body">
          {tab === "trips" && <TripsTab bookings={upcomingTrips} onCancel={cancelBooking} />}
          {tab === "bookings" && <BookingsTab bookings={bookings} onCancel={cancelBooking} />}
          {tab === "payments" && <PaymentsTab bookings={bookings} />}
          {tab === "travellers" && <TravellersTab bookings={bookings} />}
          {tab === "gallery" && <GalleryTab projects={projects} />}
          {tab === "notifications" && <NotificationsTab notifications={notifications} onMarkAll={markAllRead} />}
          {tab === "profile" && profile && <ProfileTab profile={profile} onSave={saveProfile} />}
        </section>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "confirmed" || status === "paid" || status === "completed" ? "green" : status === "pending_payment" || status === "pending" || status === "partially_paid" ? "amber" : status === "cancelled" || status === "failed" ? "red" : "blue";
  return <span className={`badge ${tone}`}>{humanise(status)}</span>;
}

function TripsTab({ bookings, onCancel }: { bookings: Booking[]; onCancel: (id: string) => void }) {
  if (!bookings.length) return <EmptyState icon={<CalendarDays />} title="No upcoming trips yet" copy="When you register for a departure, it appears here with your travellers and media add-ons." href="/events" cta="Browse upcoming trips" />;
  return (
    <div className="account-trip-grid">
      {bookings.map((booking) => (
        <article className="account-trip" key={booking.id}>
          <div className="account-trip-image">
            {booking.tripEvent?.coverImage ? (
              <Image src={booking.tripEvent.coverImage} alt={booking.tripEvent.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
            ) : (
              <span className="trip-card-placeholder" />
            )}
          </div>
          <div className="account-trip-body">
            <div className="account-trip-top">
              <StatusPill status={booking.bookingStatus} />
              <span className="account-ref">{booking.reference}</span>
            </div>
            <h3>{booking.tripEvent?.title ?? booking.trip?.title ?? "RAFTAR trip"}</h3>
            <p className="account-trip-meta">
              <MapPin /> {booking.tripEvent?.destination ?? booking.trip?.destination ?? "—"}
            </p>
            <p className="account-trip-meta">
              <CalendarDays /> {formatDateRange(booking.trip?.startDate, booking.trip?.endDate)}
            </p>
            <p className="account-trip-meta">
              <UsersRound /> {booking.numberOfAdults} adult(s) · {booking.numberOfChildren} child(ren)
            </p>
            {booking.addons.length > 0 && (
              <div className="chips">
                {booking.addons.map((addon) => (
                  <span className="chip" key={addon.code}>
                    <Camera /> {addon.name}
                  </span>
                ))}
              </div>
            )}
            <div className="account-trip-foot">
              <strong>{formatCurrency(booking.amounts.totalAmount)}</strong>
              <div className="account-trip-actions">
                {booking.tripEvent?.slug && (
                  <Link className="text-link dark-link" href={`/events/${booking.tripEvent.slug}`}>
                    View trip
                  </Link>
                )}
                {["pending_payment", "confirmed"].includes(booking.bookingStatus) && (
                  <button type="button" className="link-button danger" onClick={() => onCancel(booking.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function BookingsTab({ bookings, onCancel }: { bookings: Booking[]; onCancel: (id: string) => void }) {
  if (!bookings.length) return <EmptyState icon={<CalendarDays />} title="No bookings yet" copy="Your registrations will be listed here." href="/events" cta="Find a trip" />;
  return (
    <div className="account-table-wrap">
      <table className="account-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Trip</th>
            <th>Travellers</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>
                <span className="account-ref">{booking.reference}</span>
                <small>{formatDate(booking.bookingDate)}</small>
              </td>
              <td>{booking.tripEvent?.title ?? booking.trip?.title ?? "RAFTAR trip"}</td>
              <td>
                {booking.numberOfAdults}A · {booking.numberOfChildren}C
              </td>
              <td>{formatCurrency(booking.amounts.totalAmount)}</td>
              <td>
                <StatusPill status={booking.paymentStatus} />
              </td>
              <td>
                <StatusPill status={booking.bookingStatus} />
              </td>
              <td>
                {["pending_payment", "confirmed"].includes(booking.bookingStatus) && (
                  <button type="button" className="link-button danger" onClick={() => onCancel(booking.id)}>
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTab({ bookings }: { bookings: Booking[] }) {
  const rows = bookings.filter((booking) => booking.paymentReference || (booking.amounts.amountPaid ?? 0) > 0 || (booking.amounts.amountRefunded ?? 0) > 0);
  if (!rows.length) return <EmptyState icon={<CreditCard />} title="No payments recorded" copy="Once a payment is verified, it will be listed here with its reference." href="/events" cta="Find a trip" />;
  return (
    <div className="account-table-wrap">
      <table className="account-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Trip</th>
            <th>Reference</th>
            <th>Paid</th>
            <th>Refunded</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((booking) => (
            <tr key={booking.id}>
              <td>{formatDate(booking.bookingDate)}</td>
              <td>{booking.tripEvent?.title ?? booking.trip?.title ?? "RAFTAR trip"}</td>
              <td>
                <span className="account-ref">{booking.paymentReference ?? booking.reference}</span>
              </td>
              <td>{formatCurrency(booking.amounts.amountPaid ?? 0)}</td>
              <td>{formatCurrency(booking.amounts.amountRefunded ?? 0)}</td>
              <td>
                <StatusPill status={booking.paymentStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TravellersTab({ bookings }: { bookings: Booking[] }) {
  const travellers = bookings.flatMap((booking) => booking.travellers.map((traveller) => ({ ...traveller, reference: booking.reference, trip: booking.tripEvent?.title ?? booking.trip?.title ?? "RAFTAR trip" })));
  if (!travellers.length) return <EmptyState icon={<UsersRound />} title="No travellers yet" copy="Traveller details you enter during booking are kept here for quick reuse." href="/events" cta="Find a trip" />;
  return (
    <div className="account-table-wrap">
      <table className="account-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Age</th>
            <th>ID proof</th>
            <th>Trip</th>
            <th>Booking</th>
          </tr>
        </thead>
        <tbody>
          {travellers.map((traveller, index) => (
            <tr key={`${traveller.reference}-${index}`}>
              <td>{traveller.name}</td>
              <td>{humanise(traveller.travellerType ?? "adult")}</td>
              <td>{traveller.age ?? "—"}</td>
              <td>{traveller.idProof ?? "—"}</td>
              <td>{traveller.trip}</td>
              <td>
                <span className="account-ref">{traveller.reference}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GalleryTab({ projects }: { projects: GalleryProject[] }) {
  if (!projects.length)
    return <EmptyState icon={<Camera />} title="No media delivered yet" copy="Photographs and films from your trips are delivered to this private gallery once they are edited and approved." href="/events" cta="Find a trip" />;
  return (
    <div className="account-gallery">
      {projects.map((project) => (
        <article className="gallery-project" key={project.id}>
          <div className="gallery-project-head">
            <div>
              <p className="eyebrow">{humanise(project.type)}</p>
              <h3>{project.title}</h3>
              <p className="gallery-project-trip">{project.tripTitle ?? "RAFTAR trip"}</p>
            </div>
            <StatusPill status={project.status} />
          </div>
          {project.deliverables.length > 0 && (
            <div className="chips">
              {project.deliverables.map((deliverable) => (
                <span className="chip" key={deliverable}>
                  <Check /> {humanise(deliverable)}
                </span>
              ))}
            </div>
          )}
          {project.assets.length === 0 ? (
            <p className="account-note">Your media is being edited. It will appear here when it is ready.</p>
          ) : (
            <div className="gallery-assets">
              {project.assets.map((asset) => (
                <div className="gallery-asset" key={asset.id}>
                  {asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.thumbnailUrl} alt={asset.title ?? "RAFTAR media"} />
                  ) : (
                    <span className="gallery-asset-placeholder">
                      <Camera />
                    </span>
                  )}
                  <span>{asset.title ?? humanise(asset.assetType)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function NotificationsTab({ notifications, onMarkAll }: { notifications: Notification[]; onMarkAll: () => void }) {
  if (!notifications.length) return <EmptyState icon={<Bell />} title="You're all caught up" copy="Trip announcements and booking updates will land here." href="/events" cta="Browse trips" />;
  return (
    <div className="account-notifications">
      <div className="account-notifications-head">
        <h3>Updates</h3>
        <button type="button" className="link-button" onClick={onMarkAll}>
          Mark all read
        </button>
      </div>
      <ul>
        {notifications.map((notification) => (
          <li key={notification.id} className={notification.read ? "notification" : "notification unread"}>
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
            <small>{formatDateTime(notification.createdAt)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileTab({ profile, onSave }: { profile: Profile; onSave: (payload: { name?: string; phone?: string; password?: string }) => Promise<{ error: string }> }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function submit() {
    setStatus("saving");
    setError("");
    const result = await onSave({ name, phone, password: password || undefined });
    if (result.error) {
      setError(result.error);
      setStatus("idle");
      return;
    }
    setPassword("");
    setStatus("saved");
  }

  return (
    <div className="account-profile">
      <div className="account-profile-card">
        <p className="eyebrow">Account</p>
        <p className="account-profile-email">{profile.email}</p>
        <p className="account-note">Member since {formatDate(profile.createdAt)} · {humanise(profile.role)}</p>
      </div>
      <div className="account-profile-form">
        <label className="admin-field">
          <span>Full name</span>
          <input className="admin-input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>Phone</span>
          <input className="admin-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>New password (optional, min 12 characters)</span>
          <input className="admin-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <div className="account-error">{error}</div>}
        <button type="button" className="button button-forest" onClick={submit} disabled={status === "saving"}>
          {status === "saving" ? <><Loader2 className="spin" /> Saving…</> : status === "saved" ? <><Check /> Saved</> : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, copy, href, cta }: { icon: React.ReactNode; title: string; copy: string; href: string; cta: string }) {
  return (
    <div className="account-empty">
      {icon}
      <h3>{title}</h3>
      <p>{copy}</p>
      <Link className="button button-forest" href={href}>
        {cta}
      </Link>
    </div>
  );
}
