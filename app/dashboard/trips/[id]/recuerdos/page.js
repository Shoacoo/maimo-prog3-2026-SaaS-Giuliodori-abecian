import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { buildStops } from "@/lib/trips/stops";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import MemoriesView from "@/components/trips/memories/MemoriesView";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";
import { TripPlanProvider } from "@/components/trips/TripPlanProvider";
import { buildTripPlan } from "@/lib/trips/progress";

export const dynamic = "force-dynamic";

export const metadata = { title: "Recuerdos | Triphy" };

// Lugares del itinerario (con su dia) y favoritos (con su ciudad) para
// sugerir donde se saco cada foto.
function buildSuggestions(trip) {
  const fromItinerary = Object.entries(trip.itinerary || {}).flatMap(([date, items]) =>
    (items || []).map((item) => ({ name: item.name, placeId: item.placeId || null, date, city: null })),
  );
  const fromFavorites = (trip.favorites || []).map((place) => ({
    name: place.name,
    placeId: place.placeId || null,
    date: null,
    city: place.city || null,
  }));
  return [...fromItinerary, ...fromFavorites].filter((place) => place.name);
}

export default async function TripMemoriesPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trip = await getUserTrip(user.uid, id);

  if (!trip) {
    notFound();
  }

  return (
    <TripPlanProvider plan={buildTripPlan(trip)}>
      <div className="flex">
        <SetTripPill id={trip.id} name={trip.name} />

        <div className="@container min-w-0 flex-1">
          <TripHero trip={trip} subtitle="Guardá las fotos y lo que viviste en cada lugar del viaje" />

          <div className="px-8 py-10 pb-32 sm:px-12">
            {/* Acceso a Souvenirs: donde comprar regalos en las ciudades del viaje. */}
            <Link
              href={`/dashboard/trips/${trip.id}/souvenirs`}
              className="mb-8 flex items-center gap-4 rounded-2xl border border-[#7386f5]/25 bg-[#7386f5]/5 px-5 py-4 transition hover:bg-[#7386f5]/10"
            >
              <span className="text-2xl" aria-hidden="true">
                🎁
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-gray-900">Souvenirs para llevar</span>
                <span className="block truncate text-[13px] text-gray-500">
                  Dónde comprar regalos en {trip.destinations.map((destination) => destination.name).join(", ")}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-[#7386f5]">Ver lugares →</span>
            </Link>
            <MemoriesView
              tripId={trip.id}
              tripName={trip.name}
              startDate={trip.startDate}
              endDate={trip.endDate}
              stops={buildStops(trip)}
              initialPhotos={trip.memoryPhotos}
              initialEntries={trip.memoryEntries}
              suggestions={buildSuggestions(trip)}
            />
          </div>
        </div>

        <TripMapPanel trip={trip} />
      </div>
    </TripPlanProvider>
  );
}
