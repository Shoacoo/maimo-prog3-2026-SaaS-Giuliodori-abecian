"use client";

import { useId, useState, useTransition } from "react";
import Image from "next/image";
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
import { reorderTripStops } from "@/app/dashboard/trips/actions";
import StopOrdinal from "@/components/trips/StopOrdinal";

function PinIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StopProgress({ progress, highlighted }) {
  if (!progress) {
    return null;
  }

  const percent = progress.target ? Math.min(100, (progress.done / progress.target) * 100) : 0;
  return (
    <div className="flex w-full items-center gap-2.5 pt-1.5">
      <div className={`h-1.5 flex-1 overflow-hidden rounded-[3px] ${highlighted ? "bg-white/30" : "bg-gray-100"}`}>
        <div
          className={`h-full rounded-[3px] ${highlighted ? "bg-white" : "bg-[#7386f5]"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={`shrink-0 text-xs font-medium ${highlighted ? "text-white/80" : "text-gray-500"}`}>
        {progress.done} / {progress.target} lugares
      </p>
    </div>
  );
}

function StopCard({ stop, order, highlighted, isLast, dragging, progress }) {
  return (
    <div className="flex gap-5">
      <StopOrdinal order={order} highlighted={highlighted} isLast={isLast} />

      <div
        className={`mb-6 flex h-28 w-full max-w-[448px] overflow-hidden rounded-2xl shadow-md transition-shadow ${
          highlighted ? "" : "border border-gray-100"
        } ${dragging ? "shadow-2xl" : ""}`}
      >
        <div className="relative w-[40%] shrink-0 bg-gray-100">
          {stop.image ? <Image src={stop.image} alt={stop.name} fill sizes="180px" className="object-cover" /> : null}
        </div>
        <div className={`flex min-w-0 flex-1 flex-col justify-center gap-1 px-5 ${highlighted ? "bg-[#7386f5]" : "bg-white"}`}>
          <p className={`text-xs font-medium ${highlighted ? "text-white" : "text-gray-400"}`}>Parada</p>
          <p className={`flex items-center gap-1.5 text-lg font-bold ${highlighted ? "text-white" : "text-gray-900"}`}>
            <PinIcon className={highlighted ? "text-white" : "text-[#7386f5]"} />
            <span className="truncate">{stop.name}</span>
          </p>
          <StopProgress progress={progress} highlighted={highlighted} />
        </div>
      </div>
    </div>
  );
}

function SortableStop({ stop, order, highlighted, isLast, progress }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
      <StopCard stop={stop} order={order} highlighted={highlighted} isLast={isLast} progress={progress} />
    </div>
  );
}

export default function TripStepper({ tripId, stops: initialStops, progress = [] }) {
  const progressById = Object.fromEntries(progress.map((item) => [item.id, item]));
  const dndId = useId();
  const [stops, setStops] = useState(initialStops);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

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

    const oldIndex = stops.findIndex((stop) => stop.id === active.id);
    const newIndex = stops.findIndex((stop) => stop.id === over.id);
    const previous = stops;
    const reordered = arrayMove(stops, oldIndex, newIndex);
    setStops(reordered);
    setError("");

    startTransition(async () => {
      try {
        await reorderTripStops(tripId, reordered);
      } catch {
        setStops(previous);
        setError("No se pudo guardar el nuevo orden. Intenta de nuevo.");
      }
    });
  }

  const activeStop = stops.find((stop) => stop.id === activeId);
  const activeIndex = activeStop ? stops.findIndex((stop) => stop.id === activeId) : -1;

  return (
    <div>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => setActiveId(event.active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={stops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col">
            {stops.map((stop, index) => (
              <SortableStop
                key={stop.id}
                stop={stop}
                order={index + 1}
                highlighted={index === 0}
                isLast={index === stops.length - 1}
                progress={progressById[stop.id]}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeStop ? (
            <StopCard
              stop={activeStop}
              order={activeIndex + 1}
              highlighted={activeIndex === 0}
              isLast
              dragging
              progress={progressById[activeStop.id]}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
