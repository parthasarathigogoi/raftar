import { TripEvent } from "@/models/TripEvent";
import { availableSeats } from "@/lib/booking-math";

/** Statuses in which a trip event can accept new registrations. */
export const BOOKABLE_STATUSES = ["published", "registration_open"] as const;

export async function getAvailableSeats(tripEventId: unknown) {
  const event = await TripEvent.findById(tripEventId).select("totalSeats seatsBooked seatsReserved").lean();
  if (!event) return null;
  return availableSeats(event.totalSeats, event.seatsBooked, event.seatsReserved);
}

/**
 * Atomically reserve seats for a checkout hold.
 * The filter uses `$expr` so MongoDB performs the capacity check and the increment
 * in a single document update, preventing two concurrent users from taking the same
 * final seat (no read-modify-write race).
 */
export async function holdSeats(tripEventId: unknown, seats: number) {
  if (seats <= 0) return null;
  return TripEvent.findOneAndUpdate(
    {
      _id: tripEventId,
      status: { $in: BOOKABLE_STATUSES },
      $expr: { $lte: [{ $add: ["$seatsBooked", "$seatsReserved", seats] }, "$totalSeats"] },
    },
    { $inc: { seatsReserved: seats } },
    { new: true }
  ).lean();
}

/** Release a temporary hold (expired or abandoned checkout). */
export async function releaseHeldSeats(tripEventId: unknown, seats: number) {
  if (seats <= 0) return;
  await TripEvent.updateOne({ _id: tripEventId, seatsReserved: { $gte: seats } }, { $inc: { seatsReserved: -seats } });
}

/** Promote held seats to confirmed seats after a verified payment. */
export async function confirmHeldSeats(tripEventId: unknown, seats: number) {
  if (seats <= 0) return;
  await TripEvent.updateOne(
    { _id: tripEventId, seatsReserved: { $gte: seats } },
    { $inc: { seatsReserved: -seats, seatsBooked: seats } }
  );
  await syncEventCapacity(tripEventId);
}

/** Release confirmed seats (admin cancellation or refund). */
export async function releaseBookedSeats(tripEventId: unknown, seats: number) {
  if (seats <= 0) return;
  await TripEvent.updateOne({ _id: tripEventId, seatsBooked: { $gte: seats } }, { $inc: { seatsBooked: -seats } });
  await syncEventCapacity(tripEventId);
}

/** Keep the `full` flag in step with inventory without touching admin-chosen statuses. */
export async function syncEventCapacity(tripEventId: unknown) {
  const event = await TripEvent.findById(tripEventId).select("totalSeats seatsBooked seatsReserved status").lean();
  if (!event || ["draft", "cancelled", "completed"].includes(event.status)) return;
  const remaining = availableSeats(event.totalSeats, event.seatsBooked, event.seatsReserved);
  if (remaining <= 0 && event.status !== "full") {
    await TripEvent.updateOne({ _id: tripEventId }, { status: "full" });
  } else if (remaining > 0 && event.status === "full") {
    await TripEvent.updateOne({ _id: tripEventId }, { status: "registration_open" });
  }
}
