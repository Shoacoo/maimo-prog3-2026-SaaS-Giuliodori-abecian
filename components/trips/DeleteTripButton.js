"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteTrip } from "@/app/dashboard/trips/actions";

function plural(count, singular, pluralWord) {
  return count === 1 ? singular : pluralWord;
}

// Boton ✕ de la tarjeta de viaje + modal de confirmacion (diseño 02b).
export default function DeleteTripButton({ tripId, tripName, stats }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape" && !isPending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isPending]);

  function confirmDelete() {
    startTransition(async () => {
      await deleteTrip(tripId);
      setOpen(false);
    });
  }

  const items = [
    { value: stats.activities, label: plural(stats.activities, "actividad", "actividades") },
    { value: stats.places, label: plural(stats.places, "lugar", "lugares") },
    { value: stats.notes, label: plural(stats.notes, "nota", "notas") },
    { value: stats.companions, label: plural(stats.companions, "compañero", "compañeros") },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Eliminar viaje"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-md transition hover:bg-white"
      >
        ✕
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-gray-900/40 px-4"
              onClick={() => !isPending && setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-trip-title"
                onClick={(event) => event.stopPropagation()}
                className="flex w-full max-w-[480px] flex-col items-center gap-4 rounded-[20px] bg-white px-8 pb-7 pt-8 shadow-xl"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-[28px]" aria-hidden="true">
                  🗑️
                </div>
                <h2 id="delete-trip-title" className="text-center text-[22px] font-bold text-gray-900">
                  ¿Eliminar “{tripName}”?
                </h2>
                <p className="text-center text-[15px] text-gray-500">
                  Se van a borrar su itinerario, lugares guardados, notas y gastos. Tus compañeros también pierden el
                  acceso. Esta acción no se puede deshacer.
                </p>
                <div className="flex w-full items-start justify-between rounded-xl bg-gray-50 px-4 py-3">
                  {items.map((item) => (
                    <div key={item.label} className="flex flex-col items-center">
                      <span className="text-lg font-bold text-gray-900">{item.value}</span>
                      <span className="text-xs text-gray-500">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                    className="flex-1 rounded-[10px] border border-gray-200 py-[13px] text-[15px] font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={isPending}
                    className="flex-1 rounded-[10px] bg-red-500 py-[13px] text-[15px] font-semibold text-white transition hover:bg-red-600 disabled:opacity-70"
                  >
                    {isPending ? "Eliminando..." : "Sí, eliminar viaje"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
