"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { addPlaceToItinerary, removePlaceFromItinerary } from "@/app/dashboard/trips/actions";
import { useTripPlan } from "@/components/trips/TripPlanProvider";
import TimePicker from "@/components/trips/TimePicker";

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateObj(date) {
  return new Date(`${date}T00:00:00`);
}

const shortWeekday = (date) =>
  capitalize(new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(dateObj(date)).replace(".", ""));
const longWeekday = (date) => capitalize(new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(dateObj(date)));
const fullDate = (date) =>
  capitalize(new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(dateObj(date)));

function placeIdOf(place) {
  return place.placeId || place.id;
}

function findDate(itinerary, placeId) {
  return Object.keys(itinerary || {}).find((date) => (itinerary[date] || []).some((item) => item.placeId === placeId));
}

function Toast({ toast, onUndo }) {
  return createPortal(
    <div className="fixed left-1/2 top-6 z-[60] flex -translate-x-1/2 items-center gap-4 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl">
      <span className="text-lime-400">✓</span>
      <span className="font-medium">
        {toast.name} se agregó al {toast.label}
      </span>
      <button type="button" onClick={onUndo} className="font-semibold text-lime-400 hover:underline">
        Deshacer
      </button>
      <Link href={`/dashboard/trips/${toast.tripId}/itinerario#day-${toast.date}`} className="font-semibold hover:underline">
        Ver día →
      </Link>
    </div>,
    document.body,
  );
}

