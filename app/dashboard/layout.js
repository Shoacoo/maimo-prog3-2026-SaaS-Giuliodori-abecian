import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { TripPillProvider } from "@/components/dashboard/TripPillProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import { logout } from "./actions";

export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userLabel = user.email ? user.email.split("@")[0] : "Viajero";

  return (
    <TripPillProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar userLabel={userLabel} logoutAction={logout} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </TripPillProvider>
  );
}
