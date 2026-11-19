import { getTopPlaces, getPlaceStatsTable, countPlaceEvents } from "@/lib/analytics/placeEvents";
import { TopPlacesChart } from "@/components/admin/AdminCharts";
import ClearStatsButton from "@/components/admin/ClearStatsButton";
import PageHeader, { EmptyRow } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminPlacesPage() {
  const [topPlaces, table, eventCount] = await Promise.all([
    getTopPlaces(15, 90),
    getPlaceStatsTable(90),
    countPlaceEvents(),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader icon="pin" title="Lugares" description={`${eventCount} eventos registrados en total.`}>
        <ClearStatsButton />
      </PageHeader>

      <div className="mt-6">
        <TopPlacesChart data={topPlaces} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-medium">Lugar</th>
              <th className="px-5 py-3 font-medium">Categoría</th>
              <th className="px-5 py-3 font-medium">Vistas</th>
              <th className="px-5 py-3 font-medium">Agregados a itinerario</th>
              <th className="px-5 py-3 font-medium">Última vez visto</th>
            </tr>
          </thead>
          <tbody>
            {table.length === 0 ? (
              <EmptyRow colSpan={5} icon="search" text="Todavía no hay datos de búsqueda registrados." />
            ) : (
              table.map((place) => (
                <tr key={place.placeId} className="border-b border-gray-50 transition last:border-0 hover:bg-gray-50/70">
                  <td className="px-5 py-3 font-medium text-gray-900">{place.name}</td>
                  <td className="px-5 py-3">
                    {place.category ? (
                      <span className="rounded-full bg-[#E7D6C2]/60 px-2.5 py-1 text-xs font-medium text-[#7a4a33]">{place.category}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold tabular-nums text-gray-700">{place.views}</td>
                  <td className="px-5 py-3 font-semibold tabular-nums text-[#4f8a3c]">{place.itineraryAdds}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(place.lastSeen)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
