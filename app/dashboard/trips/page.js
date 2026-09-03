import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { listUserTrips } from "@/lib/trips/trips";
import TripCard from "@/components/trips/TripCard";
import MapboxMap from "@/components/map/MapboxMap";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trips = await listUserTrips(user.uid);

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 px-8 py-10 sm:px-12">
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
      </div>

      <div className="hidden w-80 shrink-0 border-l border-gray-100 p-4 lg:block">
        <MapboxMap className="h-full w-full" zoom={11} />
      </div>
    </div>
  );
}
