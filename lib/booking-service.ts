import { connectToDatabase } from "@/lib/db";
import { BookingError, type AddonSummary } from "@/lib/booking-errors";
import {
  availableSeats,
  bookingReference,
  computeBookingAmounts,
  receiptNumber,
  roundCurrency,
  type AddonInput,
} from "@/lib/booking-math";
import { confirmHeldSeats, holdSeats, releaseBookedSeats, releaseHeldSeats } from "@/lib/seats";
import {
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayPayment,
  PaymentConfigError,
  razorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import { recordAudit } from "@/lib/audit";
import { CustomerConsent } from "@/models/CustomerConsent";
import { MediaProject } from "@/models/MediaProject";
import { Notification } from "@/models/Notification";
import { Payment } from "@/models/Payment";
import { TripBooking } from "@/models/TripBooking";
import { TripEvent } from "@/models/TripEvent";
import { User } from "@/models/User";

export { BookingError } from "@/lib/booking-errors";

export function resolveTaxPercent() {
  const value = Number(process.env.BOOKING_TAX_PERCENT ?? "0");
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function resolveHoldMs() {
  const minutes = Number(process.env.BOOKING_HOLD_MINUTES ?? "15");
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 15) * 60 * 1000;
}

type EventLike = {
  _id: unknown;
  status: string;
  startDate: Date | string;
  registrationStartDate?: Date | string | null;
  registrationEndDate?: Date | string | null;
  totalSeats: number;
  seatsBooked: number;
  seatsReserved: number;
};

/** Booking is only allowed for events that are published, within the registration window, and not full. */
export function registrationWindow(event: EventLike, now = new Date()) {
  if (!["published", "registration_open"].includes(event.status)) {
    if (event.status === "full") return { open: false, reason: "This trip is fully booked." };
    if (event.status === "cancelled") return { open: false, reason: "This trip has been cancelled." };
    if (event.status === "completed") return { open: false, reason: "This trip has already been completed." };
    if (event.status === "draft") return { open: false, reason: "This trip is not published yet." };
    return { open: false, reason: "Registration is not open for this trip." };
  }
  if (event.registrationStartDate && now < new Date(event.registrationStartDate)) return { open: false, reason: "Registration has not opened yet." };
  if (event.registrationEndDate && now > new Date(event.registrationEndDate)) return { open: false, reason: "Registration for this trip has closed." };
  if (event.startDate && now > new Date(event.startDate)) return { open: false, reason: "This trip has already departed." };
  if (availableSeats(event.totalSeats, event.seatsBooked, event.seatsReserved) <= 0) return { open: false, reason: "This trip is fully booked." };
  return { open: true, reason: "" };
}

function buildAddonSelection(event: { photographyOptions?: unknown[]; filmmakingOptions?: unknown[] }, codes: string[]): AddonSummary[] {
  const pool = [...(event.photographyOptions ?? []), ...(event.filmmakingOptions ?? [])] as AddonSummary[];
  const map = new Map(pool.filter((addon) => addon.active !== false).map((addon) => [addon.code, addon]));
  const unique = Array.from(new Set(codes));
  const invalid = unique.filter((code) => !map.has(code));
  if (invalid.length) throw new BookingError(`These add-ons are not available for this trip: ${invalid.join(", ")}`, 422);
  return unique.map((code) => {
    const addon = map.get(code)!;
    return { addonId: String(addon._id ?? ""), code: addon.code, name: addon.name, kind: addon.kind, price: addon.price, perPerson: addon.perPerson };
  });
}

function computeAmounts(
  event: { pricePerPerson: number; childPricing?: { enabled?: boolean; price?: number } },
  input: { numberOfAdults: number; numberOfChildren: number; addons: AddonInput[]; discountAmount?: number }
) {
  return computeBookingAmounts({
    pricePerPerson: event.pricePerPerson,
    childPricingEnabled: Boolean(event.childPricing?.enabled),
    childPrice: event.childPricing?.price ?? 0,
    numberOfAdults: input.numberOfAdults,
    numberOfChildren: input.numberOfChildren,
    addons: input.addons,
    discountAmount: input.discountAmount,
    taxPercent: resolveTaxPercent(),
  });
}

export type RegistrationPayload = {
  numberOfAdults: number;
  numberOfChildren: number;
  travellers: Array<Record<string, unknown>>;
  addonCodes: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  captureConsent: boolean;
  marketingConsent: boolean;
  notes?: string;
};

/**
 * Step 1 of checkout: validate the request, atomically hold seats, create a pending
 * booking, and create the Razorpay order needed for collection.
 */
export async function createBookingHold(input: { tripEventId: string; customerId: string; payload: RegistrationPayload }) {
  await connectToDatabase();

  const event = await TripEvent.findById(input.tripEventId);
  if (!event) throw new BookingError("This trip could not be found.", 404);

  const window = registrationWindow(event as unknown as EventLike);
  if (!window.open) throw new BookingError(window.reason, 409);

  if (!razorpayConfigured()) throw new PaymentConfigError();

  const addons = buildAddonSelection(event as unknown as { photographyOptions?: unknown[]; filmmakingOptions?: unknown[] }, input.payload.addonCodes);
  const seats = input.payload.numberOfAdults + input.payload.numberOfChildren;
  const amounts = computeAmounts(event as unknown as { pricePerPerson: number; childPricing?: { enabled?: boolean; price?: number } }, {
    numberOfAdults: input.payload.numberOfAdults,
    numberOfChildren: input.payload.numberOfChildren,
    addons: addons.map((addon) => ({ code: addon.code, name: addon.name, price: addon.price, perPerson: addon.perPerson })),
  });

  const held = await holdSeats(event._id, seats);
  if (!held) throw new BookingError("Those seats were just taken. Please choose a smaller group or another departure.", 409);

  const bookingRef = bookingReference();
  let order: Record<string, unknown> | null = null;
  try {
    order = await createRazorpayOrder({
      amount: amounts.totalAmount,
      receipt: bookingRef,
      notes: { tripEventId: String(event._id), bookingReference: bookingRef, customerId: input.customerId },
    });
  } catch (error) {
    await releaseHeldSeats(event._id, seats);
    throw error;
  }

  try {
    const booking = await TripBooking.create({
      bookingReference: bookingRef,
      tripEventId: event._id,
      customerId: input.customerId,
      travellerDetails: input.payload.travellers,
      numberOfAdults: input.payload.numberOfAdults,
      numberOfChildren: input.payload.numberOfChildren,
      selectedAddons: addons,
      ...amounts,
      paymentStatus: "pending",
      bookingStatus: "pending_payment",
      holdExpiresAt: new Date(Date.now() + resolveHoldMs()),
      contactName: input.payload.contactName,
      contactEmail: input.payload.contactEmail,
      contactPhone: input.payload.contactPhone,
      notes: input.payload.notes,
      priceSnapshot: {
        pricePerPerson: event.pricePerPerson,
        childPrice: event.childPricing?.price ?? 0,
        childPricingEnabled: Boolean(event.childPricing?.enabled),
        taxPercent: resolveTaxPercent(),
      },
      tripSnapshot: {
        title: event.title,
        slug: event.slug,
        destination: event.destination,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      mediaConsent: { captureConsent: input.payload.captureConsent, marketingConsent: input.payload.marketingConsent },
      source: "customer",
      statusHistory: [{ status: "pending_payment", at: new Date(), note: "Checkout started" }],
    });

    await Payment.create({
      bookingId: booking._id,
      tripEventId: event._id,
      customerId: input.customerId,
      provider: "razorpay",
      orderId: String(order.id),
      amount: amounts.totalAmount,
      currency: "INR",
      status: "created",
    });

    await recordAudit({
      userId: input.customerId,
      action: "booking.hold_created",
      module: "bookings",
      recordId: String(booking._id),
      description: `Seat hold created for ${seats} traveller(s) on ${event.title}`,
      metadata: { seats, orderId: order.id, totalAmount: amounts.totalAmount },
    });

    return {
      booking,
      order: { id: String(order.id), amount: amounts.totalAmount, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID },
      amounts,
    };
  } catch (error) {
    await releaseHeldSeats(event._id, seats);
    throw error;
  }
}

async function verifyGatewayStatus(paymentId: string) {
  try {
    const gateway = (await fetchRazorpayPayment(paymentId)) as { status?: string; method?: string };
    return gateway;
  } catch {
    // Network/gateway unreachable — signature verification remains the source of truth.
    return null;
  }
}

/**
 * Step 2 of checkout: confirm a booking once the payment is verified.
 * Idempotent — replaying the same order/gateway event never double-confirms or double-counts seats.
 */
export async function confirmBookingPayment(input: {
  orderId: string;
  paymentId: string;
  signature?: string;
  gatewayEventId?: string;
  rawPayload?: unknown;
  source: "checkout" | "webhook";
}) {
  await connectToDatabase();

  const payment = await Payment.findOne({ orderId: input.orderId });
  if (!payment) throw new BookingError("No payment record found for this order.", 404);

  if (payment.status === "paid") {
    const existing = await TripBooking.findById(payment.bookingId);
    return { booking: existing, alreadyProcessed: true };
  }

  if (input.source === "checkout") {
    const valid = verifyPaymentSignature({ orderId: input.orderId, paymentId: input.paymentId, signature: input.signature ?? "" });
    if (!valid) {
      payment.status = "failed";
      payment.failureReason = "Signature verification failed";
      await payment.save();
      throw new BookingError("Payment signature verification failed. The booking was not confirmed.", 400);
    }
  }

  if (input.gatewayEventId) {
    const duplicate = await Payment.findOne({ gatewayEventId: input.gatewayEventId, _id: { $ne: payment._id } }).lean();
    if (duplicate) return { booking: await TripBooking.findById(payment.bookingId), alreadyProcessed: true };
  }

  const gateway = await verifyGatewayStatus(input.paymentId);
  if (gateway?.status && ["failed", "cancelled"].includes(gateway.status)) {
    payment.status = "failed";
    payment.failureReason = `Gateway reported status: ${gateway.status}`;
    await payment.save();
    throw new BookingError("The payment was not successful.", 402);
  }

  const booking = await TripBooking.findById(payment.bookingId);
  if (!booking) throw new BookingError("The booking linked to this payment no longer exists.", 404);

  const seats = booking.numberOfAdults + booking.numberOfChildren;

  payment.status = "paid";
  payment.paymentId = input.paymentId;
  payment.signature = input.signature;
  payment.method = gateway?.method;
  payment.receiptNumber = receiptNumber(input.paymentId);
  payment.gatewayEventId = input.gatewayEventId;
  payment.verifiedAt = new Date();
  payment.rawPayload = input.rawPayload as Record<string, unknown> | undefined;
  await payment.save();

  if (booking.bookingStatus === "pending_payment") {
    await confirmHeldSeats(booking.tripEventId, seats);
  }
  booking.bookingStatus = "confirmed";
  booking.paymentStatus = "paid";
  booking.amountPaid = booking.totalAmount;
  booking.paymentReference = input.paymentId;
  booking.holdExpiresAt = undefined;
  booking.statusHistory.push({ status: "confirmed", at: new Date(), note: `Payment ${input.paymentId} verified` });
  await booking.save();

  await CustomerConsent.findOneAndUpdate(
    { bookingId: booking._id },
    {
      customerId: booking.customerId,
      tripEventId: booking.tripEventId,
      photographyAndFilming: booking.mediaConsent?.captureConsent ?? false,
      marketingUse: booking.mediaConsent?.marketingConsent ?? false,
      consentScope: "trip booking",
      consentedAt: new Date(),
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await ensureMediaProject(booking);

  await Notification.create({
    userId: booking.customerId,
    tripEventId: booking.tripEventId,
    bookingId: booking._id,
    type: "booking",
    title: "Booking confirmed",
    message: `Your booking ${booking.bookingReference} is confirmed. We cannot wait to travel with you.`,
  });

  await recordAudit({
    action: "booking.confirmed",
    module: "bookings",
    recordId: String(booking._id),
    description: `Booking ${booking.bookingReference} confirmed after verified payment ${input.paymentId}`,
    metadata: { source: input.source, orderId: input.orderId },
  });

  return { booking, alreadyProcessed: false };
}

async function ensureMediaProject(booking: {
  _id: unknown;
  tripEventId: unknown;
  customerId?: unknown;
  bookingReference: string;
  selectedAddons: AddonSummary[];
  tripSnapshot?: { title?: string; startDate?: Date; endDate?: Date };
}) {
  if (!booking.customerId) return null;
  const hasPhotography = booking.selectedAddons.some((addon) => addon.kind === "photography");
  const hasFilmmaking = booking.selectedAddons.some((addon) => addon.kind === "filmmaking");
  if (!hasPhotography && !hasFilmmaking) return null;

  const existing = await MediaProject.findOne({ bookingId: booking._id }).lean();
  if (existing) return existing;

  const event = await TripEvent.findById(booking.tripEventId).select("assignedCrew").lean();
  const projectType = hasPhotography && hasFilmmaking ? "both" : hasPhotography ? "photography" : "filmmaking";

  return MediaProject.create({
    bookingId: booking._id,
    tripEventId: booking.tripEventId,
    customerId: booking.customerId,
    projectTitle: `${booking.tripSnapshot?.title ?? "Trip"} — ${booking.bookingReference}`,
    projectType,
    assignedPhotographer: event?.assignedCrew?.photographers?.[0],
    assignedVideographer: event?.assignedCrew?.videographers?.[0],
    assignedEditor: event?.assignedCrew?.editors?.[0],
    travelStartDate: booking.tripSnapshot?.startDate,
    travelEndDate: booking.tripSnapshot?.endDate,
    deliverables: booking.selectedAddons.map((addon) => ({ code: addon.code, name: addon.name, kind: addon.kind })),
    projectStatus: "not_started",
  });
}

/** Cancel a registration and free its seats. Does not move money — use refundBooking for that. */
export async function cancelBooking(input: { bookingId: string; actorId?: string; reason?: string; byAdmin?: boolean }) {
  await connectToDatabase();
  const booking = await TripBooking.findById(input.bookingId);
  if (!booking) throw new BookingError("Booking not found.", 404);
  if (["cancelled", "refunded"].includes(booking.bookingStatus)) return booking;

  const seats = booking.numberOfAdults + booking.numberOfChildren;
  if (booking.bookingStatus === "pending_payment") {
    await releaseHeldSeats(booking.tripEventId, seats);
  } else {
    await releaseBookedSeats(booking.tripEventId, seats);
  }

  booking.bookingStatus = "cancelled";
  booking.holdExpiresAt = undefined;
  booking.statusHistory.push({ status: "cancelled", at: new Date(), by: input.actorId as never, note: input.reason || (input.byAdmin ? "Cancelled by admin" : "Cancelled") });
  await booking.save();

  await Payment.updateMany({ bookingId: booking._id, status: "created" }, { status: "failed", failureReason: "Booking cancelled before payment" });

  await Notification.create({
    userId: booking.customerId,
    tripEventId: booking.tripEventId,
    bookingId: booking._id,
    type: "booking",
    title: "Booking cancelled",
    message: `Booking ${booking.bookingReference} has been cancelled. ${input.reason ?? ""}`.trim(),
  });

  await recordAudit({
    userId: input.actorId,
    action: "booking.cancelled",
    module: "bookings",
    recordId: String(booking._id),
    description: `Booking ${booking.bookingReference} cancelled`,
    metadata: { reason: input.reason, byAdmin: Boolean(input.byAdmin), seats },
  });

  return booking;
}

/** Refund money through Razorpay and free the seats. Requires gateway credentials. */
export async function refundBooking(input: { bookingId: string; amount?: number; reason?: string; actorId?: string }) {
  await connectToDatabase();
  const booking = await TripBooking.findById(input.bookingId);
  if (!booking) throw new BookingError("Booking not found.", 404);

  const payment = await Payment.findOne({ bookingId: booking._id, status: "paid" });
  if (!payment || !payment.paymentId) throw new BookingError("No captured payment found to refund for this booking.", 409);

  const amount = roundCurrency(Math.min(input.amount ?? payment.amount, payment.amount - booking.amountRefunded));
  if (amount <= 0) throw new BookingError("Nothing left to refund for this booking.", 409);
  if (!razorpayConfigured()) throw new PaymentConfigError();

  const refund = (await createRazorpayRefund({
    paymentId: payment.paymentId,
    amount,
    notes: { bookingReference: booking.bookingReference, reason: input.reason ?? "Cancellation" },
  })) as { id: string };

  payment.refunds.push({ refundId: refund.id, amount, reason: input.reason, status: "processed", processedBy: input.actorId as never });
  const totalRefunded = roundCurrency(booking.amountRefunded + amount);
  payment.status = totalRefunded >= payment.amount ? "refunded" : "partially_refunded";
  await payment.save();

  if (booking.bookingStatus !== "cancelled") {
    const seats = booking.numberOfAdults + booking.numberOfChildren;
    await releaseBookedSeats(booking.tripEventId, seats);
    booking.bookingStatus = "refunded";
  }
  booking.amountRefunded = totalRefunded;
  booking.paymentStatus = totalRefunded >= booking.amountPaid ? "refunded" : "partially_paid";
  booking.statusHistory.push({ status: "refunded", at: new Date(), by: input.actorId as never, note: input.reason || `Refund ${refund.id}` });
  await booking.save();

  await Notification.create({
    userId: booking.customerId,
    tripEventId: booking.tripEventId,
    bookingId: booking._id,
    type: "payment",
    title: "Refund processed",
    message: `A refund of ₹${amount} for booking ${booking.bookingReference} has been processed.`,
  });

  await recordAudit({
    userId: input.actorId,
    action: "payment.refunded",
    module: "payments",
    recordId: String(payment._id),
    description: `Refund ${refund.id} of ₹${amount} for ${booking.bookingReference}`,
    metadata: { refundId: refund.id, amount },
  });

  return { booking, refundId: refund.id, amount };
}

/** Admin-authorised manual registration. Records an audit entry and can be confirmed instantly. */
export async function createManualBooking(input: {
  tripEventId: string;
  actorId: string;
  payload: RegistrationPayload & { discountAmount?: number; confirmImmediately?: boolean };
}) {
  await connectToDatabase();
  const event = await TripEvent.findById(input.tripEventId);
  if (!event) throw new BookingError("This trip could not be found.", 404);
  if (["cancelled", "completed"].includes(event.status)) throw new BookingError("This trip is closed for registration.", 409);

  const addons = buildAddonSelection(event as unknown as { photographyOptions?: unknown[]; filmmakingOptions?: unknown[] }, input.payload.addonCodes);
  const seats = input.payload.numberOfAdults + input.payload.numberOfChildren;
  const amounts = computeAmounts(event as unknown as { pricePerPerson: number; childPricing?: { enabled?: boolean; price?: number } }, {
    numberOfAdults: input.payload.numberOfAdults,
    numberOfChildren: input.payload.numberOfChildren,
    addons: addons.map((addon) => ({ code: addon.code, name: addon.name, price: addon.price, perPerson: addon.perPerson })),
    discountAmount: input.payload.discountAmount,
  });

  const held = await holdSeats(event._id, seats);
  if (!held) throw new BookingError("Not enough seats available for this registration.", 409);

  const confirmNow = input.payload.confirmImmediately !== false;
  const linkedCustomer = input.payload.contactEmail
    ? await User.findOne({ email: input.payload.contactEmail.toLowerCase() }).select("_id").lean()
    : null;

  try {
    const booking = await TripBooking.create({
      bookingReference: bookingReference(),
      tripEventId: event._id,
      customerId: linkedCustomer?._id,
      travellerDetails: input.payload.travellers,
      numberOfAdults: input.payload.numberOfAdults,
      numberOfChildren: input.payload.numberOfChildren,
      selectedAddons: addons,
      ...amounts,
      paymentStatus: "pending",
      bookingStatus: confirmNow ? "confirmed" : "pending_payment",
      holdExpiresAt: confirmNow ? undefined : new Date(Date.now() + resolveHoldMs()),
      contactName: input.payload.contactName,
      contactEmail: input.payload.contactEmail,
      contactPhone: input.payload.contactPhone,
      notes: input.payload.notes,
      priceSnapshot: {
        pricePerPerson: event.pricePerPerson,
        childPrice: event.childPricing?.price ?? 0,
        childPricingEnabled: Boolean(event.childPricing?.enabled),
        taxPercent: resolveTaxPercent(),
      },
      tripSnapshot: { title: event.title, slug: event.slug, destination: event.destination, startDate: event.startDate, endDate: event.endDate },
      mediaConsent: { captureConsent: input.payload.captureConsent ?? false, marketingConsent: input.payload.marketingConsent ?? false },
      source: "admin",
      statusHistory: [{ status: confirmNow ? "confirmed" : "pending_payment", at: new Date(), by: input.actorId as never, note: "Manually registered by admin" }],
    });

    if (confirmNow) await confirmHeldSeats(event._id, seats);

    await recordAudit({
      userId: input.actorId,
      action: "booking.manual_created",
      module: "bookings",
      recordId: String(booking._id),
      description: `Manual registration ${booking.bookingReference} created for ${event.title}`,
      metadata: { seats, totalAmount: amounts.totalAmount, confirmed: confirmNow },
    });

    return booking;
  } catch (error) {
    await releaseHeldSeats(event._id, seats);
    throw error;
  }
}

/** Record money collected outside the gateway (cash/UPI/bank) with a full audit trail. */
export async function recordManualPayment(input: { bookingId: string; amount: number; method: string; reference?: string; actorId: string }) {
  await connectToDatabase();
  const booking = await TripBooking.findById(input.bookingId);
  if (!booking) throw new BookingError("Booking not found.", 404);
  if (input.amount <= 0) throw new BookingError("Payment amount must be greater than zero.", 422);

  const orderId = `manual_${booking.bookingReference}_${Date.now()}`;
  await Payment.create({
    bookingId: booking._id,
    tripEventId: booking.tripEventId,
    customerId: booking.customerId,
    provider: "manual",
    orderId,
    paymentId: input.reference || orderId,
    amount: roundCurrency(input.amount),
    currency: "INR",
    status: "paid",
    method: input.method,
    receiptNumber: receiptNumber(orderId),
    verifiedAt: new Date(),
  });

  const paid = roundCurrency(booking.amountPaid + input.amount);
  booking.amountPaid = paid;
  booking.paymentStatus = paid >= booking.totalAmount ? "paid" : "partially_paid";

  if (booking.bookingStatus === "pending_payment") {
    const seats = booking.numberOfAdults + booking.numberOfChildren;
    await confirmHeldSeats(booking.tripEventId, seats);
    booking.bookingStatus = "confirmed";
    booking.holdExpiresAt = undefined;
  }
  booking.statusHistory.push({ status: "payment_recorded", at: new Date(), by: input.actorId as never, note: `${input.method} payment of ₹${input.amount}` });
  await booking.save();

  await ensureMediaProject(booking);

  await recordAudit({
    userId: input.actorId,
    action: "payment.recorded",
    module: "payments",
    recordId: String(booking._id),
    description: `Manual ${input.method} payment of ₹${input.amount} recorded for ${booking.bookingReference}`,
    metadata: { amount: input.amount, method: input.method, reference: input.reference },
  });

  return booking;
}

/** Release holds whose checkout window has elapsed. Safe to call on any request. */
export async function releaseExpiredHolds(limit = 100) {
  await connectToDatabase();
  const expired = await TripBooking.find({ bookingStatus: "pending_payment", holdExpiresAt: { $lt: new Date() } })
    .limit(limit)
    .select("_id tripEventId numberOfAdults numberOfChildren bookingReference");

  for (const booking of expired) {
    const seats = booking.numberOfAdults + booking.numberOfChildren;
    await releaseHeldSeats(booking.tripEventId, seats);
    await TripBooking.updateOne(
      { _id: booking._id, bookingStatus: "pending_payment" },
      { bookingStatus: "cancelled", $push: { statusHistory: { status: "cancelled", at: new Date(), note: "Seat hold expired before payment" } } }
    );
    await Payment.updateMany({ bookingId: booking._id, status: "created" }, { status: "failed", failureReason: "Seat hold expired before payment" });
  }
  return expired.length;
}
