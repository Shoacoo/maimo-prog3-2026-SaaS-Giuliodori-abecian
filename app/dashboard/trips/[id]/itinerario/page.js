import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { listTripDates, distributeDays, computeStopDateRanges } from "@/lib/trips/dates";
import { getPlaceDetails } from "@/lib/places/placeDetails";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import ItineraryView from "@/components/trips/ItineraryView";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";

export const dynamic = "force-dynamic";

export default async function TripItineraryPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trip = await getUserTrip(user.uid, id);

  if (!trip) {
    notFound();
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const dateList = listTripDates(trip.startDate, trip.endDate);

  const dayCounts = distributeDays(dateList.length, trip.destinations.length);
  const stopRanges = computeStopDateRanges(trip.startDate, dayCounts);

  // Each destination "owns" a contiguous range of trip days - used to bias the
  // per-day place search near whichever city the traveler is in that day.
  const cityByDate = {};
  stopRanges.forEach((range, index) => {
    listTripDates(range.startDate, range.endDate).forEach((date) => {
      cityByDate[date] = trip.destinations[index];
    });
  });

  const allItems = Object.values(trip.itinerary).flat();
  const detailsEntries = apiKey
    ? await Promise.all(
        allItems.map(async (item) => {
          const details = await getPlaceDetails(item.placeId, apiKey);
          return [item.id, details.error ? null : details];
        }),
      )
    : [];
  const itemDetails = Object.fromEntries(detailsEntries);

  return (
    <div className="flex">
      <SetTripPill id={trip.id} name={trip.name} />

      <div className="min-w-0 flex-1">
        <TripHero trip={trip} />

        <div className="px-8 py-10 pb-32 sm:px-12">
          <ItineraryView
            tripId={trip.id}
            dateList={dateList}
            itinerary={trip.itinerary}
            cityByDate={cityByDate}
            itemDetails={itemDetails}
          />
        </div>
      </div>

      <TripMapPanel trip={trip} />
    </div>
  );
}
