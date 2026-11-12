"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import TimePicker from "@/components/trips/TimePicker";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "15", "30", "45"];
const DAY_FORMATTER = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortAddress(address) {
  if (!address) return null;
  const parts = address.split(",").map((part) => part.trim());
  return parts.slice(-3, -1).join(", ") || parts[0];
}

const fieldClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-[#7386f5] focus:bg-white";

// "Información del bloque" (diseño 05c): editar dia, hora, descripcion y
// notas de una actividad del itinerario.
export default function ActivityModal({ item, date, dateList, details, onCancel, onSave, onRemove }) {
  const [hour, minute] = (item.time || "").split(":");
  const [day, setDay] = useState(date);
  const [time, setTime] = useState(HOUR_OPTIONS.includes(hour) && MINUTE_OPTIONS.includes(minute) ? `${hour}:${minute}` : null);
  const [description, setDescription] = useState(item.description || details?.description || "");
  const [note, setNote] = useState(item.note || "");
  const [extras, setExtras] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/places/poi-details?placeId=${encodeURIComponent(item.placeId)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && !data.error) setExtras(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.placeId]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  const info = extras || details;
  const status =
    info && info.openNow !== null && info.openNow !== undefined
      ? info.openNow
        ? info.closesAt
          ? `Abierto · cierra ${info.closesAt}`
          : "Abierto"
        : "Cerrado"
      : null;
  const address = shortAddress(info?.address);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="flex w-full max-w-[820px] overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="hidden w-[38%] shrink-0 bg-gray-100 sm:block">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="scheme-light flex min-w-0 flex-1 flex-col gap-3.5 p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-[#7386f5]">Información del bloque</p>
              <h2 className="truncate text-2xl font-bold text-gray-900">{item.name}</h2>
            </div>
            <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-xl leading-none text-gray-400 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-900">
              Día
              <select value={day} onChange={(event) => setDay(event.target.value)} className={fieldClass}>
                {dateList.map((option) => (
                  <option key={option} value={option}>
                    {capitalize(DAY_FORMATTER.format(new Date(`${option}T00:00:00`)))}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5 text-xs font-medium text-gray-900">
              Hora
              <TimePicker value={time} onChange={setTime} label={null} />
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-900">
            Descripción
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7386f5] focus:bg-white"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-900">
            Notas para el grupo
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={280}
              placeholder="Ej: reservar con anticipación"
              className={fieldClass}
            />
          </label>

          {status || address || extras?.station ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-900">
              {status ? (
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${info.openNow ? "bg-emerald-500" : "bg-red-500"}`} />
                  {status}
                </span>
              ) : null}
              {address ? <span>📍 {address}</span> : null}
              {extras?.station ? (
                <span>
                  🚉 {extras.station.name} · {extras.station.walkMinutes} min
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-1 flex items-center gap-3">
            <button type="button" onClick={onRemove} className="flex-1 text-left text-xs font-semibold text-red-500 hover:underline">
              🗑 Quitar del itinerario
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                onSave({
                  date: day,
                  time: time || "",
                  note,
                  description,
                })
              }
              className="rounded-lg bg-[#7386f5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5f70e0]"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
