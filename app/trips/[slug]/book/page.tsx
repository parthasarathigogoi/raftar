import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import { currentUser } from "@/lib/auth";
import { getPublicTripBySlug, type PublicTrip } from "@/lib/trips";
import { tripAvailability, type TripMediaAddon } from "@/lib/trip-status";
import { getRazorpayPublicConfig } from "@/lib/razorpay";
import { resolveTaxPercent } from "@/lib/booking-service";
import BookFlow from "./book-flow";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanAddons(addons: Array<Record<string, unknown>>): TripMediaAddon[] {
  return (addons ?? []).map((addon) => ({
    code: String(addon.code ?? ""),
    name: String(addon.name ?? ""),
    kind: String(addon.kind ?? "photography"),
    description: String(addon.description ?? ""),
    price: Number(addon.price ?? 0),
    perPerson: Boolean(addon.perPerson),
  }));
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const { slug } = await params;
  const query = await searchParams;

  let trip: PublicTrip | null = null;
  let loadError = false;
  try {
    trip = await getPublicTripBySlug(slug);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <main className="book-page">
        <PublicNav tone="light" />
        <section className="shell empty-state" style={{ padding: "120px 0" }}>
          <AlertTriangle />
          <h2>This trip is temporarily unavailable.</h2>
          <p>We could not load the trip right now. Please try again shortly or browse all departures.</p>
          <Link className="btn btn-solid" href="/trips">
            Browse all trips
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!trip) notFound();

  const availability = tripAvailability(trip);
  const photography = cleanAddons(trip.photographyOptions);
  const filmmaking = cleanAddons(trip.filmmakingOptions);
  const signedIn = Boolean(await currentUser().catch(() => null));
  const razorpay = getRazorpayPublicConfig();

  const initialAdults = Math.max(1, Math.min(Number(single(query.adults) ?? "1") || 1, Math.max(1, trip.availableSeats)));
  const initialChildren = Math.max(0, Number(single(query.children) ?? "0") || 0);
  const initialAddons = (single(query.addons) ?? "").split(",").filter(Boolean);

  return (
    <main className="book-page">
      <PublicNav tone="light" />
      <BookFlow
        trip={{
          slug: trip.slug,
          title: trip.title,
          destination: trip.destination,
          coverImage: trip.coverImage,
          startDate: trip.startDate,
          endDate: trip.endDate,
          pricePerPerson: trip.pricePerPerson,
          childPricing: trip.childPricing,
          totalSeats: trip.totalSeats,
          availableSeats: trip.availableSeats,
          photographyOptions: photography,
          filmmakingOptions: filmmaking,
        }}
        availability={availability}
        taxPercent={resolveTaxPercent()}
        razorpayConfigured={razorpay.configured}
        signedIn={signedIn}
        initialAdults={initialAdults}
        initialChildren={initialChildren}
        initialAddons={initialAddons}
        loginHref={`/login?next=${encodeURIComponent(`/trips/${trip.slug}/book`)}`}
      />
      <SiteFooter />
    </main>
  );
}
