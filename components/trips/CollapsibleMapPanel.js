"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "triphy:map-panel";

function Chevron({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d={direction === "right" ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Panel del mapa a la derecha de las pantallas del viaje, plegable hacia el
// borde derecho para darle mas espacio al contenido. El mapa queda montado y
// con su ancho fijo adentro: solo se anima el ancho del contenedor que lo
// recorta, asi Google Maps no se redimensiona (ni queda gris al reabrirlo).
// La eleccion se recuerda en este navegador.
export default function CollapsibleMapPanel({ children }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(STORAGE_KEY) === "closed") setOpen(false);
    } catch {}
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "open" : "closed");
    } catch {}
  }

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Ocultar mapa" : "Mostrar mapa"}
        title={open ? "Ocultar mapa" : "Mostrar mapa"}
        className={`absolute top-24 z-20 flex -translate-x-full items-center gap-1.5 rounded-l-xl border border-r-0 border-gray-200 bg-white text-gray-600 shadow-md transition hover:text-[#7386f5] ${
          open ? "left-px h-10 w-7 justify-center" : "left-0 h-auto flex-col px-2 py-3"
        }`}
      >
        {open ? (
          <Chevron direction="right" />
        ) : (
          <>
            <span className="text-[#7386f5]">
              <MapIcon />
            </span>
            <span className="text-[11px] font-semibold [writing-mode:vertical-rl]">Mapa</span>
            <Chevron direction="left" />
          </>
        )}
      </button>

      <div
        className={`h-full overflow-hidden border-gray-100 transition-[width] duration-300 ease-out ${
          open ? "w-96 border-l xl:w-120" : "w-0"
        }`}
      >
        <div className="h-full w-96 xl:w-120" inert={!open}>
          {children}
        </div>
      </div>
    </aside>
  );
}
