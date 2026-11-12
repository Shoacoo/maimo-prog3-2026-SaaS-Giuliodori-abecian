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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  let places = [];
  if (apiKey) {
    const perCity = await Promise.all(
      trip.destinations.map(async (destination) => {
        const results = await getNearbyPlaces(destination.lat, destination.lng, apiKey, { limit: true });
        return results.map((place) => ({ ...place, cityName: destination.name }));
      }),
    );

    const seen = new Set();
    for (const list of perCity) {
      for (const place of list) {
        if (!seen.has(place.id)) {
          seen.add(place.id);
          places.push(place);
        }
      }
    }
  }

  return (
    <TripPlanProvider plan={buildTripPlan(trip)}>
      <div className="flex">
        <SetTripPill id={trip.id} name={trip.name} />

        <div className="min-w-0 flex-1">
          <TripHero trip={trip} subtitle="Descubri nuevos lugares y agrega los mejores a tu viaje!" />

          <div className="px-8 py-10 pb-32 sm:px-12">
            <PlacesExplorer
              destinations={trip.destinations}
              favorites={trip.favorites}
              initialFilter={typeof filtro === "string" ? filtro : null}
              places={places}
              categories={Object.entries(CATEGORY_LABELS).map(([type, label]) => ({ type, label }))}
            />
          </div>
        </div>

        <TripMapPanel trip={trip} />
      </div>
    </TripPlanProvider>
  );
}
