import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { getNearbyPlaces } from "@/lib/places/nearby";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import { listTripDates } from "@/lib/trips/dates";
import { planningProgress, itineraryPlaceIds, buildTripPlan } from "@/lib/trips/progress";
import TripStepper from "@/components/trips/TripStepper";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import PlanningCard from "@/components/trips/info/PlanningCard";
import CompanionsCard from "@/components/trips/info/CompanionsCard";
import { getUserProfiles } from "@/lib/users/users";
import FavoritesSection from "@/components/trips/info/FavoritesSection";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";
import { TripPlanProvider } from "@/components/trips/TripPlanProvider";

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trip = await getUserTrip(user.uid, id);

  if (!trip) {
    notFound();
  }

  // Precarga en segundo plano los lugares de cada parada para que
  // "Lugares para visitar" salga de la cache del servidor al instante.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    after(() =>
      Promise.all(
        trip.destinations.map((destination) =>
          getNearbyPlaces(destination.lat, destination.lng, apiKey, { limit: true, icons: false }),
        ),
      ).catch(() => {}),
    );
  }

  const progress = planningProgress(trip);
  const dateList = listTripDates(trip.startDate, trip.endDate);
  // Dueño del viaje (para la tarjeta de compañeros) y "(vos)" en tu fila.
  const owner = (await getUserProfiles([trip.userId]))[trip.userId] || null;
  const ownerRow = owner ? { ...owner, isYou: trip.userId === user.uid } : null;
  const companions = trip.companions.map((person) => ({ ...person, isYou: Boolean(person.uid) && person.uid === user.uid }));

  return (
    <TripPlanProvider plan={buildTripPlan(trip)}>
      <div className="flex">
        <SetTripPill id={trip.id} name={trip.name} />

        <div className="@container min-w-0 flex-1">
          <TripHero trip={trip} />

          <div className="flex flex-col gap-8 px-8 pt-10 sm:px-12 @4xl:flex-row">
            <div className="shrink-0 @4xl:w-[400px] @4xl:pb-16">
              <TripStepper tripId={trip.id} stops={trip.destinations} progress={progress.stops} />

              <Link
                href={`/dashboard/trips/${trip.id}/itinerario`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#7386f5] px-6 text-sm font-semibold text-white transition hover:bg-[#5f70e0]"
              >
                <ListIcon />
                Ver todo el itinerario
                <ChevronRightIcon />
              </Link>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5 @4xl:min-w-[280px]">
              <PlanningCard progress={progress} favoritesCount={trip.favorites.length} />
              <CompanionsCard
                tripId={trip.id}
                companions={companions}
                owner={ownerRow}
                canManage={trip.role === "owner"}
              />
            </div>
          </div>

          <div className="px-8 pb-32 pt-10 sm:px-12">
            <FavoritesSection
              tripId={trip.id}
              favorites={trip.favorites}
              inItinerary={itineraryPlaceIds(trip)}
              dateList={dateList}
            />
          </div>
        </div>

        <TripMapPanel trip={trip} />
      </div>
    </TripPlanProvider>
  );
}
