"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const DAY_MS = 24 * 60 * 60 * 1000;

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className="shrink-0 text-[#7386f5]">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function toISODate(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplay(date) {
  return date
    ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
    : "";
}

function sameDay(a, b) {
  return Boolean(a && b) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function nightsBetween(start, end) {
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function monthTitle(date) {
  const text = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date).replace(" de ", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function monthCells(view) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // lunes primero
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];
}

function Field({ label, value, active, onClick }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className={`flex h-12 w-full items-center gap-2.5 rounded-xl border px-4 text-left text-base outline-none transition ${
          active ? "border-[#7386f5] bg-white ring-1 ring-[#7386f5]" : "border-gray-200 bg-gray-50"
        }`}
      >
        <CalendarIcon />
        <span className={value ? "text-gray-900" : "text-gray-400"}>{value ? formatDisplay(value) : "dd/mm/aaaa"}</span>
      </button>
    </div>
  );
}

export default function DateRangeField({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState("start");
  const [view, setView] = useState(() => startDate || new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function openAt(date, which) {
    setView(date || startDate || new Date());
    setField(which);
    setOpen(true);
  }

  function pick(day) {
    if (!startDate || endDate || day < startDate) {
      onChange({ startDate: day, endDate: null });
      setField("end");
    } else {
      onChange({ startDate, endDate: day });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nights = nightsBetween(startDate, endDate);
  const editingEnd = open && Boolean(startDate) && (!endDate || field === "end");

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Field
          label="Fecha de inicio"
          value={startDate}
          active={open && !editingEnd}
          onClick={() => openAt(startDate, "start")}
        />
        <Field
          label="Fecha de finalizacion"
          value={endDate}
          active={editingEnd}
          onClick={() => openAt(endDate || startDate, "end")}
        />
      </div>

      <input type="hidden" name="startDate" value={toISODate(startDate)} readOnly />
      <input type="hidden" name="endDate" value={toISODate(endDate)} readOnly />

      {open ? (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-[296px] rounded-2xl border border-gray-100 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
            >
              ‹
            </button>
            <p className="text-[15px] font-semibold text-gray-900">{monthTitle(view)}</p>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="pb-1 text-[11px] font-medium text-gray-400">
                {day}
              </span>
            ))}
            {monthCells(view).map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const isEdge = sameDay(day, startDate) || sameDay(day, endDate);
              const inRange = startDate && endDate && day > startDate && day < endDate;
              const past = day < today;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={past}
                  onClick={() => pick(day)}
                  className={`h-8 rounded-lg text-[13px] transition disabled:cursor-not-allowed disabled:text-gray-300 ${
                    isEdge
                      ? "bg-[#7386f5] font-semibold text-white"
                      : inRange
                        ? "bg-[#7386f5]/10 font-medium text-[#7386f5]"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-medium text-[#7386f5]">
              {endDate ? `${nights} ${nights === 1 ? "noche" : "noches"} • ${nights + 1} días` : "Elegí la fecha de vuelta"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#7386f5] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#5f70e0]"
            >
              Listo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
