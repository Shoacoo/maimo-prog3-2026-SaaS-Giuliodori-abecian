"use client";

import Link from "next/link";
import { getFlagUrl } from "@/lib/countries/flags";
import { formatDateRange } from "@/lib/trips/dates";

const STATUS_LABEL = {
  realizado: { text: "Realizado", className: "bg-[#7CBE66]/15 text-[#4f8a3c]" },
  "en-curso": { text: "En curso", className: "bg-[#143DA6]/10 text-[#143DA6]" },
  planificado: { text: "Planificado", className: "bg-[#9E5941]/10 text-[#9E5941]" },
};

export default function CityPanel({ city, onClose }) {
  if (!city) return null;
  const flagUrl = getFlagUrl(city.countryCode, city.country);

  return (
    <aside className="absolute inset-x-3 bottom-3 z-10 max-h-[60%] overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:max-h-none sm:w-80">
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="relative h-36 shrink-0 bg-[#E7D6C2]">
          {city.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={city.image} alt={city.name} className="h-full w-full object-cover" />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition hover:bg-white"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-2">
            {flagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flagUrl} alt="" className="h-4 w-auto rounded-sm shadow-sm" />
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">{city.country}</p>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">{city.name}</h2>

          <h3 className="mt-5 text-sm font-semibold text-gray-700">
            {city.trips.length === 1 ? "1 viaje" : `${city.trips.length} viajes`} por esta ciudad
          </h3>
          <ul className="mt-2 grid gap-2">
            {city.trips.map((trip) => {
              const status = STATUS_LABEL[trip.status] || STATUS_LABEL.planificado;
              return (
                <li key={trip.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/trips/${trip.id}`} className="font-medium text-gray-900 hover:text-[#143DA6]">
                      {trip.name}
                    </Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                      {status.text}
                    </span>
                  </div>
                  {trip.startDate && trip.endDate ? (
                    <p className="mt-1 text-xs text-gray-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
                  ) : null}
                  <div className="mt-2 flex gap-3 text-xs font-medium">
                    <Link href={`/dashboard/trips/${trip.id}/itinerario`} className="text-[#143DA6] hover:underline">
                      Itinerario
                    </Link>
                    <Link href={`/dashboard/trips/${trip.id}/notas`} className="text-[#143DA6] hover:underline">
                      Notas
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 rounded-xl border border-dashed border-[#E7D6C2] bg-[#E7D6C2]/20 p-4 text-center">
            <p className="text-sm font-medium text-gray-700">Recuerdos</p>
            <p className="mt-1 text-xs text-gray-500">Pronto vas a poder subir fotos y recuerdos de esta ciudad.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
