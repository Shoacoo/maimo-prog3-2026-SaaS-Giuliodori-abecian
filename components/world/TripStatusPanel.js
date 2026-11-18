"use client";

import { useState } from "react";
import Link from "next/link";
import { getFlagUrl } from "@/lib/countries/flags";
import { formatDateRange } from "@/lib/trips/dates";

// Estados de viaje del globo (mismos colores que los paises y las rutas).
const STATUSES = [
  { id: "en-curso", label: "Explorando", color: "#F5A524", empty: "No tenes viajes en curso" },
  { id: "realizado", label: "Visitado", color: "#7CBE66", empty: "Todavia no terminaste ningun viaje" },
  { id: "planificado", label: "Planificado", color: "#7386F5", empty: "No tenes viajes planificados" },
];

function TripItem({ trip, active, color, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(trip)}
        aria-pressed={active}
        className={`flex w-full items-start gap-3 rounded-xl p-2 text-left transition ${
          active ? "bg-gray-100 ring-2" : "hover:bg-gray-50"
        }`}
        style={active ? { "--tw-ring-color": color } : undefined}
      >
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#E7D6C2]">
          {trip.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.image} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{trip.name}</span>
          {trip.startDate && trip.endDate ? (
            <span className="block text-xs text-gray-500">{formatDateRange(trip.startDate, trip.endDate)}</span>
          ) : null}
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            {trip.countries.slice(0, 3).map((country) => {
              const flag = getFlagUrl(country.code, country.name);
              return flag ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={country.name} src={flag} alt={country.name} title={country.name} className="h-3 w-auto rounded-[2px] shadow-sm" />
              ) : null;
            })}
            <span className="truncate">{trip.cities.join(" · ")}</span>
          </span>
          <span className="mt-0.5 block text-[11px] text-gray-400">
            {trip.cities.length} {trip.cities.length === 1 ? "ciudad" : "ciudades"} · {trip.activities}{" "}
            {trip.activities === 1 ? "actividad" : "actividades"}
          </span>
        </span>
      </button>
      {active ? (
        <Link
          href={`/dashboard/trips/${trip.id}`}
          className="ml-[68px] mt-1 inline-block text-xs font-semibold text-[#143DA6] hover:underline"
        >
          Abrir viaje →
        </Link>
      ) : null}
    </li>
  );
}

// Chips clickeables con la cantidad de viajes por estado. Al abrir uno se
// despliega el listado de esos viajes; elegir un viaje hace girar el globo.
export default function TripStatusPanel({ trips, activeTripId, onSelectTrip, onClose }) {
  const [openStatus, setOpenStatus] = useState(null);
  const current = STATUSES.find((status) => status.id === openStatus);
  const listed = current ? trips.filter((trip) => trip.status === current.id) : [];

  function toggle(statusId) {
    if (openStatus === statusId) {
      setOpenStatus(null);
      onClose();
    } else {
      setOpenStatus(statusId);
    }
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-col items-start gap-2 sm:max-w-sm">
      {current ? (
        <div className="w-[min(22rem,calc(100vw-4rem))] overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: current.color }} />
              {current.label}
              <span className="font-normal text-gray-400">({listed.length})</span>
            </p>
            <button
              type="button"
              onClick={() => toggle(current.id)}
              aria-label="Cerrar listado"
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {listed.length ? (
            <ul className="grid max-h-[min(20rem,45vh)] gap-1 overflow-y-auto p-2">
              {listed.map((trip) => (
                <TripItem
                  key={trip.id}
                  trip={trip}
                  color={current.color}
                  active={trip.id === activeTripId}
                  onSelect={onSelectTrip}
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-gray-500">{current.empty}</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 rounded-full bg-white/10 p-1 text-xs text-white backdrop-blur">
        {STATUSES.map((status) => {
          const count = trips.filter((trip) => trip.status === status.id).length;
          const open = status.id === openStatus;
          return (
            <button
              key={status.id}
              type="button"
              onClick={() => toggle(status.id)}
              aria-expanded={open}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                open ? "bg-white text-gray-900" : "text-white/85 hover:bg-white/15"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              {status.label}
              <span className={`rounded-full px-1.5 text-[11px] ${open ? "bg-gray-100 text-gray-600" : "bg-white/15"}`}>
                {count}
              </span>
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                aria-hidden="true"
                className={`transition ${open ? "rotate-180" : ""}`}
              >
                <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
