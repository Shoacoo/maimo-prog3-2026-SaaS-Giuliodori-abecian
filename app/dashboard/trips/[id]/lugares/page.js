import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { getNearbyPlaces, CATEGORY_LABELS } from "@/lib/places/nearby";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import PlacesExplorer from "@/components/trips/PlacesExplorer";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";
import { TripPlanProvider } from "@/components/trips/TripPlanProvider";
import { buildTripPlan } from "@/lib/trips/progress";

export const dynamic = "force-dynamic";

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([type, label]) => ({ type, label }));

async function loadTripPlaces(trip) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  const perCity = await Promise.all(
    trip.destinations.map(async (destination) => {
      const results = await getNearbyPlaces(destination.lat, destination.lng, apiKey, { limit: true, icons: false });
      return results.map((place) => ({ ...place, cityName: destination.name }));
    }),
  );

  const seen = new Set();
  const places = [];
  for (const list of perCity) {
    for (const place of list) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        places.push(place);
      }
    }
  }
  return places;
}

async function PlacesSection({ trip, initialFilter }) {
  const places = await loadTripPlaces(trip);
  return (
    <PlacesExplorer
      destinations={trip.destinations}
      favorites={trip.favorites}
      initialFilter={initialFilter}
      places={places}
      categories={CATEGORIES}
    />
  );
}

function PlacesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando lugares">
      <div className="h-7 w-64 animate-pulse rounded-lg bg-gray-100" />
      <div className="mt-4 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 w-72 shrink-0 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="mt-10 h-7 w-32 animate-pulse rounded-lg bg-gray-100" />
      <div className="mt-4 flex gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[152px] w-[152px] animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default async function TripPlacesPage({ params, searchParams }) {
  const { id } = await params;
  const { filtro } = await searchParams;
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
          <TripHero trip={trip} subtitle="Descubri nuevos lugares y agrega los mejores a tu viaje!" />

          <div className="px-8 py-10 pb-32 sm:px-12">
            {/* La pagina se muestra enseguida y los lugares llegan por streaming
                (y desde la cache del servidor cuando ya se pidieron). */}
            <Suspense fallback={<PlacesSkeleton />}>
              <PlacesSection trip={trip} initialFilter={typeof filtro === "string" ? filtro : null} />
            </Suspense>
          </div>
        </div>

        <TripMapPanel trip={trip} />
      </div>
    </TripPlanProvider>
  );
}
