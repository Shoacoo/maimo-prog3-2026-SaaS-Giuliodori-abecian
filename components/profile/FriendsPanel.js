"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptFriend, addFriend, removeFriend } from "@/app/dashboard/perfil/actions";
import UserAvatar from "@/components/profile/UserAvatar";

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" />
    </svg>
  );
}

function FriendCard({ friend, onRemove, busy }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="group relative flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 transition hover:border-[#7386f5]/30 hover:shadow-sm">
      <UserAvatar src={friend.avatarUrl} name={friend.name} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{friend.name}</p>
        <p className="truncate text-xs text-gray-500">
          {[friend.location, `${friend.tripCount} ${friend.tripCount === 1 ? "viaje" : "viajes"}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      {confirming ? (
        <span className="flex items-center gap-1 text-xs">
          <button type="button" disabled={busy} onClick={() => onRemove(friend.uid)} className="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-600 hover:bg-red-100">
            Quitar
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-2 py-1 font-medium text-gray-500 hover:bg-gray-100">
            No
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Quitar a ${friend.name} de tus amigos`}
          title="Quitar de amigos"
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 focus:opacity-100"
        >
          ✕
        </button>
      )}
    </li>
  );
}

// Amigos: agregar por email, solicitudes recibidas y enviadas, y el listado.
export default function FriendsPanel({ friendships, onToast }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { friends, incoming, outgoing } = friendships;

  function act(fn, okText) {
    setError("");
    startTransition(async () => {
      const result = await fn().catch(() => ({ error: "No se pudo completar." }));
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (okText) onToast(typeof okText === "function" ? okText(result) : okText);
      router.refresh();
    });
  }

  function submit(event) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    act(
      async () => {
        const result = await addFriend(value);
        if (!result?.error) setEmail("");
        return result;
      },
      (result) => (result?.status === "accepted" ? "¡Ahora son amigos!" : "Solicitud enviada"),
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Amigos <span className="font-normal text-gray-400">{friends.length}</span>
        </h2>
        <form onSubmit={submit} className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 pl-3.5 pr-1 transition focus-within:border-[#7386f5] focus-within:bg-white sm:w-80">
            <span className="text-gray-400">
              <PersonIcon />
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Agregar por email"
              aria-label="Email de tu amigo"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={pending || !email.trim()}
              className="h-8 rounded-full bg-[#7386f5] px-4 text-xs font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </form>
      </div>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p> : null}

      {incoming.length ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b9770e]">Solicitudes recibidas · {incoming.length}</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {incoming.map((person) => (
              <li key={person.uid} className="flex items-center gap-3 rounded-xl bg-[#F5A524]/8 p-3 ring-1 ring-[#F5A524]/25">
                <UserAvatar src={person.avatarUrl} name={person.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{person.name}</p>
                  <p className="truncate text-xs text-gray-500">{person.email}</p>
                </div>
                <button type="button" disabled={pending} onClick={() => act(() => acceptFriend(person.uid), `Ahora sos amigo de ${person.name}`)} className="h-8 rounded-full bg-[#7386f5] px-3 text-xs font-semibold text-white hover:bg-[#5f70e0] disabled:opacity-50">
                  Aceptar
                </button>
                <button type="button" disabled={pending} onClick={() => act(() => removeFriend(person.uid), "Solicitud rechazada")} className="h-8 rounded-full px-2.5 text-xs font-medium text-gray-500 hover:bg-white disabled:opacity-50">
                  Rechazar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {friends.length ? (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {friends.map((friend) => (
            <FriendCard key={friend.uid} friend={friend} busy={pending} onRemove={(uid) => act(() => removeFriend(uid), "Amigo quitado")} />
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-xl border-2 border-dashed border-gray-200 px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-700">Todavía no agregaste amigos</p>
          <p className="mt-1 text-xs text-gray-500">Escribí el email de alguien que use Triphy para mandarle una solicitud.</p>
        </div>
      )}

      {outgoing.length ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Enviadas · esperando respuesta</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {outgoing.map((person) => (
              <li key={person.uid} className="flex items-center gap-2 rounded-full bg-gray-50 py-1 pl-1 pr-2 text-xs text-gray-600 ring-1 ring-gray-100">
                <UserAvatar src={person.avatarUrl} name={person.name} size={24} className="ring-0" />
                {person.name}
                <button type="button" disabled={pending} onClick={() => act(() => removeFriend(person.uid), "Solicitud cancelada")} className="font-medium text-gray-400 hover:text-red-600" title="Cancelar solicitud">
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
