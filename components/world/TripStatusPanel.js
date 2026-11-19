"use client";

import { useState } from "react";
import Link from "next/link";
import { getFlagUrl } from "@/lib/countries/flags";
import { formatDateRange } from "@/lib/trips/dates";

// Estados de viaje del globo (mismos colores que los paises y las rutas).
const STATUSES = [
  { id: "en-curso", label: "Explorando", hint: "Viajes en curso", color: "#F5A524", icon: "compass", empty: "No tenes viajes en curso" },
  { id: "realizado", label: "Visitado", hint: "Viajes terminados", color: "#7CBE66", icon: "check", empty: "Todavia no terminaste ningun viaje" },
  { id: "planificado", label: "Planificado", hint: "Proximos viajes", color: "#7386F5", icon: "calendar", empty: "No tenes viajes planificados" },
];

function StatusIcon({ name }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      {name === "compass" ? (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" {...common} />
        </>
      ) : name === "check" ? (
        <path d="m5 12.5 4.5 4.5L19 7.5" {...common} />
      ) : (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" {...common} />
          <path d="M4 10h16M9 3v4M15 3v4" {...common} />
        </>
      )}
    </svg>
  );
}

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
    <div className="absolute bottom-5 left-5 z-10 flex max-w-[calc(100%-5rem)] flex-col-reverse items-start gap-2 sm:flex-row sm:items-end">
      {/* Leyenda de estados en columna, con el lenguaje del listado
          (tarjeta blanca). Cada fila abre el listado: a la derecha en
          pantallas grandes y arriba en el celular. */}
      <div className="w-[min(15rem,calc(100vw-6rem))] rounded-2xl bg-white p-1.5 shadow-2xl">
        <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Mis viajes</p>
        <ul className="grid gap-1">
          {STATUSES.map((status) => {
            const count = trips.filter((trip) => trip.status === status.id).length;
            const open = status.id === openStatus;
            return (
              <li key={status.id}>
                <button
                  type="button"
                  onClick={() => toggle(status.id)}
                  aria-expanded={open}
                  className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-2.5 py-2 text-left transition hover:bg-gray-50"
                  style={open ? { backgroundColor: `${status.color}1f` } : undefined}
                >
                  <span
                    className="absolute inset-y-2 left-0 w-1 rounded-full transition"
                    style={{ backgroundColor: status.color, opacity: open ? 1 : 0 }}
                  />
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition group-hover:scale-105"
                    style={{ backgroundColor: open ? status.color : `${status.color}26`, color: open ? "#fff" : status.color }}
                  >
                    <StatusIcon name={status.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">{status.label}</span>
                    <span className="block truncate text-[11px] text-gray-500">{status.hint}</span>
                  </span>
                  <span className="text-xl font-bold tabular-nums text-gray-900">{count}</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    aria-hidden="true"
                    className={`shrink-0 text-gray-400 transition ${open ? "-rotate-90 sm:rotate-0 sm:translate-x-0.5" : "group-hover:translate-x-0.5"}`}
                    style={open ? { color: status.color } : undefined}
                  >
                    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

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

    </div>
  );
}
