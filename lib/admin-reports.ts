import { connectToDatabase } from "@/lib/db";
import { roundCurrency } from "@/lib/booking-math";
import { Expense } from "@/models/Expense";
import { Payment } from "@/models/Payment";
import { TripBooking } from "@/models/TripBooking";
import { TripEvent } from "@/models/TripEvent";
import { User } from "@/models/User";

const PUBLIC_STATUSES = ["published", "registration_open", "full"];

/**
 * Headline numbers for the admin dashboard. Every figure is derived from live
 * records — nothing is estimated or seeded.
 */
export async function dashboardStats() {
  await connectToDatabase();
  const now = new Date();

  const [publishedTrips, upcomingTrips, openRegistrations] = await Promise.all([
    TripEvent.countDocuments({ status: { $in: PUBLIC_STATUSES } }),
    TripEvent.countDocuments({ status: { $in: PUBLIC_STATUSES }, startDate: { $gte: now } }),
    TripEvent.countDocuments({
      status: { $in: ["published", "registration_open"] },
      startDate: { $gte: now },
      $and: [
        { $or: [{ registrationStartDate: { $exists: false } }, { registrationStartDate: null }, { registrationStartDate: { $lte: now } }] },
        { $or: [{ registrationEndDate: { $exists: false } }, { registrationEndDate: null }, { registrationEndDate: { $gte: now } }] },
      ],
    }),
  ]);

  const [participantAgg, confirmedBookings, pendingPayments, revenueAgg, expenseAgg, seatAgg] = await Promise.all([
    TripBooking.aggregate([
      { $match: { bookingStatus: { $in: ["confirmed", "completed"] } } },
      { $group: { _id: null, total: { $sum: { $add: ["$numberOfAdults", "$numberOfChildren"] } } } },
    ]),
    TripBooking.countDocuments({ bookingStatus: "confirmed" }),
    TripBooking.countDocuments({ paymentStatus: { $in: ["pending", "partially_paid"] }, bookingStatus: { $nin: ["cancelled", "refunded"] } }),
    TripBooking.aggregate([
      { $group: { _id: null, paid: { $sum: "$amountPaid" }, refunded: { $sum: "$amountRefunded" } } },
    ]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    TripEvent.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSeats" },
          booked: { $sum: "$seatsBooked" },
          reserved: { $sum: "$seatsReserved" },
        },
      },
    ]),
  ]);

  const totalParticipants = participantAgg[0]?.total ?? 0;
  const collected = roundCurrency((revenueAgg[0]?.paid ?? 0) - (revenueAgg[0]?.refunded ?? 0));
  const expenses = roundCurrency(expenseAgg[0]?.total ?? 0);
  const seats = seatAgg[0] ?? { total: 0, booked: 0, reserved: 0 };

  return {
    publishedTrips,
    upcomingTrips,
    openRegistrations,
    totalParticipants,
    confirmedBookings,
    pendingPayments,
    availableSeats: Math.max(0, (seats.total ?? 0) - (seats.booked ?? 0) - (seats.reserved ?? 0)),
    totalRevenue: collected,
    totalExpenses: expenses,
    estimatedProfit: roundCurrency(collected - expenses),
  };
}

/** Revenue, expenses and profit, overall and broken down per trip event. */
export async function financeSummary() {
  await connectToDatabase();

  const [revenueAgg, expenseAgg] = await Promise.all([
    TripBooking.aggregate([{ $group: { _id: null, paid: { $sum: "$amountPaid" }, refunded: { $sum: "$amountRefunded" } } }]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  const revenue = roundCurrency((revenueAgg[0]?.paid ?? 0) - (revenueAgg[0]?.refunded ?? 0));
  const expenses = roundCurrency(expenseAgg[0]?.total ?? 0);

  const [events, bookingRows, expenseRows] = await Promise.all([
    TripEvent.find().sort({ startDate: -1 }).select("title slug startDate status").lean(),
    TripBooking.aggregate([{ $group: { _id: "$tripEventId", paid: { $sum: "$amountPaid" }, refunded: { $sum: "$amountRefunded" } } }]),
    Expense.aggregate([{ $group: { _id: "$tripEventId", total: { $sum: "$amount" } } }]),
  ]);

  const bookingMap = new Map(bookingRows.map((row) => [String(row._id), row]));
  const expenseMap = new Map(expenseRows.map((row) => [String(row._id ?? "none"), row.total]));

  const perTrip = events.map((event) => {
    const booking = bookingMap.get(String(event._id));
    const collected = roundCurrency((booking?.paid ?? 0) - (booking?.refunded ?? 0));
    const tripExpenses = roundCurrency(expenseMap.get(String(event._id)) ?? 0);
    return {
      tripEventId: String(event._id),
      title: event.title,
      slug: event.slug,
      startDate: event.startDate,
      status: event.status,
      collected,
      expenses: tripExpenses,
      profit: roundCurrency(collected - tripExpenses),
    };
  });

  const unallocatedExpenses = roundCurrency(expenseMap.get("none") ?? 0);

  return {
    revenue,
    expenses,
    profit: roundCurrency(revenue - expenses),
    unallocatedExpenses,
    perTrip,
  };
}

/** Customer directory with booking rollups. */
export async function listCustomers(options: { search?: string; limit?: number } = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { role: "customer" };
  if (options.search) {
    const pattern = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const customers = await User.find(filter).sort({ createdAt: -1 }).limit(options.limit ?? 200).select("name email phone role status createdAt").lean();
  const ids = customers.map((customer) => customer._id);

  const rollups = await TripBooking.aggregate([
    { $match: { customerId: { $in: ids } } },
    {
      $group: {
        _id: "$customerId",
        bookings: { $sum: 1 },
        confirmed: { $sum: { $cond: [{ $eq: ["$bookingStatus", "confirmed"] }, 1, 0] } },
        collected: { $sum: "$amountPaid" },
        refunded: { $sum: "$amountRefunded" },
      },
    },
  ]);
  const rollupMap = new Map(rollups.map((row) => [String(row._id), row]));

  return customers.map((customer) => {
    const rollup = rollupMap.get(String(customer._id));
    return {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? null,
      status: customer.status,
      createdAt: customer.createdAt,
      bookings: rollup?.bookings ?? 0,
      confirmedBookings: rollup?.confirmed ?? 0,
      lifetimeValue: roundCurrency((rollup?.collected ?? 0) - (rollup?.refunded ?? 0)),
    };
  });
}

/** All payment transactions with booking + traveller context for reconciliation. */
export async function listPayments(options: { status?: string; search?: string; limit?: number } = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (options.status) filter.status = options.status;
  if (options.search) {
    const pattern = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ orderId: pattern }, { paymentId: pattern }, { receiptNumber: pattern }];
  }

  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 200)
    .populate({ path: "bookingId", select: "bookingReference contactName contactEmail" })
    .lean();

  return payments.map((payment) => {
    const booking = payment.bookingId && typeof payment.bookingId === "object" ? (payment.bookingId as Record<string, any>) : null;
    return {
      id: String(payment._id),
      provider: payment.provider,
      orderId: payment.orderId,
      paymentId: payment.paymentId ?? null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method ?? null,
      receiptNumber: payment.receiptNumber ?? null,
      refunds: payment.refunds ?? [],
      bookingId: booking ? String(booking._id) : null,
      bookingReference: booking?.bookingReference ?? null,
      contactName: booking?.contactName ?? null,
      contactEmail: booking?.contactEmail ?? null,
      verifiedAt: payment.verifiedAt ?? null,
      createdAt: payment.createdAt,
    };
  });
}
