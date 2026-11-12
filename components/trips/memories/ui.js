"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// Piezas chicas reutilizadas por la vista de Recuerdos y sus modales.

export function ModalShell({ children, onClose, locked = false, width = "max-w-[640px]", label }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event) {
      if (event.key === "Escape" && !locked) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, locked]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !locked) onClose();
      }}
    >
      <div className={`scheme-light my-auto w-full ${width} rounded-[20px] bg-white px-6 py-7 shadow-2xl sm:px-8`}>{children}</div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ title, subtitle, onClose, locked }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[22px] font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={locked}
        aria-label="Cerrar"
        className="shrink-0 text-gray-400 transition hover:text-gray-700 disabled:opacity-40"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#7386f5] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(115,134,245,0.35)] transition hover:bg-[#5f70e0] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-[#7386f5] bg-white px-[18px] py-2 text-sm font-semibold text-[#7386f5] transition hover:bg-[#7386f5]/5 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-medium text-gray-900">
      <span>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-gray-400">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-900 outline-none transition focus:border-[#7386f5] focus:bg-white";

export function Select({ value, onChange, children, icon, ...props }) {
  return (
    <span className="relative flex items-center">
      {icon ? <span className="pointer-events-none absolute left-3 text-[#7386f5]">{icon}</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} appearance-none pr-9 ${icon ? "pl-9" : ""}`}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 text-gray-500">
        <ChevronDownIcon />
      </span>
    </span>
  );
}

export function PlaceChip({ children, active = false, onClick, onRemove }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-[#7386f5] bg-[#7386f5]/10 text-[#7386f5]"
          : "border-transparent bg-gray-100 text-gray-600" + (onClick ? " hover:bg-gray-200" : "")
      }`}
    >
      <PinIcon size={11} />
      {children}
      {onRemove ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Quitar ${children}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 text-gray-400 hover:text-gray-700"
        >
          ✕
        </span>
      ) : null}
    </Tag>
  );
}

export function PinIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="15" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="10.5" r="1.8" stroke="currentColor" strokeWidth="2" />
      <path d="m4 18 5-4.5 3.5 3 3-2.5L20 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
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

// Sugerencias de lugares para una ciudad (y opcionalmente un dia): primero
// lo del itinerario, despues favoritos de esa ciudad, sin repetir nombres.
export function suggestionsFor(suggestions, stop, date) {
  if (!stop) return [];
  const seen = new Set();
  return suggestions
    .filter((place) => (place.date ? (date ? place.date === date : stop.dates.includes(place.date)) : place.city === stop.name))
    .filter((place) => {
      const key = place.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

// Dia por defecto al subir o escribir: hoy si cae en esa parada, si no el
// primer dia de la parada.
export function defaultDateFor(stop) {
  if (!stop?.dates.length) return "";
  const today = new Date().toISOString().slice(0, 10);
  return stop.dates.includes(today) ? today : stop.dates[0];
}
