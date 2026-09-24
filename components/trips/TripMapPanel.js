import GoogleMap from "@/components/map/GoogleMap";
import { getNextDestination } from "@/lib/trips/nextDestination";

export default function TripMapPanel({ trip }) {
  return (
    <div className="sticky top-0 hidden h-screen w-96 shrink-0 border-l border-gray-100 lg:block xl:w-120">
      <GoogleMap
        className="h-full w-full"
        zoom={4}
        rounded={false}
        showNearbyPlaces
        nextDestination={getNextDestination(trip)}
        markers={trip.destinations.map((destination) => ({
          lng: destination.lng,
          lat: destination.lat,
          label: destination.name,
        }))}
      />
    </div>
  );
}
