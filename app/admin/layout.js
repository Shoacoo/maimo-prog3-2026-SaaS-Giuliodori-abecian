import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentAdminUser } from "@/lib/firebase/session";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { logout } from "@/app/dashboard/actions";

export default async function AdminLayout({ children }) {
  const admin = await getCurrentAdminUser();

  if (!admin) {
    const user = await getCurrentUser();
    redirect(user ? "/dashboard/trips" : "/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar adminLabel={admin.email} logoutAction={logout} />
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
