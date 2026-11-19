"use client";

import { useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { deleteMyAccount } from "@/app/dashboard/perfil/actions";
import SecureActionButton from "@/components/admin/SecureActionButton";

const inputClass =
  "h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-[#7386f5] focus:bg-white focus:ring-1 focus:ring-[#7386f5]";

const PASSWORD_ERRORS = {
  "auth/wrong-password": "La contraseña actual no es correcta.",
  "auth/invalid-credential": "La contraseña actual no es correcta.",
  "auth/weak-password": "La contraseña nueva es muy débil.",
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
  "auth/network-request-failed": "No hay conexión. Probá de nuevo.",
};

function PasswordForm({ email, onToast }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (next.length < 8) return setError("La contraseña nueva tiene que tener al menos 8 caracteres.");
    if (next !== repeat) return setError("Las contraseñas nuevas no coinciden.");
    if (next === current) return setError("La contraseña nueva tiene que ser distinta de la actual.");
    setBusy(true);
    try {
      // Firebase pide haber ingresado hace poco para cambiar la contraseña:
      // se vuelve a autenticar con la actual y despues se actualiza.
      const credential = await signInWithEmailAndPassword(getClientAuth(), email, current);
      await updatePassword(credential.user, next);
      setCurrent("");
      setNext("");
      setRepeat("");
      onToast("Contraseña actualizada");
    } catch (failure) {
      setError(PASSWORD_ERRORS[failure?.code] || "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    setError("");
    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      onToast(`Te mandamos un mail a ${email}`);
    } catch (failure) {
      setError(PASSWORD_ERRORS[failure?.code] || "No se pudo enviar el mail.");
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <input type="password" autoComplete="current-password" placeholder="Contraseña actual" aria-label="Contraseña actual" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} required />
        <input type="password" autoComplete="new-password" placeholder="Nueva (mín. 8)" aria-label="Contraseña nueva" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} required />
        <input type="password" autoComplete="new-password" placeholder="Repetir nueva" aria-label="Repetir contraseña nueva" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass} required />
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={sendReset} className="text-xs font-medium text-[#5f70e0] hover:underline">
          ¿No te acordás? Mandame un mail para restablecerla
        </button>
        <button type="submit" disabled={busy} className="h-9 rounded-full bg-[#7386f5] px-4 text-xs font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-50">
          {busy ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

// "Cuenta y seguridad": plegado por defecto, al final del perfil.
export default function AccountSettings({ profile, ownTrips, onToast }) {
  return (
    <details className="group rounded-2xl border border-gray-100 bg-white shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <span>
          <span className="block text-sm font-semibold text-gray-900">Cuenta y seguridad</span>
          <span className="block text-xs text-gray-500">
            {profile.email} · miembro desde {formatDate(profile.memberSince)}
          </span>
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 transition group-open:rotate-180" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="grid gap-6 border-t border-gray-100 px-5 py-5 sm:px-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Contraseña</h3>
          <div className="mt-3">
            {profile.hasPassword ? (
              <PasswordForm email={profile.email} onToast={onToast} />
            ) : (
              <p className="text-sm text-gray-600">Entrás con tu cuenta de Google, así que la contraseña se maneja desde Google.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-red-50/60 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-red-700">Borrar mi cuenta</h3>
            <p className="text-xs text-red-700/80">Se borran tu cuenta y tus viajes. No se puede deshacer.</p>
          </div>
          <SecureActionButton
            label="Borrar cuenta"
            icon="trash"
            tone="danger"
            title="¿Borrar tu cuenta de Triphy?"
            description="Esta acción no se puede deshacer."
            consequences={[
              `Se borran tus ${ownTrips} ${ownTrips === 1 ? "viaje" : "viajes"}, con sus fotos, notas y gastos.`,
              "Salís de los viajes que otros compartieron con vos y se borran tus amistades.",
              "No vas a poder volver a entrar con esta cuenta.",
            ]}
            requireHint="Para confirmar, escribí tu email:"
            requireText={profile.email}
            confirmLabel="Borrar mi cuenta"
            action={async (confirmation) => {
              const result = await deleteMyAccount(confirmation);
              if (!result?.error) window.location.href = "/login";
              return result;
            }}
          />
        </div>
      </div>
    </details>
  );
}
