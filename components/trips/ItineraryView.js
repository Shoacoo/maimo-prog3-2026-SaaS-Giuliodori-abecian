"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
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
import AddPlacePanel from "@/components/trips/itinerary/AddPlacePanel";
import ActivityModal from "@/components/trips/itinerary/ActivityModal";
import MonthCalendar from "@/components/trips/itinerary/MonthCalendar";
import {
  addPlaceToItinerary,
  removePlaceFromItinerary,
  updateItineraryItemAction,
  reorderItineraryItemsAction,
  moveItineraryItemAction,
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

let optimisticCounter = 0;
function nextOptimisticId() {
  optimisticCounter += 1;
  return `optimistic-${optimisticCounter}`;
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className="shrink-0 text-gray-400">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chip({ chip }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        chip.tone === "red" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-700"
      }`}
    >
      {chip.text}
    </span>
  );
}

function AddPlaceButton({ open, onToggle, className = "", panelProps }) {
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#7386f5] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5f70e0]"
      >
        + Agregar lugar
      </button>
      {open ? <AddPlacePanel {...panelProps} /> : null}
    </div>
  );
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
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
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

function formatTime(time) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("es-AR", { hour: "numeric", minute: "2-digit" }).format(date);
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityCard({ item, order, isLast, details, onEdit, onRemove, dragging }) {
  return (
    <div className="flex gap-4">
      <StopOrdinal order={order} highlighted={false} isLast={isLast} />
      <div className="mb-4 flex flex-1">
        <div
          className={`flex h-44 flex-1 overflow-hidden rounded-2xl border-2 border-[#7386f5] bg-white shadow-md transition-shadow ${
            dragging ? "shadow-2xl" : ""
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-semibold text-gray-900">{item.name}</p>
              {/* Editar y quitar juntos y chicos, arriba a la derecha de la card. */}
              <div className="flex shrink-0 items-center gap-1.5">
                {onEdit ? (
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label={`Editar ${item.name}`}
                    title="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7386f5] text-white shadow-md transition hover:bg-[#5f70e0]"
                  >
                    <PencilIcon />
                  </button>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Quitar ${item.name}`}
                    title="Quitar del itinerario"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition hover:border-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </div>
            </div>
            {item.time ? <p className="text-xs font-semibold text-[#7386f5]">{formatTime(item.time)}</p> : null}
            {item.description || details?.description ? (
              // Sin horario, la descripcion se separa un poco mas del titulo y los botones.
              <p className={`line-clamp-2 text-sm text-gray-600 ${item.time ? "" : "mt-2.5"}`}>
                {item.description || details.description}
              </p>
            ) : null}
            {item.note ? <p className="line-clamp-1 text-xs italic text-gray-500">“{item.note}”</p> : null}
            {/* Abierto/Cerrado siempre abajo a la izquierda, haya o no descripcion. */}
            <div className="mt-auto">
              <StatusLine details={details} />
            </div>
          </div>
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="w-40 shrink-0 object-cover" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortableActivityItem({ item, order, isLast, details, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
      <ActivityCard item={item} order={order} isLast={isLast} details={details} onEdit={onEdit} onRemove={onRemove} />
    </div>
  );
}

// A day's drop target - `useDroppable` here (not just the SortableContext)
// is what lets a day with zero activities still accept a drop: with no items
// there'd be nothing for dnd-kit to collide with otherwise, since
// SortableContext alone only registers its rendered items, not empty space.
function DayDropZone({ date, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: date });

  return (
    <div ref={setNodeRef} className={`rounded-2xl transition-colors ${isOver ? "bg-[#7386f5]/5" : ""}`}>
      {children}
    </div>
  );
}

export default function ItineraryView({ tripId, dateList, itinerary, cityByDate, itemDetails, favorites = [] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(dateList.includes(today) ? today : dateList[0]);
  const [collapsedDays, setCollapsedDays] = useState(() => new Set(dateList.slice(3)));
  const [calendarView, setCalendarView] = useState("week");
  const [localItinerary, setLocalItinerary] = useState(itinerary);
  const [openSearchDate, setOpenSearchDate] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [, startTransition] = useTransition();
  const dayRefs = useRef({});
  const dndId = useId();
  const dragSnapshotRef = useRef(null);
  const dragSourceDateRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setLocalItinerary(itinerary);
  }, [itinerary]);

  function selectDay(date) {
    setSelectedDate(date);
    setCollapsedDays((current) => {
      if (!current.has(date)) return current;
      const next = new Set(current);
      next.delete(date);
      return next;
    });
    requestAnimationFrame(() => dayRefs.current[date]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const closeSearch = useCallback(() => setOpenSearchDate(null), []);

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
    const optimisticItem = { ...place, id: nextOptimisticId() };
    setLocalItinerary((current) => ({ ...current, [date]: [...(current[date] || []), optimisticItem] }));
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

  function handleUpdateItem(date, itemId, { date: newDate, time, note, description }) {
    const previous = localItinerary;
    const targetDate = newDate || date;
    const original = (localItinerary[date] || []).find((item) => item.id === itemId);
    if (!original) return;
    const updated = { ...original, time: time || null, note: note || null, description: description || null };
    const fromItems = (localItinerary[date] || []).filter((item) => item.id !== itemId);
    const toItems =
      targetDate === date
        ? (localItinerary[date] || []).map((item) => (item.id === itemId ? updated : item))
        : [...(localItinerary[targetDate] || []), updated];

    setLocalItinerary((current) =>
      targetDate === date ? { ...current, [date]: toItems } : { ...current, [date]: fromItems, [targetDate]: toItems },
    );
    setEditingItemId(null);
    setError("");

    startTransition(async () => {
      try {
        if (targetDate !== date) {
          await moveItineraryItemAction(
            tripId,
            date,
            targetDate,
            fromItems.map((item) => item.id),
            toItems.map((item) => item.id),
          );
        }
        await updateItineraryItemAction(tripId, targetDate, itemId, { time, note, description });
        router.refresh();
      } catch {
        setLocalItinerary(previous);
        setError("No se pudo guardar los cambios. Intenta de nuevo.");
      }
    });
  }

  // Which day's array currently contains this item id.
  function findDateOf(itemId, source) {
    return Object.keys(source).find((date) => (source[date] || []).some((item) => item.id === itemId)) || null;
  }

  // `over.id` is either another activity's id (resolve to its day) or a
  // day's own date string, when hovering empty space inside a day that has
  // no items of its own to collide with. A day that never had an item yet
  // has no key in `localItinerary` at all, so this checks `dateList` (every
  // day of the trip) rather than the sparse itinerary object's own keys.
  function resolveOverDate(overId, source) {
    if (dateList.includes(overId)) {
      return overId;
    }
    return findDateOf(overId, source);
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
    dragSnapshotRef.current = localItinerary;
    dragSourceDateRef.current = findDateOf(event.active.id, localItinerary);
  }

  // Moves the item between days' arrays live, as the pointer crosses from one
  // day's drop zone into another, so the card visibly "jumps" to the day
  // under the cursor before the user even releases the mouse.
  function handleDragOver(event) {
    const { active, over } = event;
    if (!over) return;

    const fromDate = findDateOf(active.id, localItinerary);
    const toDate = resolveOverDate(over.id, localItinerary);
    if (!fromDate || !toDate || fromDate === toDate) return;

    setLocalItinerary((current) => {
      const sourceItems = [...(current[fromDate] || [])];
      const activeIndex = sourceItems.findIndex((item) => item.id === active.id);
      if (activeIndex === -1) return current;

      const [movedItem] = sourceItems.splice(activeIndex, 1);
      const destItems = [...(current[toDate] || [])];
      const overIndex = destItems.findIndex((item) => item.id === over.id);
      destItems.splice(overIndex >= 0 ? overIndex : destItems.length, 0, movedItem);

      return { ...current, [fromDate]: sourceItems, [toDate]: destItems };
    });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    const sourceDate = dragSourceDateRef.current;
    const snapshot = dragSnapshotRef.current;
    dragSourceDateRef.current = null;
    dragSnapshotRef.current = null;

    if (!over || !sourceDate) return;

    const finalDate = findDateOf(active.id, localItinerary);
    if (!finalDate) return;

    const currentItems = localItinerary[finalDate] || [];
    const activeIndex = currentItems.findIndex((item) => item.id === active.id);
    const overIndex = currentItems.findIndex((item) => item.id === over.id);
    const finalItems =
      overIndex >= 0 && activeIndex !== -1 && activeIndex !== overIndex
        ? arrayMove(currentItems, activeIndex, overIndex)
        : currentItems;

    if (finalItems !== currentItems) {
      setLocalItinerary((current) => ({ ...current, [finalDate]: finalItems }));
    }
    setError("");

    if (sourceDate === finalDate) {
      startTransition(async () => {
        try {
          await reorderItineraryItemsAction(tripId, finalDate, finalItems.map((item) => item.id));
        } catch {
          setLocalItinerary(snapshot);
          setError("No se pudo guardar el nuevo orden. Intenta de nuevo.");
        }
      });
      return;
    }

    const sourceItems = (localItinerary[sourceDate] || []).map((item) => item.id);
    startTransition(async () => {
      try {
        await moveItineraryItemAction(tripId, sourceDate, finalDate, sourceItems, finalItems.map((item) => item.id));
      } catch {
        setLocalItinerary(snapshot);
        setError("No se pudo mover la actividad. Intenta de nuevo.");
      }
    });
  }

  function handleDragCancel() {
    setActiveId(null);
    if (dragSnapshotRef.current) {
      setLocalItinerary(dragSnapshotRef.current);
    }
    dragSourceDateRef.current = null;
    dragSnapshotRef.current = null;
  }

  const selectedDateObj = dateObjFor(selectedDate);
  const activeDate = activeId ? findDateOf(activeId, localItinerary) : null;
  const activeItems = activeDate ? localItinerary[activeDate] || [] : [];
  const activeIndex = activeId ? activeItems.findIndex((item) => item.id === activeId) : -1;
  const activeItem = activeIndex >= 0 ? activeItems[activeIndex] : null;
  const editingDate = editingItemId ? findDateOf(editingItemId, localItinerary) : null;
  const editingItem = editingDate ? (localItinerary[editingDate] || []).find((item) => item.id === editingItemId) : null;
  const lastDate = dateList[dateList.length - 1];

  function dayChip(date, items) {
    const city = cityByDate[date]?.name;
    if (items.length === 0 && date === lastDate && dateList.length > 1) {
      return { text: "Vuelta ✈", tone: "gray" };
    }
    if (items.length === 0) {
      return { text: collapsedDays.has(date) ? "Sin actividades" : "0 lugares", tone: collapsedDays.has(date) ? "red" : "gray" };
    }
    const label = `${items.length} ${items.length === 1 ? "lugar" : "lugares"}`;
    return { text: city ? `${label} · ${city}` : label, tone: "gray" };
  }

  function addButtonProps(date, items) {
    return {
      open: openSearchDate === date,
      onToggle: () => setOpenSearchDate((current) => (current === date ? null : date)),
      panelProps: {
        date,
        city: cityByDate[date],
        favorites,
        dayItems: items,
        mapHref: `/dashboard/trips/${tripId}/lugares`,
        onAdd: (place) => handleAdd(date, place),
        onClose: closeSearch,
      },
    };
  }

  const months = [...new Set(dateList.map((date) => date.slice(0, 7)))];
  const selectedMonth = selectedDate.slice(0, 7);

  return (
    <div>
      <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        {/* Purely decorative - mimics the rings/pins of a physical wall calendar. */}
        <div className="mb-5 flex justify-between px-10">
          <span className="h-2.5 w-14 rounded-full bg-[#7386f5]" />
          <span className="h-2.5 w-14 rounded-full bg-[#7386f5]" />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-900">{capitalize(MONTH_FORMATTER.format(selectedDateObj))}</h2>
            {calendarView === "month" && months.length > 1 ? (
              <span className="flex gap-1">
                {months.map((month) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => setSelectedDate(dateList.find((date) => date.startsWith(month)))}
                    className={`h-2 w-2 rounded-full ${month === selectedMonth ? "bg-[#7386f5]" : "bg-gray-200"}`}
                    aria-label={`Ver ${month}`}
                  />
                ))}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
              {[
                { id: "week", label: "Semana" },
                { id: "month", label: "Mes" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCalendarView(option.id)}
                  className={`rounded-md px-3 py-1 transition ${
                    calendarView === option.id ? "bg-white font-semibold text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-5xl font-black text-gray-900">{DAY_NUMBER_FORMATTER.format(selectedDateObj)}</span>
          </div>
        </div>

        {calendarView === "month" ? (
          <div className="mt-5">
            <MonthCalendar
              month={selectedMonth}
              dateList={dateList}
              itinerary={localItinerary}
              cityByDate={cityByDate}
              selectedDate={selectedDate}
              onSelect={selectDay}
            />
          </div>
        ) : (
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
        )}
      </div>

      <div className="mt-10">
        <span className="inline-flex h-9 items-center rounded-r-full bg-[#7386f5] px-5 text-sm font-semibold text-white shadow-md">
          Itinerario
        </span>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mt-6 flex flex-col">
            {dateList.map((date) => {
              const items = localItinerary[date] || [];
              const collapsed = collapsedDays.has(date);
              const dateObj = dateObjFor(date);
              const chip = dayChip(date, items);
              const title = capitalize(DAY_HEADER_FORMATTER.format(dateObj));

              if (collapsed) {
                return (
                  <div
                    key={date}
                    id={`day-${date}`}
                    ref={(el) => {
                      dayRefs.current[date] = el;
                    }}
                    className="mb-3"
                  >
                    <DayDropZone date={date}>
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(date)}
                        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-left transition hover:border-[#7386f5]/40"
                      >
                        <span className="flex-1 text-base font-semibold text-gray-900">{title}</span>
                        <Chip chip={chip} />
                        <ChevronRightIcon />
                      </button>
                    </DayDropZone>
                  </div>
                );
              }

              return (
                <div
                  key={date}
                  id={`day-${date}`}
                  ref={(el) => {
                    dayRefs.current[date] = el;
                  }}
                  className="mb-10"
                >
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(date)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <h3 className="flex-1 text-xl font-bold text-gray-900">{title}</h3>
                    <Chip chip={chip} />
                    <ChevronDownIcon open />
                  </button>

                  <div className="mt-4">
                    <DayDropZone date={date}>
                      {items.length > 0 ? (
                        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                          <div className="grid gap-1">
                            {items.map((item, index) => (
                              <SortableActivityItem
                                key={item.id}
                                item={item}
                                order={index + 1}
                                isLast={index === items.length - 1}
                                details={itemDetails[item.id]}
                                onEdit={() => setEditingItemId(item.id)}
                                onRemove={() => handleRemove(date, item.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-gray-200 p-4">
                          <p className="text-sm text-gray-400">
                            Sin actividades :(
                            <br />
                            <span className="font-semibold text-gray-600">No olvides organizar tus días!</span>
                          </p>
                          <AddPlaceButton {...addButtonProps(date, items)} />
                        </div>
                      )}
                    </DayDropZone>

                    {items.length > 0 ? <AddPlaceButton {...addButtonProps(date, items)} className="mt-3 inline-block" /> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeItem ? (
              <ActivityCard item={activeItem} order={activeIndex + 1} isLast details={itemDetails[activeItem.id]} dragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {editingItem ? (
        <ActivityModal
          item={editingItem}
          date={editingDate}
          dateList={dateList}
          details={itemDetails[editingItem.id]}
          onCancel={() => setEditingItemId(null)}
          onSave={(data) => handleUpdateItem(editingDate, editingItem.id, data)}
          onRemove={() => {
            setEditingItemId(null);
            handleRemove(editingDate, editingItem.id);
          }}
        />
      ) : null}
    </div>
  );
}
