import Link from "next/link";
import Image from "next/image";
import { formatDateRange } from "@/lib/trips/dates";
import DeleteTripButton from "@/components/trips/DeleteTripButton";

const TOTAL_ACTIVITIES = 10;

// Placeholder until trips have a real activities checklist - deterministic per
// trip (not random) so it doesn't jump around on every render, and never 0 so
// the bar always shows some fill.
function placeholderActivities(id) {
  const hash = [...String(id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (hash % TOTAL_ACTIVITIES) + 1;
}

function tripStats(trip) {
  const items = Object.values(trip.itinerary || {}).flat();
  return {
    activities: items.length,
    places: new Set(items.map((item) => item.placeId).filter(Boolean)).size,
    notes: (trip.notes || []).length,
    companions: (trip.companions || []).length,
  };
}

export default function TripCard({ trip }) {
  const cover = trip.destinations[0]?.image;
  const completed = placeholderActivities(trip.id);
  const percent = Math.round((completed / TOTAL_ACTIVITIES) * 100);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition hover:shadow-lg">
      <Link href={`/dashboard/trips/${trip.id}`} className="block">
        <div className="relative h-40 w-full bg-gray-100">
          {cover ? (
            <Image src={cover} alt={trip.name} fill sizes="320px" className="object-cover" />
          ) : null}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-gray-900">{trip.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
          <p className="mt-1 text-sm text-gray-500">
            {trip.destinations.length} {trip.destinations.length === 1 ? "ciudad" : "ciudades"}
          </p>

          <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>
              {completed}/{TOTAL_ACTIVITIES} Actividades
            </span>
            <span>{percent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-lime-400" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </Link>

      <DeleteTripButton tripId={trip.id} tripName={trip.name} stats={tripStats(trip)} />
    </div>
  );
}
