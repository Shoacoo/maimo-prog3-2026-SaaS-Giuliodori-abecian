import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { listTripDates } from "@/lib/trips/dates";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import BudgetView from "@/components/trips/budget/BudgetView";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";
import { TripPlanProvider } from "@/components/trips/TripPlanProvider";
import { buildTripPlan } from "@/lib/trips/progress";

export const dynamic = "force-dynamic";

export const metadata = { title: "Presupuesto | Triphy" };

// Actividades del itinerario (para asociar un gasto a una), en orden de dia.
function listActivities(trip) {
  return Object.entries(trip.itinerary || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, items]) =>
      (items || []).map((item) => ({ id: item.id, name: item.name, date, category: item.category || null })),
    );
}

export default async function TripBudgetPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trip = await getUserTrip(user.uid, id);

  if (!trip) {
    notFound();
  }

  return (
    <TripPlanProvider plan={buildTripPlan(trip)}>
      <div className="flex">
        <SetTripPill id={trip.id} name={trip.name} />

        <div className="@container min-w-0 flex-1">
          <TripHero trip={trip} subtitle="Definí cuánto querés gastar y anotá lo que van gastando" />

          <div className="px-8 py-10 pb-32 sm:px-12">
            <BudgetView
              tripId={trip.id}
              route={trip.destinations.map((destination) => destination.name).join(" → ")}
              startDate={trip.startDate}
              endDate={trip.endDate}
              travelers={1 + trip.companions.length}
              dateList={trip.startDate && trip.endDate ? listTripDates(trip.startDate, trip.endDate) : []}
              activities={listActivities(trip)}
              initialBudget={trip.budget}
              initialExpenses={trip.expenses}
            />
          </div>
        </div>

        <TripMapPanel trip={trip} />
      </div>
    </TripPlanProvider>
  );
}
