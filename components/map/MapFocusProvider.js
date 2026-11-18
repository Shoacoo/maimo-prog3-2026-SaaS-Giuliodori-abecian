"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";

const MapFocusContext = createContext(null);

// Conecta las tarjetas de una pagina con el mapa de la derecha: una tarjeta
// llama a focusPlace(lugar) y el mapa lo marca y hace zoom. Devuelve false si
// no hay mapa visible (pantallas chicas, donde el panel del mapa se oculta),
// para que la tarjeta pueda abrir Google Maps como alternativa.
export function MapFocusProvider({ children }) {
  const handlerRef = useRef(null);

  const register = useCallback((handler) => {
    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) handlerRef.current = null;
    };
  }, []);

  const focusPlace = useCallback((place) => Boolean(handlerRef.current?.(place)), []);

  const value = useMemo(() => ({ register, focusPlace }), [register, focusPlace]);

  return <MapFocusContext.Provider value={value}>{children}</MapFocusContext.Provider>;
}

export function useMapFocus() {
  return useContext(MapFocusContext);
}
