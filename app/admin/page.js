import { listUsersWithRoles } from "@/lib/users/users";
import { listAllTrips, countAllItineraryItems, getTripsCreatedPerWeek } from "@/lib/trips/trips";
import { getTopPlaces, getTopCategories, getEventsPerDay, countPlaceEvents } from "@/lib/analytics/placeEvents";
import StatTile from "@/components/admin/StatTile";
import { TopPlacesChart, ActivityChart, CategoriesChart, TripsPerWeekChart } from "@/components/admin/AdminCharts";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [users, trips, itineraryItemCount, tripsPerWeek, topPlaces, topCategories, eventsPerDay, eventCount] =
    await Promise.all([
      listUsersWithRoles(),
      listAllTrips(),
      countAllItineraryItems(),
      getTripsCreatedPerWeek(),
      getTopPlaces(10),
      getTopCategories(),
      getEventsPerDay(30),
      countPlaceEvents(),
    ]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900">Resumen</h1>
      <p className="mt-1 text-sm text-gray-500">Estado general de la plataforma.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Usuarios" value={users.length} />
        <StatTile label="Viajes" value={trips.length} />
        <StatTile label="Lugares en itinerarios" value={itineraryItemCount} />
        <StatTile label="Eventos de busqueda" value={eventCount} hint="Ultimos 30 dias en los graficos" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopPlacesChart data={topPlaces} />
        <ActivityChart data={eventsPerDay} />
        <CategoriesChart data={topCategories} />
        <TripsPerWeekChart data={tripsPerWeek} />
      </div>
    </div>
  );
}
