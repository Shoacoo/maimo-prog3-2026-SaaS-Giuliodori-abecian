"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className="text-gray-400">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatDisplay(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function toISODate(date) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DateField({ label, name, value, onChange, minDate }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <span className="mb-2 block text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 text-left outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>{value ? formatDisplay(value) : "dd/mm/aaaa"}</span>
        <CalendarIcon />
      </button>

      <input type="hidden" name={name} value={toISODate(value)} readOnly />

      {open ? (
        <div className="scheme-light absolute z-20 mt-2 rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg">
          <DayPicker
            mode="single"
            locale={undefined}
            selected={value || undefined}
            defaultMonth={value || minDate || undefined}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(date) => {
              onChange(date || null);
              setOpen(false);
            }}
            classNames={{
              today: "rdp-today text-[#7386f5] font-semibold",
              selected: "rdp-selected bg-[#7386f5] text-white rounded-full",
              day_button: "rdp-day_button rounded-full hover:bg-[#7386f5]/10",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
