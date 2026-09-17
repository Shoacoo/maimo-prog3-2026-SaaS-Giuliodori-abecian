import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { totalTripDays, formatDateRange, distributeDays, computeStopDateRanges, daysUntil } from "@/lib/trips/dates";
import { getFlagUrl } from "@/lib/countries/flags";
import TripStepper from "@/components/trips/TripStepper";
import GoogleMap from "@/components/map/GoogleMap";
import BackLink from "@/components/dashboard/BackLink";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trip = await getUserTrip(user.uid, id);

  if (!trip) {
    notFound();
  }

  const days = totalTripDays(trip.startDate, trip.endDate);
  const heroImage = trip.destinations[0]?.image;

  const dayCounts = distributeDays(days, trip.destinations.length);
  const stopRanges = computeStopDateRanges(trip.startDate, dayCounts);
  const today = new Date().toISOString().slice(0, 10);
  const nextIndex = stopRanges.findIndex((range) => range.endDate >= today);
  const nextStop = nextIndex >= 0 ? trip.destinations[nextIndex] : null;
  const nextDestination = nextStop
    ? {
        index: nextIndex,
        name: nextStop.name,
        image: nextStop.image,
        flagUrl: getFlagUrl(nextStop.countryCode, nextStop.country),
        daysUntil: daysUntil(today, stopRanges[nextIndex].startDate),
      }
    : null;

  const countryFlags = [];
  const seenCountries = new Set();
  for (const destination of trip.destinations) {
    const key = destination.countryCode || destination.country;
    const flagUrl = getFlagUrl(destination.countryCode, destination.country);
    if (key && flagUrl && !seenCountries.has(key)) {
      seenCountries.add(key);
      countryFlags.push({ key, flagUrl, country: destination.country });
    }
  }

  return (
    <div className="flex">
      <SetTripPill id={trip.id} name={trip.name} />

      <div className="flex-1">
        <div className="relative h-80 w-full bg-gray-100 sm:h-96">
          {heroImage ? (
            <Image src={heroImage} alt={trip.name} fill sizes="1200px" priority className="object-cover" />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/70 to-transparent" />

          <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
            <BackLink href="/dashboard/trips" variant="overlay" />
          </div>

          <div className="absolute bottom-6 left-8 right-8 sm:bottom-8 sm:left-12">
            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold text-white sm:text-4xl">
              {trip.name}
              {countryFlags.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  {countryFlags.map((flag) => (
                    <span key={flag.key} className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white/70">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flag.flagUrl} alt={flag.country} className="h-full w-full object-cover" />
                    </span>
                  ))}
                </span>
              ) : null}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-white/90">
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white/70" />
              <span>{days} {days === 1 ? "dia" : "dias"}</span>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white/70" />
              <span>{trip.destinations.length} {trip.destinations.length === 1 ? "ciudad" : "ciudades"}</span>
            </p>
          </div>
        </div>

        <div className="px-8 py-10 pb-32 sm:px-12">
          <TripStepper tripId={trip.id} stops={trip.destinations} />

          <Link
            href="/dashboard/proximamente"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#7386f5] px-6 text-sm font-semibold text-white transition hover:bg-[#5f70e0]"
          >
            <ListIcon />
            Ver todo el itinerario
            <ChevronRightIcon />
          </Link>
        </div>
      </div>

      <div className="sticky top-0 hidden h-screen w-96 shrink-0 border-l border-gray-100 lg:block xl:w-120">
        <GoogleMap
          className="h-full w-full"
          zoom={4}
          rounded={false}
          showNearbyPlaces
          nextDestination={nextDestination}
          markers={trip.destinations.map((destination) => ({
            lng: destination.lng,
            lat: destination.lat,
            label: destination.name,
          }))}
        />
      </div>
    </div>
  );
}
