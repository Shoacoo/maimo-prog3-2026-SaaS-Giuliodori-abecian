import Link from "next/link";
import Image from "next/image";
import { formatDateRange } from "@/lib/trips/dates";
import { deleteTrip } from "@/app/dashboard/trips/actions";

export default function TripCard({ trip }) {
  const cover = trip.destinations[0]?.image;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition hover:shadow-md">
      <Link href={`/dashboard/trips/${trip.id}`} className="block">
        <div className="relative h-40 w-full bg-gray-100">
          {cover ? (
            <Image src={cover} alt={trip.name} fill sizes="320px" className="object-cover" />
          ) : null}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900">{trip.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
          <p className="mt-1 text-sm text-gray-500">
            {trip.destinations.length} {trip.destinations.length === 1 ? "ciudad" : "ciudades"}
          </p>
        </div>
      </Link>

      <form action={deleteTrip.bind(null, trip.id)} className="absolute right-3 top-3">
        <button
          type="submit"
          aria-label="Eliminar viaje"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow transition hover:bg-white"
        >
          ✕
        </button>
      </form>
    </div>
  );
}
