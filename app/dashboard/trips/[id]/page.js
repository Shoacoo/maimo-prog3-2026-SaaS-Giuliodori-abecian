import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { totalTripDays, distributeDays, formatDateRange } from "@/lib/trips/dates";
import TripStepper from "@/components/trips/TripStepper";
import MapboxMap from "@/components/map/MapboxMap";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trip = await getUserTrip(user.uid, id);

  if (!trip) {
    notFound();
  }

  const days = totalTripDays(trip.startDate, trip.endDate);
  const dayCounts = distributeDays(days, trip.destinations.length);
  const stops = trip.destinations.map((destination, index) => ({
    ...destination,
    order: index + 1,
    days: dayCounts[index],
  }));

  return (
    <div className="flex min-h-screen">
      <SetTripPill id={trip.id} name={trip.name} />

      <div className="flex-1 px-8 py-10 sm:px-12">
        <span className="block h-1 w-10 rounded-full bg-[#7386f5]" />
        <h1 className="mt-4 text-4xl font-bold text-gray-900">{trip.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-gray-500">
          <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#7386f5]" />
          <span>{days} {days === 1 ? "dia" : "dias"}</span>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#7386f5]" />
          <span>{trip.destinations.length} {trip.destinations.length === 1 ? "ciudad" : "ciudades"}</span>
        </p>

        <div className="mt-10">
          <TripStepper stops={stops} />
        </div>
      </div>

      <div className="hidden w-80 shrink-0 border-l border-gray-100 p-4 lg:block">
        <MapboxMap
          className="h-full w-full"
          zoom={4}
          markers={trip.destinations.map((destination) => ({
            lng: destination.lng,
            lat: destination.lat,
            label: destination.name,
          }))}
        />
      </div>
    </div>
  );
}
