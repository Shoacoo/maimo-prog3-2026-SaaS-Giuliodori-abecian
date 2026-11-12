"use client";

import { useEffect, useRef, useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

// Scrollbar fina pero siempre visible, para que se note que la lista scrollea.
const columnClass =
  "flex h-32 flex-col gap-0.5 overflow-y-scroll rounded-lg bg-gray-50 p-1 [scrollbar-color:#7386f5_#eef0fe] [scrollbar-width:thin]";

function Column({ label, options, value, onPick, open }) {
  const listRef = useRef(null);

  // Al abrir, la opcion elegida queda a la vista dentro de la columna.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    if (active) listRef.current.scrollTop = active.offsetTop - listRef.current.clientHeight / 2 + active.clientHeight / 2;
  }, [open]);

  return (
    <div className="flex flex-1 flex-col gap-1">
      <span className="text-center text-[10px] font-semibold uppercase text-gray-400">{label}</span>
      <div ref={listRef} className={columnClass} role="listbox" aria-label={label}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={active}
              data-active={active}
              onClick={() => onPick(option)}
              className={`shrink-0 rounded-md py-1 text-xs font-medium transition ${
                active ? "bg-[#7386f5] text-white" : "text-gray-700 hover:bg-[#7386f5]/10"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Selector de hora compacto: reemplaza los <select> nativos (su lista se
// abria enorme y tapaba el popover). Se despliega en linea, debajo del
// boton, con dos columnas scrolleables. `value` es "HH:MM" o null.
export default function TimePicker({ value, onChange, label = "Hora (opcional)", className = "" }) {
  const [open, setOpen] = useState(false);
  const [hour, minute] = value ? value.split(":") : ["", "00"];

  function pickHour(nextHour) {
    onChange(`${nextHour}:${MINUTES.includes(minute) ? minute : "00"}`);
  }

  function pickMinute(nextMinute) {
    onChange(`${hour || "09"}:${nextMinute}`);
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className={`flex items-center gap-2 text-xs ${label ? "justify-between" : ""}`}>
        {label ? <span className="font-normal text-gray-700">{label}</span> : null}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition ${
            open ? "border-[#7386f5] text-[#7386f5]" : "border-gray-200 text-gray-800 hover:border-gray-300"
          }`}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {value || "--:--"}
          <span className={`text-[9px] transition ${open ? "rotate-180" : ""}`}>▼</span>
        </button>
      </div>

      {open ? (
        <div className="rounded-xl border border-gray-100 p-2 shadow-sm">
          <div className="flex gap-2">
            <Column label="Hora" options={HOURS} value={hour} onPick={pickHour} open={open} />
            <Column label="Min" options={MINUTES} value={hour ? minute : ""} onPick={pickMinute} open={open} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-gray-400 hover:text-gray-700"
            >
              Sin hora
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-[#7386f5] hover:underline">
              Listo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
