import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { listUserTrips } from "@/lib/trips/trips";
import { formatDateRange, totalTripDays } from "@/lib/trips/dates";
import TripCard from "@/components/trips/TripCard";
import RouteFlags from "@/components/trips/RouteFlags";
import GoogleMap from "@/components/map/GoogleMap";

export const dynamic = "force-dynamic";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className="text-[#7386f5]">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className="text-[#7386f5]">
      <path
        d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StatTile({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#7386f5] px-6 py-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-[#7386f5]">
        {value}
      </span>
      <span className="text-sm font-medium text-white">{label}</span>
    </div>
  );
}

export default async function TripsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trips = await listUserTrips(user.uid);

  const today = new Date().toISOString().slice(0, 10);
  const nextTrip = trips
    .filter((trip) => trip.endDate >= today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0];

  const uniqueCities = new Set(trips.flatMap((trip) => trip.destinations.map((destination) => destination.name)));
  const totalDays = trips.reduce((sum, trip) => sum + totalTripDays(trip.startDate, trip.endDate), 0);

  return (
    <div className="flex">
      <div className="flex-1 px-8 py-10 pb-32 sm:px-12">
        <span className="block h-1 w-10 rounded-full bg-[#7386f5]" />
        <h1 className="mt-4 text-4xl font-bold text-gray-900">Mis Viajes</h1>
        <p className="mt-2 text-gray-500">
          Organiza, controla y continua planificando tus aventuras sin limites
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}

          <Link
            href="/dashboard/trips/new"
            className="grid min-h-[220px] place-items-center rounded-2xl border-2 border-dashed border-gray-300 text-[#7386f5] transition hover:border-[#7386f5] hover:bg-[#7386f5]/5"
          >
            <span className="flex flex-col items-center gap-2 text-sm font-medium">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#7386f5] text-lg leading-none">
                +
              </span>
              Crear nuevo viaje
            </span>
          </Link>
        </div>

        {nextTrip ? (
          <div className="mt-12">
            <span className="inline-flex h-9 items-center rounded-r-full bg-[#7386f5] px-5 text-sm font-semibold text-white">
              Próximo viaje
            </span>

            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              <div className="relative h-64 w-full bg-gray-100 sm:h-80">
                {nextTrip.destinations[0]?.image ? (
                  <Image
                    src={nextTrip.destinations[0].image}
                    alt={nextTrip.name}
                    fill
                    sizes="800px"
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="p-6">
                <h2 className="text-3xl font-bold text-gray-900">{nextTrip.name}</h2>

                <div className="mt-3 flex flex-col gap-1.5 text-gray-600">
                  <span className="flex items-center gap-2">
                    <CalendarIcon />
                    {formatDateRange(nextTrip.startDate, nextTrip.endDate)}
                  </span>
                  <span className="flex items-center gap-2">
                    <PinIcon />
                    {nextTrip.destinations.length} {nextTrip.destinations.length === 1 ? "ciudad" : "ciudades"}
                  </span>
                </div>

                <div className="mt-4">
                  <RouteFlags destinations={nextTrip.destinations} />
                </div>

                <div className="mt-6 flex justify-end">
                  <Link
                    href={`/dashboard/trips/${nextTrip.id}`}
                    className="group inline-flex h-11 items-center gap-2 rounded-full bg-[#7386f5] px-6 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:scale-110 hover:bg-[#5f70e0] hover:shadow-lg"
                  >
                    Planificar viaje
                    <span className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {trips.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-[#7386f5]">Tu actividad:</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-md">
              <StatTile value={trips.length} label="Viajes activos" />
              <StatTile value={uniqueCities.size} label="Ciudades" />
              <StatTile value={totalDays} label="Días planificados" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="sticky top-0 hidden h-screen w-96 shrink-0 border-l border-gray-100 lg:block xl:w-120">
        <GoogleMap className="h-full w-full" zoom={11} rounded={false} />
      </div>
    </div>
  );
}
