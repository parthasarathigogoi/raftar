import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Camera, MapPin, UsersRound } from "lucide-react";
import { formatCurrency, formatDateRange, formatDuration } from "@/lib/format";
import { tripAvailability, type TripCardData } from "@/lib/trip-status";

export default function TripCard({ trip }: { trip: TripCardData }) {
  const availability = tripAvailability(trip);
  const mediaAvailable = trip.photographyOptions.length > 0 || trip.filmmakingOptions.length > 0;

  return (
    <article className="trip-card">
      <Link href={`/trips/${trip.slug}`} className="trip-card-image">
        {trip.coverImage ? (
          <Image src={trip.coverImage} alt={trip.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
        ) : (
          <span className="trip-card-placeholder" />
        )}
        <span className="image-wash" />
        <span className={`trip-state ${availability.state}`}>{availability.label}</span>
        {trip.featured && <span className="trip-flag">Featured</span>}
      </Link>

      <div className="trip-card-body">
        <p className="trip-destination">
          <MapPin /> {trip.destination}
        </p>
        <h3>
          <Link href={`/trips/${trip.slug}`}>{trip.title}</Link>
        </h3>
        {trip.shortDescription && <p className="trip-card-copy">{trip.shortDescription}</p>}

        <div className="trip-meta">
          <span>
            <CalendarDays /> {formatDateRange(trip.startDate, trip.endDate)}
          </span>
          <span>{formatDuration(trip.startDate, trip.endDate)}</span>
          <span>
            <UsersRound /> {trip.availableSeats} of {trip.totalSeats} seats left
          </span>
          {mediaAvailable && (
            <span>
              <Camera /> Photo & film available
            </span>
          )}
        </div>

        <div className="trip-card-foot">
          <span className="trip-price">
            {formatCurrency(trip.pricePerPerson)} <i>/ person</i>
          </span>
          <Link className="button button-forest" href={`/trips/${trip.slug}`}>
            View details <ArrowUpRight />
          </Link>
        </div>
      </div>
    </article>
  );
}
