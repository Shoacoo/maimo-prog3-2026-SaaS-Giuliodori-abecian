"use client";

import { promoteUser, demoteUser, deleteUserAccount } from "@/app/admin/actions";
import SecureActionButton from "@/components/admin/SecureActionButton";
import { CONFIRM_WORD } from "@/lib/admin/confirm";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

const AVATAR_COLORS = ["#7386F5", "#7CBE66", "#F5A524", "#143DA6", "#9E5941"];

function Avatar({ user }) {
  const label = user.displayName || user.email;
  const initials = label
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  const color = AVATAR_COLORS[[...user.uid].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials || "?"}
    </span>
  );
}

export default function UserRow({ user, isSelf }) {
  const isAdmin = user.role === "admin";
  const name = user.displayName || user.email.split("@")[0];

  return (
    <tr className="border-b border-gray-50 transition last:border-0 hover:bg-gray-50/70">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">
              {name}
              {isSelf ? <span className="ml-2 text-xs font-normal text-gray-400">(vos)</span> : null}
            </p>
            <p className="truncate text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            isAdmin ? "bg-[#7386f5]/12 text-[#5f70e0]" : "bg-gray-100 text-gray-600"
          }`}
        >
          {isAdmin ? "Admin" : "Usuario"}
        </span>
      </td>
      <td className="px-5 py-3 text-gray-600">{user.tripCount}</td>
      <td className="px-5 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
      <td className="px-5 py-3 text-gray-500">{formatDate(user.lastLoginAt)}</td>
      <td className="px-5 py-3 text-right">
        {isSelf ? (
          <span className="text-xs text-gray-300">Tu cuenta</span>
        ) : (
          <div className="flex items-center justify-end gap-2">
            {isAdmin ? (
              <SecureActionButton
                label="Quitar admin"
                icon="shieldOff"
                tone="neutral"
                title={`¿Quitarle el rol de admin a ${name}?`}
                description="Va a seguir teniendo su cuenta y sus viajes, pero ya no va a poder entrar al panel de administración."
                requireText={CONFIRM_WORD}
                confirmLabel="Quitar admin"
                action={(confirmation) => demoteUser(user.uid, confirmation)}
              />
            ) : (
              <SecureActionButton
                label="Hacer admin"
                icon="shield"
                tone="primary"
                title={`¿Hacer admin a ${name}?`}
                description="Un admin tiene acceso total a la plataforma."
                consequences={[
                  "Ve los datos de todos los usuarios y viajes.",
                  "Puede borrar cuentas, viajes y estadísticas.",
                  "Puede dar o quitar el rol de admin a otros.",
                ]}
                requireHint="Para confirmar, escribí el email del usuario:"
                requireText={user.email}
                confirmLabel="Sí, hacer admin"
                action={(confirmation) => promoteUser(user.uid, confirmation)}
              />
            )}
            <SecureActionButton
              label="Borrar usuario"
              icon="trash"
              tone="danger"
              compact
              title={`¿Borrar la cuenta de ${name}?`}
              description="Esta acción no se puede deshacer."
              consequences={[
                "Se elimina su cuenta y no va a poder volver a entrar.",
                `Se borran sus ${user.tripCount} ${user.tripCount === 1 ? "viaje" : "viajes"}, con fotos y notas.`,
                "Sale de los viajes que otros compartieron con esa persona.",
              ]}
              requireHint="Para confirmar, escribí el email del usuario:"
              requireText={user.email}
              confirmLabel="Borrar definitivamente"
              action={(confirmation) => deleteUserAccount(user.uid, confirmation)}
            />
          </div>
        )}
      </td>
    </tr>
  );
}
