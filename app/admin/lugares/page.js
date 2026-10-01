import { getTopPlaces, getPlaceStatsTable, countPlaceEvents } from "@/lib/analytics/placeEvents";
import { TopPlacesChart } from "@/components/admin/AdminCharts";
import ClearStatsButton from "@/components/admin/ClearStatsButton";

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lugares</h1>
          <p className="mt-1 text-sm text-gray-500">{eventCount} eventos registrados en total.</p>
        </div>
        <ClearStatsButton />
      </div>

      <div className="mt-6">
        <TopPlacesChart data={topPlaces} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-md">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-medium">Lugar</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Vistas</th>
              <th className="px-5 py-3 font-medium">Agregados a itinerario</th>
              <th className="px-5 py-3 font-medium">Ultima vez visto</th>
            </tr>
          </thead>
          <tbody>
            {table.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                  Todavia no hay datos de busqueda registrados.
                </td>
              </tr>
            ) : (
              table.map((place) => (
                <tr key={place.placeId} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-900">{place.name}</td>
                  <td className="px-5 py-3 text-gray-500">{place.category}</td>
                  <td className="px-5 py-3 text-gray-600">{place.views}</td>
                  <td className="px-5 py-3 text-gray-600">{place.itineraryAdds}</td>
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
