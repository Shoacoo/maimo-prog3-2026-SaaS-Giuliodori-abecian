import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getMyProfile, CURRENCY_OPTIONS } from "@/lib/users/profile";
import { listUserTrips } from "@/lib/trips/trips";
import { buildWorldData } from "@/lib/world/worldData";
import ProfileView from "@/components/profile/ProfileView";
import { listFriendships } from "@/lib/users/friends";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mi perfil | Triphy" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [profile, trips, friendships] = await Promise.all([
    getMyProfile(user.uid),
    listUserTrips(user.uid),
    listFriendships(user.uid),
  ]);
  const { stats } = buildWorldData(trips);
  const ownTrips = trips.filter((trip) => trip.role === "owner").length;

  return (
    <div className="px-4 py-8 pb-32 sm:px-10">
      <ProfileView
        profile={profile}
        currencies={CURRENCY_OPTIONS}
        friendships={friendships}
        stats={{
          trips: trips.length,
          ownTrips,
          sharedTrips: trips.length - ownTrips,
          countries: stats.countries,
          cities: stats.cities,
        }}
      />
    </div>
  );
}
