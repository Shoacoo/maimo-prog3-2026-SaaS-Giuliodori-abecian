"use client";

import { deleteTripAsAdminAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { formatDateRange } from "@/lib/trips/dates";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TripRow({ trip, ownerEmail }) {
  const itineraryCount = Object.values(trip.itinerary).flat().length;

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-5 py-3 font-medium text-gray-900">{trip.name}</td>
      <td className="px-5 py-3 text-gray-500">{ownerEmail || "(usuario borrado)"}</td>
      <td className="px-5 py-3 text-gray-500">{formatDateRange(trip.startDate, trip.endDate)}</td>
      <td className="px-5 py-3 text-gray-600">{trip.destinations.length}</td>
      <td className="px-5 py-3 text-gray-600">{itineraryCount}</td>
      <td className="px-5 py-3 text-gray-500">{formatDate(trip.createdAt)}</td>
      <td className="px-5 py-3 text-right">
        <ConfirmButton
          action={() => deleteTripAsAdminAction(trip.id)}
          label="Borrar"
          confirmLabel="Si, borrar"
          pendingLabel="Borrando..."
        />
      </td>
    </tr>
  );
}
