import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { listAdminBookings } from "@/lib/bookings";
import { fail } from "@/lib/http";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Participant list export for a trip, as a CSV download. */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  const params = request.nextUrl.searchParams;
  const bookings = await listAdminBookings({
    tripEventId: params.get("tripEventId") || undefined,
    paymentStatus: params.get("paymentStatus") || undefined,
    bookingStatus: params.get("bookingStatus") || undefined,
    search: params.get("q")?.trim() || undefined,
    limit: 5000,
  });

  const header = [
    "Booking Reference",
    "Trip",
    "Contact Name",
    "Contact Email",
    "Contact Phone",
    "Travellers",
    "Adults",
    "Children",
    "Add-ons",
    "Total Amount",
    "Amount Paid",
    "Refunded",
    "Payment Status",
    "Booking Status",
    "Booking Date",
  ];

  const rows = bookings.map((booking) => [
    booking.reference,
    booking.tripEvent?.title ?? booking.trip?.title ?? "",
    booking.contact.name,
    booking.contact.email,
    booking.contact.phone,
    booking.travellers.length,
    booking.numberOfAdults,
    booking.numberOfChildren,
    (booking.addons ?? []).map((addon: Record<string, unknown>) => addon.name).join(" | "),
    booking.amounts.totalAmount,
    booking.amounts.amountPaid,
    booking.amounts.amountRefunded,
    booking.paymentStatus,
    booking.bookingStatus,
    booking.bookingDate ? new Date(booking.bookingDate).toISOString() : "",
  ]);

  const lines = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const filename = `raftar-registrations-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
