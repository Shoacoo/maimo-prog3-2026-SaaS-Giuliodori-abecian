import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getUserTrip } from "@/lib/trips/trips";
import TripHero from "@/components/trips/TripHero";
import TripMapPanel from "@/components/trips/TripMapPanel";
import NotesView from "@/components/trips/NotesView";
import { SetTripPill } from "@/components/dashboard/TripPillProvider";

export const dynamic = "force-dynamic";

export default async function TripNotesPage({ params }) {
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
        <TripHero trip={trip} subtitle="Organiza tus ideas y apuntes del viaje" />

        <div className="px-8 py-10 pb-32 sm:px-12">
          <NotesView tripId={trip.id} notes={trip.notes} noteFolders={trip.noteFolders} />
        </div>
      </div>

      <TripMapPanel trip={trip} />
    </div>
  );
}
