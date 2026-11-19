import GoogleMap from "@/components/map/GoogleMap";
import CollapsibleMapPanel from "@/components/trips/CollapsibleMapPanel";
import { getNextDestination } from "@/lib/trips/nextDestination";
import { listTripDates } from "@/lib/trips/dates";

export default function TripMapPanel({ trip }) {
  return (
    <CollapsibleMapPanel>
      <GoogleMap
        className="h-full w-full"
        zoom={4}
        rounded={false}
        showNearbyPlaces
        nextDestination={getNextDestination(trip)}
        tripId={trip.id}
        itinerary={trip.itinerary}
        favoriteIds={(trip.favorites || []).map((place) => place.placeId)}
        dateList={listTripDates(trip.startDate, trip.endDate)}
        markers={trip.destinations.map((destination) => ({
          lng: destination.lng,
          lat: destination.lat,
          label: destination.name,
        }))}
      />
    </CollapsibleMapPanel>
  );
}
