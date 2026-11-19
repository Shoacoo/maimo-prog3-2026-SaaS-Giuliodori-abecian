"use client";

import { deleteTripAsAdminAction } from "@/app/admin/actions";
import SecureActionButton from "@/components/admin/SecureActionButton";
import { formatDateRange } from "@/lib/trips/dates";
import { CONFIRM_WORD } from "@/lib/admin/confirm";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS = {
  planned: { label: "Planificado", className: "bg-[#7386F5]/12 text-[#5f70e0]" },
  active: { label: "En curso", className: "bg-[#F5A524]/15 text-[#b9770e]" },
  done: { label: "Realizado", className: "bg-[#7CBE66]/15 text-[#4f8a3c]" },
};

function tripStatus(trip) {
  const today = new Date().toISOString().slice(0, 10);
  if (trip.endDate && trip.endDate < today) return STATUS.done;
  if (trip.startDate && trip.startDate <= today) return STATUS.active;
  return STATUS.planned;
}

export default function TripRow({ trip, ownerEmail }) {
  const itineraryCount = Object.values(trip.itinerary).flat().length;
  const status = tripStatus(trip);
  const cover = trip.destinations[0]?.image;

  return (
    <tr className="border-b border-gray-50 transition last:border-0 hover:bg-gray-50/70">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#E7D6C2]">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : null}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{trip.name}</p>
            <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
              {status.label}
            </span>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-gray-500">
        {ownerEmail || <span className="italic text-gray-300">usuario borrado</span>}
      </td>
      <td className="px-5 py-3 text-gray-500">{formatDateRange(trip.startDate, trip.endDate)}</td>
      <td className="px-5 py-3 text-gray-600">{trip.destinations.length}</td>
      <td className="px-5 py-3 text-gray-600">{itineraryCount}</td>
      <td className="px-5 py-3 text-gray-500">{formatDate(trip.createdAt)}</td>
      <td className="px-5 py-3 text-right">
        <SecureActionButton
          label="Borrar viaje"
          icon="trash"
          tone="danger"
          compact
          title={`¿Borrar el viaje "${trip.name}"?`}
          description="Esta acción no se puede deshacer."
          consequences={[
            `Se pierden su itinerario (${itineraryCount} ${itineraryCount === 1 ? "lugar" : "lugares"}), notas, gastos y fotos.`,
            "El dueño y sus compañeros dejan de verlo.",
          ]}
          requireHint="Para confirmar, escribí el nombre del viaje:"
          requireText={trip.name || CONFIRM_WORD}
          confirmLabel="Borrar definitivamente"
          action={(confirmation) => deleteTripAsAdminAction(trip.id, confirmation)}
        />
      </td>
    </tr>
  );
}