// "Agregar al itinerario" (diseño 06b): elegir dia (mostrando la ciudad de
// cada dia y cuantos lugares tiene) y una hora opcional. Al agregar muestra
// un aviso con "Deshacer" y el boton pasa a "En el itinerario" (06d).
export default function AddToItineraryButton({
  place,
  dateList: dateListProp,
  tripId: tripIdProp,
  className = "",
  compact = false,
  direction = "up",
  label = "+ Agregar lugar",
  buttonClassName,
  showAdded = true,
}) {
  const plan = useTripPlan();
  const tripId = tripIdProp || plan?.tripId;
  const dateList = dateListProp?.length ? dateListProp : plan?.dateList || [];
  const cityByDate = plan?.cityByDate || {};
  const placeCity = place.cityName || place.city || null;
  const id = placeIdOf(place);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [time, setTime] = useState(null);
  const [added, setAdded] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [position, setPosition] = useState(null);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(event) {
      const insideButton = containerRef.current?.contains(event.target);
      const insidePopover = popoverRef.current?.contains(event.target);
      if (!insideButton && !insidePopover) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // El popover se renderiza en un portal con posicion fija: si quedara dentro
  // de la ficha del mapa (que tiene overflow-hidden) se cortaba o se salia del
  // costado. Se alinea al boton y se da vuelta si no entra en la pantalla.
  useLayoutEffect(() => {
    if (!open) return undefined;
    function updatePosition() {
      const anchor = containerRef.current?.getBoundingClientRect();
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const margin = 8;
      const { offsetWidth: width, offsetHeight: height } = popover;
      const { innerWidth, innerHeight } = window;

      let left = anchor.left;
      if (left + width > innerWidth - margin) left = anchor.right - width;
      left = Math.min(Math.max(margin, left), innerWidth - width - margin);

      const below = anchor.bottom + margin;
      const above = anchor.top - margin - height;
      const fitsBelow = below + height <= innerHeight - margin;
      const fitsAbove = above >= margin;
      let top = direction === "down" ? (fitsBelow || !fitsAbove ? below : above) : fitsAbove || !fitsBelow ? above : below;
      top = Math.min(Math.max(margin, top), innerHeight - height - margin);

      setPosition({ top, left });
    }
    updatePosition();
    // Si el popover crece (por ejemplo al desplegar el selector de hora) se reacomoda.
    const observer = new ResizeObserver(updatePosition);
    if (popoverRef.current) observer.observe(popoverRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, direction]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const addedDate = added?.date || (added === false ? null : findDate(plan?.itinerary, id));

  function openPopover() {
    const sameCity = dateList.find((date) => placeCity && cityByDate[date] === placeCity);
    setSelected(sameCity || dateList[0]);
    setError("");
    setTime(null);
    setPosition(null);
    setOpen((current) => !current);
  }

  function handleAdd() {
    if (!selected) return;
    const date = selected;
    const chosenTime = time;
    setOpen(false);
    startTransition(async () => {
      try {
        const result = await addPlaceToItinerary(tripId, date, place, chosenTime);
        setAdded({ date, itemId: result?.id });
        setToast({ name: place.name, date, label: fullDate(date), tripId, itemId: result?.id });
      } catch {
        setError("No se pudo agregar.");
      }
    });
  }

  function handleUndo() {
    const current = toast;
    setToast(null);
    if (!current?.itemId) return;
    startTransition(async () => {
      try {
        await removePlaceFromItinerary(tripId, current.date, current.itemId);
        setAdded(false);
      } catch {
        setError("No se pudo deshacer.");
      }
    });
  }

  const defaultButton = compact
    ? "inline-flex h-7 items-center justify-center rounded-full bg-[#7386f5] px-3 text-xs font-semibold text-white shadow-md transition hover:bg-[#5f70e0]"
    : "flex h-10 w-full items-center justify-center rounded-full bg-[#7386f5] text-sm font-semibold text-white shadow-md transition hover:bg-[#5f70e0]";

  return (
    <div ref={containerRef} className={`relative ${compact ? "inline-block" : ""} ${className}`}>
      {showAdded && addedDate ? (
        <Link
          href={`/dashboard/trips/${tripId}/itinerario#day-${addedDate}`}
          className={
            compact
              ? "inline-flex h-7 items-center justify-center rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-600"
              : "flex h-10 w-full items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-600"
          }
        >
          ✓ En el itinerario · {shortWeekday(addedDate)} {dateObj(addedDate).getDate()}
        </Link>
      ) : (
        <button
          type="button"
          onClick={openPopover}
          disabled={pending || dateList.length === 0}
          className={`${buttonClassName || defaultButton} disabled:opacity-50`}
        >
          {label}
        </button>
      )}

      {error ? <p className="mt-1.5 text-center text-xs font-medium text-red-500">{error}</p> : null}

      {open ? createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Agregar al itinerario"
          style={position ? { top: position.top, left: position.left } : { top: 0, left: 0, visibility: "hidden" }}
          className="fixed z-[60] max-h-[calc(100vh-16px)] w-[260px] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Agregar al itinerario</p>
              <p className="truncate text-[11px] text-gray-500">{[place.name, placeCity].filter(Boolean).join(" · ")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700">
              ✕
            </button>
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase text-gray-400">¿Qué día lo visitás?</p>

          <div className="mt-1.5 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
            {dateList.map((date) => {
              const city = cityByDate[date];
              const count = plan?.itinerary?.[date]?.length || 0;
              const active = selected === date;
              const sameCity = placeCity && city === placeCity;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                    active ? "border-[#7386f5] bg-[#7386f5]/5" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
                      active ? "border-[#7386f5]" : "border-gray-300"
                    }`}
                  >
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#7386f5]" /> : null}
                  </span>
                  <span className={`font-semibold ${active ? "text-[#7386f5]" : "text-gray-900"}`}>
                    {shortWeekday(date)} {dateObj(date).getDate()}
                  </span>
                  {city ? <span className="truncate text-gray-500">· {city}</span> : null}
                  <span className="ml-auto shrink-0">
                    {sameCity ? (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
                        Misma ciudad
                      </span>
                    ) : count === 0 ? (
                      <span className="text-[9px] text-red-500">Sin actividades</span>
                    ) : (
                      <span className="text-[9px] text-gray-400">
                        {count} {count === 1 ? "lugar" : "lugares"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <TimePicker value={time} onChange={setTime} className="mt-3" />

          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected}
            className="mt-3 w-full rounded-lg bg-[#7386f5] py-2 text-xs font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-50"
          >
            {selected ? `Agregar al ${longWeekday(selected)} ${dateObj(selected).getDate()}` : "Elegí un día"}
          </button>
        </div>,
        document.body,
      ) : null}

      {toast ? <Toast toast={toast} onUndo={handleUndo} /> : null}
    </div>
  );
}
