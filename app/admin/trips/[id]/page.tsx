import TripEventForm from "../trip-form";

export default async function EditTripEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripEventForm tripId={id} />;
}
