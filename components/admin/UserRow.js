"use client";

import { useTransition } from "react";
import { promoteUser, demoteUser, deleteUserAccount } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function UserRow({ user, isSelf }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-5 py-3">
        <p className="font-medium text-gray-900">{user.displayName || user.email.split("@")[0]}</p>
        <p className="text-xs text-gray-400">{user.email}</p>
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            user.role === "admin" ? "bg-[#7386f5]/10 text-[#7386f5]" : "bg-gray-100 text-gray-600"
          }`}
        >
          {user.role === "admin" ? "Admin" : "Usuario"}
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
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => (user.role === "admin" ? demoteUser(user.uid) : promoteUser(user.uid)))}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 disabled:opacity-60"
            >
              {user.role === "admin" ? "Quitar admin" : "Hacer admin"}
            </button>
            <ConfirmButton action={() => deleteUserAccount(user.uid)} label="Borrar" confirmLabel="Si, borrar" pendingLabel="Borrando..." />
          </div>
        )}
      </td>
    </tr>
  );
}
