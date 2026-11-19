"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { updateTrip } from "@/app/dashboard/trips/actions";
import CitySearch from "@/components/trips/new/CitySearch";
import DateRangeField, { toISODate } from "@/components/trips/new/DateRangeField";
import { SortableDestination, inputClass } from "@/components/trips/TripForm";
import { editImpact } from "@/lib/trips/editImpact";

function PencilIcon({ size = 15 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fromISODate(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function EditTripModal({ trip, onClose }) {
  const dndId = useId();
  const [name, setName] = useState(trip.name);
  const [dates, setDates] = useState({ startDate: fromISODate(trip.startDate), endDate: fromISODate(trip.endDate) });
  // Las paradas guardadas usan "id"; las del buscador traen "placeId". Se
  // unifican para el listado arrastrable.
  const [destinations, setDestinations] = useState(() =>
    trip.destinations.map((destination) => ({ ...destination, placeId: destination.id })),
  );
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const startDate = toISODate(dates.startDate);
  const endDate = toISODate(dates.endDate);
  const impact = useMemo(
    () => editImpact(trip, { startDate, endDate, destinationIds: destinations.map((city) => city.placeId) }),
    [trip, startDate, endDate, destinations],
  );

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  async function addDestination(placeId) {
    if (destinations.some((city) => city.placeId === placeId)) {
      return { error: "Esa ciudad ya está en el viaje." };
    }
    setResolving(true);
    try {
      const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
      const data = await response.json();
      if (data.error) return { error: data.error };
      setDestinations((current) =>
        current.some((city) => city.placeId === data.placeId) ? current : [...current, data],
      );
      return null;
    } catch {
      return { error: "No se pudo obtener la información de la ciudad." };
    } finally {
      setResolving(false);
    }
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setDestinations((current) => {
      const from = current.findIndex((city) => city.placeId === active.id);
      const to = current.findIndex((city) => city.placeId === over.id);
      return arrayMove(current, from, to);
    });
  }

  const canSave =
    name.trim() &&
    destinations.length > 0 &&
    startDate &&
    endDate &&
    !impact.blockedCities.length &&
    !pending &&
    !resolving;

  function save() {
    if (!canSave) return;
    setError("");
    startTransition(async () => {
      const result = await updateTrip(trip.id, {
        name: name.trim(),
        startDate,
        endDate,
        destinations: destinations.map((city) => ({ ...city, id: city.placeId })),
      }).catch(() => ({ error: "No se pudo guardar. Probá de nuevo." }));
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  const removedWithoutData = impact.removedCities.filter((city) => !city.photos && !city.entries);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/40 px-4 py-6" onClick={() => !pending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-trip-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="edit-trip-title" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="text-[#7386f5]">
              <PencilIcon size={18} />
            </span>
            Editar viaje
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="block text-sm font-medium text-gray-900">Nombre del viaje</span>
            <input
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              className={`mt-2 ${inputClass}`}
            />
          </label>

          <div className="mt-6">
            <span className="block text-sm font-medium text-gray-900">Fechas</span>
            <div className="mt-2">
              <DateRangeField startDate={dates.startDate} endDate={dates.endDate} onChange={setDates} />
            </div>
          </div>

          <div className="mt-6">
            <span className="block text-sm font-medium text-gray-900">Paradas</span>
            <div className="mt-2">
              <CitySearch
                onSelect={addDestination}
                excludeIds={destinations.map((city) => city.placeId)}
                busy={resolving}
              />
            </div>
            {destinations.length ? (
              <div className="mt-4">
                <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={destinations.map((city) => city.placeId)} strategy={verticalListSortingStrategy}>
                    {destinations.map((city, index) => (
                      <SortableDestination
                        key={city.placeId}
                        city={city}
                        index={index}
                        isLast={index === destinations.length - 1}
                        onRemove={(placeId) =>
                          setDestinations((current) => current.filter((item) => item.placeId !== placeId))
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {destinations.length > 1 ? (
                  <p className="whitespace-pre pl-16 text-[13px] text-gray-500">
                    {"⋮⋮  Arrastrá para cambiar el orden de las paradas"}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-red-500">El viaje necesita al menos una parada.</p>
            )}
          </div>

          {/* Avisos antes de guardar: que pasa con lo que ya estaba cargado. */}
          <div className="mt-6 grid gap-2 empty:hidden">
            {impact.shifted ? (
              <p className="rounded-xl bg-[#7386f5]/8 px-3 py-2.5 text-[13px] text-[#4f5fd0]">
                Las actividades, gastos y recuerdos se corren a las nuevas fechas, cada uno al mismo día del viaje.
              </p>
            ) : null}
            {impact.movedActivities ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
                {impact.movedActivities === 1 ? "1 actividad queda" : `${impact.movedActivities} actividades quedan`} fuera
                de las nuevas fechas: se van a mover al primer o al último día del viaje.
              </p>
            ) : null}
            {removedWithoutData.length ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
                Vas a quitar {removedWithoutData.map((city) => city.name).join(", ")}. Las actividades de esos días se
                mantienen en el itinerario.
              </p>
            ) : null}
            {impact.blockedCities.map((city) => (
              <p key={city.id} className="rounded-xl bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
                No se puede quitar {city.name}: tiene{" "}
                {[
                  city.photos ? `${city.photos} ${city.photos === 1 ? "foto" : "fotos"}` : null,
                  city.entries ? `${city.entries} ${city.entries === 1 ? "entrada" : "entradas"} de bitácora` : null,
                ]
                  .filter(Boolean)
                  .join(" y ")}{" "}
                en Recuerdos. Movelas a otra ciudad o borralas primero.
              </p>
            ))}
            {error ? <p className="rounded-xl bg-red-50 px-3 py-2.5 text-[13px] text-red-700">{error}</p> : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-11 rounded-full px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="h-11 rounded-full bg-[#7386f5] px-6 text-sm font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-40"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Boton de editar viaje. "card": circulo chico en la tarjeta de Mis viajes.
// "hero": boton con texto sobre la portada del viaje.
export default function EditTripButton({ trip, variant = "card", className = "" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Editar ${trip.name}`}
        title="Editar viaje"
        className={
          variant === "hero"
            ? `inline-flex h-9 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-semibold text-gray-800 shadow-md backdrop-blur transition hover:bg-white ${className}`
            : `flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-md transition hover:bg-white hover:text-[#7386f5] ${className}`
        }
      >
        <PencilIcon />
        {variant === "hero" ? "Editar" : null}
      </button>
      {open ? <EditTripModal trip={trip} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
