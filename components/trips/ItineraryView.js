"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
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
import StopOrdinal from "@/components/trips/StopOrdinal";
import {
  addPlaceToItinerary,
  removePlaceFromItinerary,
  reorderItineraryItemsAction,
} from "@/app/dashboard/trips/actions";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-AR", { weekday: "short" });
const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat("es-AR", { day: "numeric" });
const MONTH_FORMATTER = new Intl.DateTimeFormat("es-AR", { month: "long" });
const DAY_HEADER_FORMATTER = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const SCROLLBAR_CLASSES =
  "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#7386f5]/40";

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateObjFor(date) {
  return new Date(`${date}T00:00:00`);
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      className={`text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusLine({ details }) {
  if (!details || details.openNow === null || details.openNow === undefined) {
    return null;
  }

  if (!details.openNow) {
    return <p className="text-xs font-semibold text-red-500">Cerrado</p>;
  }

  return (
    <p className="text-xs">
      <span className="font-semibold text-emerald-600">Abierto</span>
      {details.closesAt ? <span className="text-gray-500"> • Cierra {details.closesAt}</span> : null}
    </p>
  );
}

function ActivityCard({ item, order, isLast, details, onRemove, dragging }) {
  return (
    <div className="flex gap-4">
      <StopOrdinal order={order} highlighted={false} isLast={isLast} />
      <div className="mb-4 flex flex-1 items-stretch gap-3">
        <div
          className={`flex h-36 flex-1 overflow-hidden rounded-2xl border-2 border-[#7386f5] bg-white shadow-md transition-shadow ${
            dragging ? "shadow-2xl" : ""
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-5">
            <p className="font-semibold text-gray-900">{item.name}</p>
            <StatusLine details={details} />
            {details?.description ? <p className="line-clamp-2 text-sm text-gray-500">{details.description}</p> : null}
          </div>
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="w-40 shrink-0 object-cover" />
          ) : null}
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${item.name}`}
            className="flex w-14 shrink-0 items-center justify-center rounded-2xl bg-red-400 text-white shadow-md transition hover:bg-red-500"
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SortableActivityItem({ item, order, isLast, details, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
      <ActivityCard item={item} order={order} isLast={isLast} details={details} onRemove={onRemove} />
    </div>
  );
}

function DayActivities({ date, items, itemDetails, onReorder, onRemove }) {
  const dndId = useId();
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    onReorder(date, arrayMove(items, oldIndex, newIndex));
  }

  const activeIndex = items.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-1">
          {items.map((item, index) => (
            <SortableActivityItem
              key={item.id}
              item={item}
              order={index + 1}
              isLast={index === items.length - 1}
              details={itemDetails[item.id]}
              onRemove={() => onRemove(date, item.id)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <ActivityCard item={activeItem} order={activeIndex + 1} isLast details={itemDetails[activeItem.id]} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PlaceSearchBox({ cityHint, onResolved, onCancel }) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setPredictions([]);
      return undefined;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (cityHint) {
          params.set("lat", String(cityHint.lat));
          params.set("lng", String(cityHint.lng));
        }
        const response = await fetch(`/api/places/search?${params}`);
        const data = await response.json();
        setPredictions(data.predictions || []);
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, cityHint]);

  async function selectPrediction(prediction) {
    setPredictions([]);
    setQuery("");
    setResolving(true);

    try {
      const response = await fetch(`/api/places/poi-details?placeId=${encodeURIComponent(prediction.placeId)}`);
      const data = await response.json();
      if (!data.error && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        onResolved({
          placeId: prediction.placeId,
          name: data.name || prediction.mainText,
          lat: data.lat,
          lng: data.lng,
          image: data.photos?.[0] || null,
          category: data.category,
          description: data.description,
        });
      }
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="relative">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar lugar..."
        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
      />
      {loading || resolving ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {resolving ? "Agregando..." : "Buscando..."}
        </span>
      ) : null}
      {predictions.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {predictions.map((prediction) => (
            <li key={prediction.placeId}>
              <button
                type="button"
                onClick={() => selectPrediction(prediction)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
              >
                <span>{prediction.mainText}</span>
                <span className="text-gray-400">{prediction.secondaryText}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" onClick={onCancel} className="mt-2 text-xs text-gray-400 underline underline-offset-2">
        Cancelar
      </button>
    </div>
  );
}

export default function ItineraryView({ tripId, dateList, itinerary, cityByDate, itemDetails }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(dateList.includes(today) ? today : dateList[0]);
  const [collapsedDays, setCollapsedDays] = useState(() => new Set());
  const [localItinerary, setLocalItinerary] = useState(itinerary);
  const [openSearchDate, setOpenSearchDate] = useState(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const dayRefs = useRef({});

  useEffect(() => {
    setLocalItinerary(itinerary);
  }, [itinerary]);

  function selectDay(date) {
    setSelectedDate(date);
    dayRefs.current[date]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleCollapsed(date) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  function handleAdd(date, place) {
    const previous = localItinerary;
    const optimisticItem = { ...place, id: `optimistic-${Date.now()}` };
    setLocalItinerary((current) => ({ ...current, [date]: [...(current[date] || []), optimisticItem] }));
    setOpenSearchDate(null);
    setError("");

    startTransition(async () => {
      try {
        await addPlaceToItinerary(tripId, date, place);
        // The server action only invalidates the Next.js cache - the already-
        // rendered page won't pick up the fresh itemDetails (status/description)
        // without an explicit refresh, so the optimistic item would otherwise
        // stay stuck looking "empty" forever.
        router.refresh();
      } catch {
        setLocalItinerary(previous);
        setError("No se pudo agregar el lugar. Intenta de nuevo.");
      }
    });
  }

  function handleRemove(date, itemId) {
    const previous = localItinerary;
    setLocalItinerary((current) => ({
      ...current,
      [date]: (current[date] || []).filter((item) => item.id !== itemId),
    }));
    setError("");

    startTransition(async () => {
      try {
        await removePlaceFromItinerary(tripId, date, itemId);
        router.refresh();
      } catch {
        setLocalItinerary(previous);
        setError("No se pudo quitar el lugar. Intenta de nuevo.");
      }
    });
  }

  function handleReorder(date, reorderedItems) {
    const previous = localItinerary;
    setLocalItinerary((current) => ({ ...current, [date]: reorderedItems }));
    setError("");

    startTransition(async () => {
      try {
        await reorderItineraryItemsAction(tripId, date, reorderedItems.map((item) => item.id));
      } catch {
        setLocalItinerary(previous);
        setError("No se pudo guardar el nuevo orden. Intenta de nuevo.");
      }
    });
  }

  const selectedDateObj = dateObjFor(selectedDate);

  return (
    <div>
      <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        {/* Purely decorative - mimics the rings/pins of a physical wall calendar. */}
        <div className="mb-5 flex justify-between px-10">
          <span className="h-2.5 w-14 rounded-full bg-[#7386f5]" />
          <span className="h-2.5 w-14 rounded-full bg-[#7386f5]" />
        </div>

        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black text-gray-900">{capitalize(MONTH_FORMATTER.format(selectedDateObj))}</h2>
          <span className="text-5xl font-black text-gray-900">{DAY_NUMBER_FORMATTER.format(selectedDateObj)}</span>
        </div>

        <div className={`mt-5 flex gap-3 overflow-x-auto pb-2 ${SCROLLBAR_CLASSES}`}>
          {dateList.map((date) => {
            const dateObj = dateObjFor(date);
            const selected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDay(date)}
                className="flex w-12 shrink-0 flex-col items-center gap-2"
              >
                <span className="text-xs font-medium text-gray-400">{capitalize(WEEKDAY_FORMATTER.format(dateObj))}</span>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition ${
                    selected ? "bg-[#7386f5] text-white shadow-md" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {DAY_NUMBER_FORMATTER.format(dateObj)}
                </span>
                <span className={`h-1 w-6 rounded-full transition ${selected ? "bg-[#7386f5]" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <span className="inline-flex h-9 items-center rounded-r-full bg-[#7386f5] px-5 text-sm font-semibold text-white shadow-md">
          Itinerario
        </span>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <div className="mt-6 grid gap-10">
          {dateList.map((date) => {
            const items = localItinerary[date] || [];
            const collapsed = collapsedDays.has(date);
            const dateObj = dateObjFor(date);

            return (
              <div
                key={date}
                id={`day-${date}`}
                ref={(el) => {
                  dayRefs.current[date] = el;
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleCollapsed(date)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3 className="text-xl font-bold text-gray-900">{capitalize(DAY_HEADER_FORMATTER.format(dateObj))}</h3>
                  <ChevronDownIcon open={!collapsed} />
                </button>

                {!collapsed ? (
                  <div className="mt-4">
                    {items.length > 0 ? (
                      <DayActivities
                        date={date}
                        items={items}
                        itemDetails={itemDetails}
                        onReorder={handleReorder}
                        onRemove={handleRemove}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-gray-400">
                          Sin actividades :(
                          <br />
                          <span className="font-semibold text-gray-500">No olvides organizar tus dias!</span>
                        </p>
                        {openSearchDate !== date ? (
                          <button
                            type="button"
                            onClick={() => setOpenSearchDate(date)}
                            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#7386f5] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5f70e0]"
                          >
                            + Agregar lugar
                          </button>
                        ) : null}
                      </div>
                    )}

                    {openSearchDate === date ? (
                      <div className="mt-3 max-w-md">
                        <PlaceSearchBox
                          cityHint={cityByDate[date]}
                          onResolved={(place) => handleAdd(date, place)}
                          onCancel={() => setOpenSearchDate(null)}
                        />
                      </div>
                    ) : items.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setOpenSearchDate(date)}
                        className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-[#7386f5] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5f70e0]"
                      >
                        + Agregar lugar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
