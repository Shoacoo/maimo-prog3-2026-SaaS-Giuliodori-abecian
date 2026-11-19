import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { getSidebarProfile } from "@/lib/users/profile";
import { countIncomingRequests } from "@/lib/users/friends";
import { TripPillProvider } from "@/components/dashboard/TripPillProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import { logout } from "./actions";

export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Una sola lectura del perfil: nombre, foto y rol para el menu lateral.
  const [profile, friendRequests] = await Promise.all([getSidebarProfile(user.uid), countIncomingRequests(user.uid)]);
  const userLabel = profile.displayName || user.name || (user.email ? user.email.split("@")[0] : "Viajero");
  const isAdmin = profile.role === "admin";

  return (
    <TripPillProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar userLabel={userLabel} avatarUrl={profile.avatarUrl} friendRequests={friendRequests} logoutAction={logout} isAdmin={isAdmin} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </TripPillProvider>
  );
}
