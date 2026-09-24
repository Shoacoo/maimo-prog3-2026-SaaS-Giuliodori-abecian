import Image from "next/image";
import { totalTripDays, formatDateRange } from "@/lib/trips/dates";
import { getFlagUrl } from "@/lib/countries/flags";
import BackLink from "@/components/dashboard/BackLink";

export default function TripHero({ trip, subtitle }) {
  const heroImage = trip.destinations[0]?.image;
  const days = totalTripDays(trip.startDate, trip.endDate);

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
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-white/90">{subtitle}</p>
        ) : (
          <p className="mt-2 flex flex-wrap items-center gap-3 text-white/90">
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <span>{days} {days === 1 ? "dia" : "dias"}</span>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <span>{trip.destinations.length} {trip.destinations.length === 1 ? "ciudad" : "ciudades"}</span>
          </p>
        )}
      </div>
    </div>
  );
}
