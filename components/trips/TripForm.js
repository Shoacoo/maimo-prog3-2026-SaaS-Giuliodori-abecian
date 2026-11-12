"use client";

import { useId, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import GoogleMap from "@/components/map/GoogleMap";
import StopOrdinal from "@/components/trips/StopOrdinal";
import CitySearch from "@/components/trips/new/CitySearch";
import CompanionSearch, { Avatar } from "@/components/trips/new/CompanionSearch";
import DateRangeField, { nightsBetween } from "@/components/trips/new/DateRangeField";
import TripCreatedModal from "@/components/trips/new/TripCreatedModal";
import { flagEmoji, getFlagUrl } from "@/lib/countries/flags";

const inputClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#7386f5] focus:bg-white focus:ring-1 focus:ring-[#7386f5]";

function DestinationCard({ city, index, isLast, onRemove, dragging }) {
  const first = index === 0;
  const flagUrl = getFlagUrl(city.countryCode, city.country);

  return (
    <div className="flex gap-4">
      <StopOrdinal order={index + 1} highlighted={first} isLast={isLast} />
      <div
        className={`mb-3 flex h-24 w-64 shrink-0 overflow-hidden rounded-2xl shadow-md transition-shadow ${
          first ? "" : "border border-gray-100"
        } ${dragging ? "shadow-2xl" : ""}`}
      >
        <div className="relative w-20 shrink-0 bg-gray-100">
          {city.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={city.image} alt={city.name} className="h-full w-full object-cover" draggable={false} />
          ) : null}
        </div>
        <div className={`flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 ${first ? "bg-[#7386f5]" : "bg-white"}`}>
          <div className="flex items-center justify-between gap-1">
            <h3 className={`truncate text-sm font-semibold ${first ? "text-white" : "text-gray-900"}`}>{city.name}</h3>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onRemove(city.placeId)}
              aria-label={`Quitar ${city.name}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fee2e2] text-[11px] font-medium text-red-500 transition hover:bg-red-200"
            >
              ✕
            </button>
          </div>
          <p className={`flex items-center gap-1.5 text-xs ${first ? "text-white" : "text-gray-500"}`}>
            {flagUrl ? (
              <span className="h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl} alt="" className="h-full w-full object-cover" />
              </span>
            ) : null}
            <span className="truncate">{city.country}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SortableDestination(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.city.placeId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <DestinationCard {...props} dragging={isDragging} />
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function PreviewCard({ name, destinations, companions, startDate, endDate }) {
  const markers = useMemo(
    () => destinations.map((city) => ({ lat: city.lat, lng: city.lng, label: city.name })),
    [destinations],
  );
  const days = startDate && endDate ? nightsBetween(startDate, endDate) + 1 : 0;
  const flag = destinations[0] ? flagEmoji(destinations[0].countryCode, destinations[0].country) : "";

  return (
    <div className="w-full overflow-hidden rounded-[20px] bg-white shadow-md lg:sticky lg:top-8 lg:w-[520px] lg:shrink-0">
      <GoogleMap className="h-[300px] w-full" rounded={false} markers={markers} markerStyle="pill" />
      <div className="flex flex-col gap-3.5 px-6 pb-6 pt-5">
        <p className="text-[13px] font-semibold text-gray-500">Vista previa del viaje</p>
        <p className={`truncate text-2xl font-bold ${name.trim() ? "text-gray-900" : "text-gray-300"}`}>
          {name.trim() || "Nombre del viaje"} {flag}
        </p>
        <div className="flex items-start justify-between">
          <Stat value={days} label={days === 1 ? "día" : "días"} />
          <Stat value={destinations.length} label={destinations.length === 1 ? "parada" : "paradas"} />
          <Stat value={companions.length} label={companions.length === 1 ? "compañero" : "compañeros"} />
          <Stat value={`0/${days + destinations.length}`} label="actividades" />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-[#7386f5]/8 px-3 py-2.5">
          <span className="text-[15px]">💡</span>
          <p className="flex-1 text-[13px] font-medium text-[#7386f5]">
            Después de crearlo vas a poder armar el itinerario día por día.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TripForm({ action }) {
  const dndId = useId();
  const [name, setName] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [companions, setCompanions] = useState([]);
  const [dates, setDates] = useState({ startDate: null, endDate: null });
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const canSubmit =
    name.trim() && destinations.length > 0 && dates.startDate && dates.endDate && !pending && !resolving;

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const formData = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.id) setCreatedId(result.id);
      } catch {
        setError("No se pudo crear el viaje. Probá de nuevo.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
        <form onSubmit={handleSubmit} className="w-full max-w-[672px]">
          <input type="hidden" name="destinations" value={JSON.stringify(destinations)} readOnly />
          <input type="hidden" name="companions" value={JSON.stringify(companions)} readOnly />

          <label className="block">
            <span className="block text-base font-medium text-gray-900">Nombre del viaje</span>
            <input
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`mt-2 ${inputClass}`}
            />
          </label>

          <div className="mt-6">
            <span className="block text-base font-medium text-gray-900">¿A donde te diriges?</span>
            <div className="mt-2">
              <CitySearch
                onSelect={addDestination}
                excludeIds={destinations.map((city) => city.placeId)}
                busy={resolving}
              />
            </div>
          </div>

          {destinations.length > 0 ? (
            <div className="mt-6">
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
          ) : null}

          <div className="mt-8">
            <span className="block text-base font-medium text-gray-900">Agregar compañero:</span>
            <div className="mt-2">
              <CompanionSearch
                companions={companions}
                onAdd={(person) =>
                  setCompanions((current) =>
                    current.some((item) => item.email === person.email) ? current : [...current, person],
                  )
                }
              />
            </div>

            {companions.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {companions.map((person) => (
                  <div key={person.email} className="group flex items-center gap-3">
                    <Avatar person={person} color="#10b981" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {person.name || person.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        @{person.email}
                        {person.uid ? "" : " · invitación por email"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompanions((current) => current.filter((item) => item.email !== person.email))}
                      aria-label={`Quitar ${person.name || person.email}`}
                      className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fee2e2] text-[11px] text-red-500 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <h3 className="text-base font-semibold text-gray-900">Fechas del viaje</h3>
            <div className="mt-3">
              <DateRangeField startDate={dates.startDate} endDate={dates.endDate} onChange={setDates} />
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-8 h-12 rounded-full bg-[#7386f5] px-8 text-sm font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-40"
          >
            {pending ? "Creando viaje..." : "Crear viaje"}
          </button>
        </form>

        <PreviewCard
          name={name}
          destinations={destinations}
          companions={companions}
          startDate={dates.startDate}
          endDate={dates.endDate}
        />
      </div>

      {createdId ? (
        <TripCreatedModal
          tripId={createdId}
          name={name.trim()}
          destinations={destinations}
          companions={companions}
          startDate={dates.startDate}
          endDate={dates.endDate}
        />
      ) : null}
    </>
  );
}
