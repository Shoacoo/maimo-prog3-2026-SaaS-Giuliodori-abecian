import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import TripForm from "@/components/trips/TripForm";
import { createTrip } from "@/app/dashboard/trips/actions";

export const dynamic = "force-dynamic";

export default async function NewTripPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="px-8 py-10 sm:px-12">
      <span className="block h-1 w-10 rounded-full bg-[#7386f5]" />
      <h1 className="mt-4 text-4xl font-bold text-gray-900">Crear nuevo viaje</h1>
      <p className="mt-2 text-gray-500">Planifica tu nuevo viaje!</p>

      <div className="mt-8">
        <TripForm action={createTrip} />
      </div>
    </div>
  );
}
