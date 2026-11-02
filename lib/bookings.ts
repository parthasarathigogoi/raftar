import { connectToDatabase } from "@/lib/db";
import { TripBooking } from "@/models/TripBooking";
import { TripEvent } from "@/models/TripEvent";
import { Payment } from "@/models/Payment";

type AnyRecord = Record<string, any>;

/** Public, serialisable booking shape shared by customer and admin surfaces. */
export function bookingDto(booking: AnyRecord) {
  const tripEvent = booking.tripEventId && typeof booking.tripEventId === "object" ? booking.tripEventId : null;
  return {
    id: String(booking._id),
    reference: booking.bookingReference,
    tripEventId: String(tripEvent?._id ?? booking.tripEventId),
    trip: booking.tripSnapshot ?? null,
    tripEvent: tripEvent
      ? { id: String(tripEvent._id), title: tripEvent.title, slug: tripEvent.slug, coverImage: tripEvent.coverImage, destination: tripEvent.destination }
      : null,
    customerId: booking.customerId ? String(booking.customerId) : null,
    customer: booking.customerId && typeof booking.customerId === "object" ? { id: String(booking.customerId._id), name: booking.customerId.name, email: booking.customerId.email } : null,
    travellers: booking.travellerDetails ?? [],
    numberOfAdults: booking.numberOfAdults,
    numberOfChildren: booking.numberOfChildren,
    addons: booking.selectedAddons ?? [],
    amounts: {
      baseAmount: booking.baseAmount,
      addonAmount: booking.addonAmount,
      discountAmount: booking.discountAmount,
      taxAmount: booking.taxAmount,
      totalAmount: booking.totalAmount,
      amountPaid: booking.amountPaid,
      amountRefunded: booking.amountRefunded,
    },
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    paymentReference: booking.paymentReference,
    bookingDate: booking.bookingDate,
    holdExpiresAt: booking.holdExpiresAt ?? null,
    contact: { name: booking.contactName, email: booking.contactEmail, phone: booking.contactPhone },
    mediaConsent: booking.mediaConsent ?? { captureConsent: false, marketingConsent: false },
    source: booking.source,
    notes: booking.notes,
    statusHistory: booking.statusHistory ?? [],
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export async function listCustomerBookings(customerId: string, options: { status?: string } = {}) {
  await connectToDatabase();
  const filter: AnyRecord = { customerId };
  if (options.status) filter.bookingStatus = options.status;
  const bookings = await TripBooking.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({ path: "tripEventId", select: "title slug coverImage destination" })
    .lean();
  return bookings.map((booking) => bookingDto(booking));
}

export async function getCustomerBooking(customerId: string, bookingId: string) {
  await connectToDatabase();
  const booking = await TripBooking.findOne({ _id: bookingId, customerId })
    .populate({ path: "tripEventId", select: "title slug coverImage destination startDate endDate" })
    .lean();
  return booking ? bookingDto(booking) : null;
}

export async function listAdminBookings(options: {
  tripEventId?: string;
  paymentStatus?: string;
  bookingStatus?: string;
  search?: string;
  limit?: number;
} = {}) {
  await connectToDatabase();
  const filter: AnyRecord = {};
  if (options.tripEventId) filter.tripEventId = options.tripEventId;
  if (options.paymentStatus) filter.paymentStatus = options.paymentStatus;
  if (options.bookingStatus) filter.bookingStatus = options.bookingStatus;
  if (options.search) {
    const pattern = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ bookingReference: pattern }, { contactName: pattern }, { contactEmail: pattern }, { contactPhone: pattern }];
  }
  const bookings = await TripBooking.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 100)
    .populate({ path: "tripEventId", select: "title slug destination startDate" })
    .lean();
  return bookings.map((booking) => bookingDto(booking));
}

export async function getAdminBooking(bookingId: string) {
  await connectToDatabase();
  const booking = await TripBooking.findById(bookingId)
    .populate({ path: "tripEventId", select: "title slug destination startDate endDate pricePerPerson" })
    .lean();
  if (!booking) return null;
  const payments = await Payment.find({ bookingId }).sort({ createdAt: -1 }).lean();
  return {
    booking: bookingDto(booking),
    payments: payments.map((payment) => ({
      id: String(payment._id),
      provider: payment.provider,
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      receiptNumber: payment.receiptNumber,
      refunds: payment.refunds ?? [],
      verifiedAt: payment.verifiedAt,
      createdAt: payment.createdAt,
    })),
  };
}

/** Trip-wise registration + revenue rollup used by admin reports. */
export async function tripRegistrationReport() {
  await connectToDatabase();
  const events = await TripEvent.find().sort({ startDate: -1 }).select("title slug startDate status totalSeats seatsBooked seatsReserved pricePerPerson").lean();
  const bookings = await TripBooking.find({ bookingStatus: { $in: ["confirmed", "completed"] } })
    .select("tripEventId numberOfAdults numberOfChildren totalAmount amountPaid amountRefunded")
    .lean();

  return events.map((event) => {
    const related = bookings.filter((booking) => String(booking.tripEventId) === String(event._id));
    const participants = related.reduce((sum, booking) => sum + booking.numberOfAdults + booking.numberOfChildren, 0);
    const collected = related.reduce((sum, booking) => sum + booking.amountPaid - booking.amountRefunded, 0);
    return {
      tripEventId: String(event._id),
      title: event.title,
      slug: event.slug,
      startDate: event.startDate,
      status: event.status,
      totalSeats: event.totalSeats,
      seatsBooked: event.seatsBooked,
      seatsReserved: event.seatsReserved,
      confirmedBookings: related.length,
      participants,
      collected,
    };
  });
}
