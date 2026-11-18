import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { buildStops } from "@/lib/trips/stops";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import SouvenirsView from "@/components/trips/souvenirs/SouvenirsView";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";
import { TripPlanProvider } from "@/components/trips/TripPlanProvider";
import { MapFocusProvider } from "@/components/map/MapFocusProvider";
import { buildTripPlan } from "@/lib/trips/progress";

export const dynamic = "force-dynamic";

export const metadata = { title: "Souvenirs | Triphy" };

export default async function TripSouvenirsPage({ params }) {
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
      <MapFocusProvider>
        <div className="flex">
          <SetTripPill id={trip.id} name={trip.name} />

          <div className="min-w-0 flex-1">
            <TripHero trip={trip} subtitle="Dónde comprar regalos para tus amigos (o para vos) en cada ciudad" />

            <div className="px-8 py-10 pb-32 sm:px-12">
              <SouvenirsView stops={buildStops(trip).filter((stop) => Number.isFinite(stop.lat))} />
            </div>
          </div>

          <TripMapPanel trip={trip} />
        </div>
      </MapFocusProvider>
    </TripPlanProvider>
  );
}
