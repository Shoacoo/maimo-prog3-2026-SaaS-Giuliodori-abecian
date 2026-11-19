import Link from "next/link";
import Image from "next/image";
import { formatDateRange } from "@/lib/trips/dates";
import DeleteTripButton from "@/components/trips/DeleteTripButton";
import EditTripButton from "@/components/trips/EditTripButton";
import { editableTrip } from "@/lib/trips/editImpact";
import { planningProgress } from "@/lib/trips/progress";

function tripStats(trip) {
  const items = Object.values(trip.itinerary || {}).flat();
  return {
    activities: items.length,
    places: new Set(items.map((item) => item.placeId).filter(Boolean)).size,
    notes: (trip.notes || []).length,
    companions: (trip.companions || []).length,
  };
}

// En viajes compartidos (role "editor") se muestra de quién es y no se puede
// borrar: eso queda solo para el dueño.
export default function TripCard({ trip, ownerName, priority = false }) {
  const shared = trip.role === "editor";
  const cover = trip.destinations[0]?.image;
  // Misma meta que la tarjeta de planificacion del viaje: una actividad por
  // dia mas una por parada, contando lo que el usuario agrego al itinerario.
  const progress = planningProgress(trip);
  const { percent } = progress;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition hover:shadow-lg">
      <Link href={`/dashboard/trips/${trip.id}`} className="block">
        <div className="relative h-40 w-full bg-gray-100">
          {cover ? (
            <Image
              src={cover}
              alt={trip.name}
              fill
              sizes="320px"
              className="object-cover"
              // Las primeras tarjetas se ven sin scroll: se cargan enseguida.
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : null}
          {shared ? (
            <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-24px)] items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#7386f5] shadow">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
                <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
                <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="truncate">Compartido{ownerName ? ` por ${ownerName}` : ""}</span>
            </span>
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
              {progress.activities}/{progress.target} Actividades
            </span>
            <span>{percent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-lime-400" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </Link>

      {/* Editar: dueño y compañeros (los dos pueden editar el viaje). Borrar: solo el dueño. */}
      <EditTripButton trip={editableTrip(trip)} className={`absolute top-3 ${shared ? "right-3" : "right-13"}`} />
      {shared ? null : <DeleteTripButton tripId={trip.id} tripName={trip.name} stats={tripStats(trip)} />}
    </div>
  );
}
