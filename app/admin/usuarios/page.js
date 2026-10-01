import { listUsersWithRoles } from "@/lib/users/users";
import { getCurrentAdminUser } from "@/lib/firebase/session";
import UserRow from "@/components/admin/UserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, admin] = await Promise.all([listUsersWithRoles(), getCurrentAdminUser()]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
      <p className="mt-1 text-sm text-gray-500">{users.length} cuentas registradas.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-md">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-medium">Usuario</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Viajes</th>
              <th className="px-5 py-3 font-medium">Alta</th>
              <th className="px-5 py-3 font-medium">Ultimo login</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow key={user.uid} user={user} isSelf={user.uid === admin?.uid} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
