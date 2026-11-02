import { connectToDatabase } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { BookingError } from "@/lib/booking-errors";
import { availableSeats } from "@/lib/booking-math";
import { uniqueTripSlug } from "@/lib/trips";
import { TripEvent } from "@/models/TripEvent";
import type { TripEventInput } from "@/schemas/tripEvent";

type AnyRecord = Record<string, any>;

export function adminTripDto(event: AnyRecord) {
  const obj = typeof event?.toObject === "function" ? event.toObject() : event;
  return {
    ...obj,
    id: String(obj._id),
    availableSeats: availableSeats(obj.totalSeats, obj.seatsBooked, obj.seatsReserved),
  };
}

/** Ride-sharing form fields arrive as "" for empty optional dates; normalise to undefined. */
function normaliseDates(input: AnyRecord) {
  for (const key of ["registrationStartDate", "registrationEndDate"]) {
    if (input[key] === "" || input[key] === null) input[key] = undefined;
  }
  return input;
}

export async function createTripEvent(input: TripEventInput, actorId: string) {
  await connectToDatabase();
  const data = normaliseDates({ ...input });
  const slug = await uniqueTripSlug(data.slug || data.title);
  const event = await TripEvent.create({
    ...data,
    slug,
    createdBy: actorId,
    publishedAt: ["published", "registration_open"].includes(data.status) ? new Date() : undefined,
  });
  await recordAudit({ userId: actorId, action: "trip.created", module: "trip_events", recordId: String(event._id), description: `Trip event "${event.title}" created`, metadata: { status: event.status } });
  return event;
}

export async function updateTripEvent(id: string, input: Partial<TripEventInput>, actorId: string) {
  await connectToDatabase();
  const event = await TripEvent.findById(id);
  if (!event) throw new BookingError("Trip event not found.", 404);

  const data = normaliseDates({ ...input });
  if (data.slug && data.slug !== event.slug) data.slug = await uniqueTripSlug(data.slug, id);
  if (data.status && ["published", "registration_open"].includes(data.status) && !event.publishedAt) event.publishedAt = new Date();

  Object.assign(event, data);
  await event.save();
  await recordAudit({ userId: actorId, action: "trip.updated", module: "trip_events", recordId: id, description: `Trip event "${event.title}" updated`, metadata: { fields: Object.keys(data) } });
  return event;
}

export async function deleteTripEvent(id: string, actorId: string) {
  await connectToDatabase();
  const event = await TripEvent.findByIdAndDelete(id);
  if (!event) throw new BookingError("Trip event not found.", 404);
  await recordAudit({ userId: actorId, action: "trip.deleted", module: "trip_events", recordId: id, description: `Trip event "${event.title}" deleted` });
}

export async function duplicateTripEvent(id: string, actorId: string) {
  await connectToDatabase();
  const event = await TripEvent.findById(id).lean();
  if (!event) throw new BookingError("Trip event not found.", 404);

  const { _id, createdAt, updatedAt, slug, publishedAt, seatsBooked, seatsReserved, ...rest } = event as AnyRecord;
  const title = `${rest.title} (copy)`;
  const copy = await TripEvent.create({
    ...rest,
    title,
    slug: await uniqueTripSlug(`${rest.title}-copy`),
    status: "draft",
    createdBy: actorId,
  });
  await recordAudit({ userId: actorId, action: "trip.duplicated", module: "trip_events", recordId: String(copy._id), description: `Trip event "${rest.title}" duplicated`, metadata: { sourceId: id } });
  return copy;
}

export type TripAction = "publish" | "unpublish" | "open_registration" | "close_registration" | "cancel" | "complete";

export async function applyTripAction(id: string, action: TripAction, actorId: string) {
  await connectToDatabase();
  const event = await TripEvent.findById(id);
  if (!event) throw new BookingError("Trip event not found.", 404);

  switch (action) {
    case "publish":
      event.status = "published";
      event.publishedAt = event.publishedAt ?? new Date();
      break;
    case "unpublish":
      event.status = "draft";
      break;
    case "open_registration":
      if (event.status === "cancelled" || event.status === "completed") throw new BookingError("A cancelled or completed trip cannot be reopened.", 409);
      if (availableSeats(event.totalSeats, event.seatsBooked, event.seatsReserved) <= 0) throw new BookingError("This trip is full and cannot open registration.", 409);
      event.status = "registration_open";
      event.publishedAt = event.publishedAt ?? new Date();
      break;
    case "close_registration":
      event.status = "published";
      break;
    case "cancel":
      event.status = "cancelled";
      break;
    case "complete":
      event.status = "completed";
      break;
    default:
      throw new BookingError("Unknown action.", 422);
  }

  await event.save();
  await recordAudit({ userId: actorId, action: `trip.${action}`, module: "trip_events", recordId: id, description: `Trip event "${event.title}" set to ${event.status}`, metadata: { status: event.status } });
  return event;
}
