import Link from "next/link";
import { CalendarDays, MapPin, UserRound, UsersRound } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { listCustomerBookings } from "@/lib/bookings";
import { formatCurrency, formatDate, formatDateRange, humanise } from "@/lib/format";
import CancelBookingButton from "./cancel-button";

export const dynamic = "force-dynamic";

export default async function CustomerBookingDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const user = await currentUser().catch(() => null);

  if (!user) {
    return (
      <main className="account-page">
        <nav className="shell trips-nav">
          <Link href="/" className="wordmark">RAF<span>TAR</span></Link>
        </nav>
        <section className="shell account-gate">
          <UserRound />
          <h1>Sign in to view this booking.</h1>
          <p>Booking details are private to your RAFTAR account.</p>
          <Link className="button button-forest" href={`/login?next=${encodeURIComponent(`/customer/bookings/${reference}`)}`}>
            Sign in or create an account
          </Link>
        </section>
      </main>
    );
  }

  let booking: Awaited<ReturnType<typeof listCustomerBookings>>[number] | null = null;
  try {
    const bookings = await listCustomerBookings(user.id);
    booking = bookings.find((item) => item.reference === reference) ?? null;
  } catch {
    booking = null;
  }

  if (!booking) {
    return (
      <main className="account-page">
        <nav className="shell trips-nav">
          <Link href="/" className="wordmark">RAF<span>TAR</span></Link>
          <div className="trips-nav-links">
            <Link href="/customer/bookings">My bookings</Link>
          </div>
        </nav>
        <section className="shell empty-state" style={{ padding: "120px 0" }}>
          <CalendarDays />
          <h2>Booking not found.</h2>
          <p>We could not find that booking in your account.</p>
          <Link className="btn btn-solid" href="/customer/bookings">
            Back to my bookings
          </Link>
        </section>
      </main>
    );
  }

  const tripTitle = booking.tripEvent?.title ?? booking.trip?.title ?? "RAFTAR trip";
  const tripSlug = booking.tripEvent?.slug ?? booking.trip?.slug ?? null;
  const cancellable = ["pending_payment", "confirmed"].includes(booking.bookingStatus);

  return (
    <main className="account-page">
      <nav className="shell trips-nav">
        <Link href="/" className="wordmark">RAF<span>TAR</span></Link>
        <div className="trips-nav-links">
          <Link href="/customer/dashboard">My account</Link>
          <Link href="/customer/bookings">My bookings</Link>
        </div>
      </nav>

      <header className="shell account-head">
        <p className="eyebrow">Booking {booking.reference}</p>
        <h1>{tripTitle}</h1>
        <p>
          <span className={`badge ${booking.bookingStatus === "confirmed" || booking.bookingStatus === "completed" ? "green" : booking.bookingStatus === "cancelled" || booking.bookingStatus === "refunded" ? "red" : "amber"}`}>
            {humanise(booking.bookingStatus)}
          </span>
        </p>
      </header>

      <section className="shell account-body">
        <div className="confirm-grid">
          <div>
            <small>Destination</small>
            <strong>
              <MapPin style={{ width: 15, verticalAlign: "-2px", marginRight: 6 }} />
              {booking.tripEvent?.destination ?? booking.trip?.destination ?? "—"}
            </strong>
          </div>
          <div>
            <small>Dates</small>
            <strong>{formatDateRange(booking.trip?.startDate, booking.trip?.endDate)}</strong>
          </div>
          <div>
            <small>Travellers</small>
            <strong>
              <UsersRound style={{ width: 15, verticalAlign: "-2px", marginRight: 6 }} />
              {booking.numberOfAdults} adult(s){booking.numberOfChildren > 0 ? ` · ${booking.numberOfChildren} child(ren)` : ""}
            </strong>
          </div>
          <div>
            <small>Booked on</small>
            <strong>{formatDate(booking.bookingDate)}</strong>
          </div>
        </div>

        <div className="account-table-wrap" style={{ marginTop: 26 }}>
          <table className="account-table">
            <tbody>
              <tr>
                <td>Base amount</td>
                <td>{formatCurrency(booking.amounts.baseAmount)}</td>
              </tr>
              {booking.amounts.addonAmount > 0 && (
                <tr>
                  <td>Add-ons</td>
                  <td>{formatCurrency(booking.amounts.addonAmount)}</td>
                </tr>
              )}
              {booking.amounts.taxAmount > 0 && (
                <tr>
                  <td>Taxes</td>
                  <td>{formatCurrency(booking.amounts.taxAmount)}</td>
                </tr>
              )}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>{formatCurrency(booking.amounts.totalAmount)}</strong>
                </td>
              </tr>
              <tr>
                <td>Paid</td>
                <td>{formatCurrency(booking.amounts.amountPaid ?? 0)}</td>
              </tr>
              <tr>
                <td>Payment status</td>
                <td>{humanise(booking.paymentStatus)}</td>
              </tr>
              {booking.paymentReference && (
                <tr>
                  <td>Payment reference</td>
                  <td>
                    <span className="account-ref">{booking.paymentReference}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 style={{ marginTop: 42 }}>Travellers</h2>
        <div className="account-table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {booking.travellers.map((traveller: { name: string; travellerType?: string; age?: number }, index: number) => (
                <tr key={`${traveller.name}-${index}`}>
                  <td>{traveller.name}</td>
                  <td>{humanise(traveller.travellerType ?? "adult")}</td>
                  <td>{traveller.age ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {booking.addons.length > 0 && (
          <>
            <h2 style={{ marginTop: 42 }}>Add-ons</h2>
            <div className="chips">
              {booking.addons.map((addon: { code: string; name: string; price: number }) => (
                <span className="chip" key={addon.code}>
                  {addon.name} · {formatCurrency(addon.price)}
                </span>
              ))}
            </div>
          </>
        )}

        {booking.statusHistory.length > 0 && (
          <>
            <h2 style={{ marginTop: 42 }}>Booking history</h2>
            <ol className="itinerary">
              {booking.statusHistory.map((entry: { status: string; at: string; note?: string }, index: number) => (
                <li key={index}>
                  <span className="itinerary-day">{formatDate(entry.at)}</span>
                  <div>
                    <h3>{humanise(entry.status)}</h3>
                    {entry.note && <p>{entry.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        <div className="book-actions" style={{ justifyContent: "flex-start", marginTop: 40 }}>
          {tripSlug && (
            <Link className="btn btn-ghost" href={`/trips/${tripSlug}`}>
              View trip
            </Link>
          )}
          {cancellable && <CancelBookingButton bookingId={booking.id} />}
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 90 }}>
        <Link className="text-link dark-link" href="/customer/bookings">
          ← Back to my bookings
        </Link>
      </section>
    </main>
  );
}
