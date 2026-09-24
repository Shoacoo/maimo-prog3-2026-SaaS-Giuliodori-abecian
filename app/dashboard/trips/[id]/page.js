import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import TripStepper from "@/components/trips/TripStepper";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";

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

  return (
    <div className="flex">
      <SetTripPill id={trip.id} name={trip.name} />

      <div className="min-w-0 flex-1">
        <TripHero trip={trip} />

        <div className="px-8 py-10 pb-32 sm:px-12">
          <TripStepper tripId={trip.id} stops={trip.destinations} />

          <Link
            href={`/dashboard/trips/${trip.id}/itinerario`}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#7386f5] px-6 text-sm font-semibold text-white transition hover:bg-[#5f70e0]"
          >
            <ListIcon />
            Ver todo el itinerario
            <ChevronRightIcon />
          </Link>
        </div>
      </div>

      <TripMapPanel trip={trip} />
    </div>
  );
}
