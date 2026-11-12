import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { computeStopDateRanges, distributeDays, listTripDates } from "@/lib/trips/dates";
import { getFlagUrl } from "@/lib/countries/flags";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import MemoriesView from "@/components/trips/memories/MemoriesView";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";
import { TripPlanProvider } from "@/components/trips/TripPlanProvider";
import { buildTripPlan } from "@/lib/trips/progress";

export const dynamic = "force-dynamic";

export const metadata = { title: "Recuerdos | Triphy" };

// Cada parada del viaje con sus dias, para agrupar fotos y bitacora por ciudad.
function buildStops(trip) {
  const dateList = trip.startDate && trip.endDate ? listTripDates(trip.startDate, trip.endDate) : [];
  const ranges = dateList.length
    ? computeStopDateRanges(trip.startDate, distributeDays(dateList.length, trip.destinations.length))
    : [];
  return trip.destinations.map((destination, index) => {
    const range = ranges[index];
    return {
      id: destination.id,
      name: destination.name,
      flagUrl: getFlagUrl(destination.countryCode, destination.country),
      startDate: range?.startDate || null,
      endDate: range?.endDate || null,
      dates: range ? listTripDates(range.startDate, range.endDate) : [],
    };
  });
}

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

        <div className="min-w-0 flex-1">
          <TripHero trip={trip} subtitle="Guardá las fotos y lo que viviste en cada lugar del viaje" />

          <div className="px-8 py-10 pb-32 sm:px-12">
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
