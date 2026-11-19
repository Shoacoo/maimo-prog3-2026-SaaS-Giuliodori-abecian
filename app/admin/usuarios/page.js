import { listUsersWithRoles } from "@/lib/users/users";
import { getCurrentAdminUser } from "@/lib/firebase/session";
import UserRow from "@/components/admin/UserRow";
import PageHeader, { EmptyRow } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, admin] = await Promise.all([listUsersWithRoles(), getCurrentAdminUser()]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon="users"
        title="Usuarios"
        description={`${users.length} cuentas registradas · ${users.filter((user) => user.role === "admin").length} con rol de admin.`}
      />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-medium">Usuario</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Viajes</th>
              <th className="px-5 py-3 font-medium">Alta</th>
              <th className="px-5 py-3 font-medium">Último login</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length ? (
              users.map((user) => <UserRow key={user.uid} user={user} isSelf={user.uid === admin?.uid} />)
            ) : (
              <EmptyRow colSpan={6} icon="users" text="Todavía no hay usuarios registrados." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
