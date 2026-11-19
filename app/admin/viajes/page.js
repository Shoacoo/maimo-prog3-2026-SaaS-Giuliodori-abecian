import { listAllTrips } from "@/lib/trips/trips";
import { listUsersWithRoles } from "@/lib/users/users";
import TripRow from "@/components/admin/TripRow";
import PageHeader, { EmptyRow } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminTripsPage() {
  const [trips, users] = await Promise.all([listAllTrips(), listUsersWithRoles()]);
  const emailByUid = new Map(users.map((user) => [user.uid, user.email]));

  return (
    <div className="max-w-6xl">
      <PageHeader icon="plane" title="Viajes" description={`${trips.length} viajes creados en la plataforma.`} />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-medium">Viaje</th>
              <th className="px-5 py-3 font-medium">Dueño</th>
              <th className="px-5 py-3 font-medium">Fechas</th>
              <th className="px-5 py-3 font-medium">Destinos</th>
              <th className="px-5 py-3 font-medium">Lugares</th>
              <th className="px-5 py-3 font-medium">Creado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {trips.length ? (
              trips.map((trip) => <TripRow key={trip.id} trip={trip} ownerEmail={emailByUid.get(trip.userId)} />)
            ) : (
              <EmptyRow colSpan={7} icon="plane" text="Todavía no se creó ningún viaje." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
