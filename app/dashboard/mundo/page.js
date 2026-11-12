import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { listUserTrips } from "@/lib/trips/trips";
import { buildWorldData } from "@/lib/world/worldData";
import WorldExplorer from "@/components/world/WorldExplorer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mi mundo | Triphy" };

export default async function MundoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trips = await listUserTrips(user.uid);
  const data = buildWorldData(trips);

  return (
    <div className="px-4 py-8 sm:px-8">
      <WorldExplorer data={data} />
    </div>
  );
}
