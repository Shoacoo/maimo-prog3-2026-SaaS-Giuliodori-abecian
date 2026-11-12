"use client";

import { useState, useTransition } from "react";
import { addCompanionToTrip } from "@/app/dashboard/trips/actions";
import CompanionSearch, { Avatar } from "@/components/trips/new/CompanionSearch";

export default function CompanionsCard({ tripId, companions }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd(person) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await addCompanionToTrip(tripId, person);
        setAdding(false);
        if (result?.invites?.sent?.length) setNotice(`Le mandamos la invitación a ${person.email}.`);
        else if (result?.invites?.failed?.length) setError(`Lo sumamos, pero no pudimos mandarle el email a ${person.email}.`);
      } catch {
        setError("No se pudo agregar al compañero.");
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-3.5 rounded-2xl bg-white px-5.5 pb-5.5 pt-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold leading-snug text-gray-900">Compañeros de viaje</p>
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className="shrink-0 whitespace-nowrap pt-0.5 text-[13px] font-semibold text-[#7386f5] hover:underline"
        >
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding ? (
        <div className={pending ? "pointer-events-none opacity-60" : ""}>
          <CompanionSearch companions={companions} onAdd={handleAdd} />
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-600">✓ {notice}</p> : null}

      {companions.length === 0 && !adding ? (
        <p className="text-sm text-gray-400">Todavía no sumaste compañeros a este viaje.</p>
      ) : null}

      {companions.map((person) => (
        <div key={person.email} className="flex items-center gap-3">
          <Avatar person={person} size={40} />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <p className="truncate text-sm font-medium text-gray-900">{person.name || person.email.split("@")[0]}</p>
            <p className="truncate text-xs text-gray-500">@{person.email}</p>
          </div>
          {person.status === "invited" ? (
            <span className="shrink-0 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[11px] font-semibold text-gray-700">
              Invitación pendiente
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-[#7386f5]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7386f5]">
              Editor
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
