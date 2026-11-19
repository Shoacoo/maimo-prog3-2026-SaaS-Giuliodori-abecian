import { listUsersWithRoles } from "@/lib/users/users";
import { listAllTrips, countAllItineraryItems, getTripsCreatedPerWeek } from "@/lib/trips/trips";
import { getTopPlaces, getTopCategories, getEventsPerDay, countPlaceEvents } from "@/lib/analytics/placeEvents";
import StatTile from "@/components/admin/StatTile";
import PageHeader, { SectionCard } from "@/components/admin/PageHeader";
import RecentActivity from "@/components/admin/RecentActivity";
import { listRecentAdminActions } from "@/lib/admin/adminLog";
import { TopPlacesChart, ActivityChart, CategoriesChart, TripsPerWeekChart } from "@/components/admin/AdminCharts";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [users, trips, itineraryItemCount, tripsPerWeek, topPlaces, topCategories, eventsPerDay, eventCount, activity] =
    await Promise.all([
      listUsersWithRoles(),
      listAllTrips(),
      countAllItineraryItems(),
      getTripsCreatedPerWeek(),
      getTopPlaces(10),
      getTopCategories(),
      getEventsPerDay(30),
      countPlaceEvents(),
      listRecentAdminActions(8),
    ]);

  const admins = users.filter((user) => user.role === "admin").length;
  const today = new Date().toISOString().slice(0, 10);
  const activeTrips = trips.filter((trip) => trip.startDate && trip.startDate <= today && trip.endDate >= today).length;

  return (
    <div className="max-w-6xl">
      <PageHeader icon="dashboard" title="Resumen" description="Estado general de la plataforma." />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Usuarios" value={users.length} icon="users" color="#7386F5" hint={`${admins} ${admins === 1 ? "admin" : "admins"}`} />
        <StatTile label="Viajes" value={trips.length} icon="plane" color="#7CBE66" hint={`${activeTrips} en curso ahora`} />
        <StatTile label="Lugares en itinerarios" value={itineraryItemCount} icon="pin" color="#F5A524" />
        <StatTile label="Eventos de búsqueda" value={eventCount} icon="search" color="#143DA6" hint="Últimos 30 días en los gráficos" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopPlacesChart data={topPlaces} />
        <ActivityChart data={eventsPerDay} />
        <CategoriesChart data={topCategories} />
        <TripsPerWeekChart data={tripsPerWeek} />
      </div>

      <SectionCard className="mt-6" icon="clock" title="Actividad reciente" subtitle="Acciones sensibles hechas desde el panel">
        <RecentActivity items={activity} />
      </SectionCard>
    </div>
  );
}
