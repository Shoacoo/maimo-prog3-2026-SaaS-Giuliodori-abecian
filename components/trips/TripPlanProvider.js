"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { toggleFavoritePlace } from "@/app/dashboard/trips/actions";

const TripPlanContext = createContext(null);

// Ademas del plan del viaje, guarda el estado de favoritos compartido por
// todos los corazones de la pantalla: si un lugar aparece en dos tarjetas
// (recomendaciones y listado) las dos se actualizan juntas.
export function TripPlanProvider({ plan, children }) {
  // Cambios optimistas (placeId -> guardado o no) encima de lo que trajo el
  // servidor; cuando la pagina se revalida, plan.favoriteIds ya coincide.
  const [overrides, setOverrides] = useState({});
  const [, startTransition] = useTransition();
  const serverFavorites = plan?.favoriteIds;
  const tripId = plan?.tripId;

  const isFavorite = useCallback(
    (placeId) => (placeId in overrides ? overrides[placeId] : Boolean(serverFavorites?.includes(placeId))),
    [overrides, serverFavorites],
  );

  const toggleFavorite = useCallback(
    (place) => {
      const placeId = place.placeId || place.id;
      if (!tripId || !placeId) return;
      const previous = placeId in overrides ? overrides[placeId] : Boolean(serverFavorites?.includes(placeId));
      setOverrides((current) => ({ ...current, [placeId]: !previous }));
      startTransition(async () => {
        try {
          const result = await toggleFavoritePlace(tripId, {
            placeId,
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            image: place.image,
            category: place.category,
            description: place.description || null,
            city: place.city || place.cityName || null,
          });
          setOverrides((current) => ({ ...current, [placeId]: result.saved }));
        } catch {
          setOverrides((current) => ({ ...current, [placeId]: previous }));
        }
      });
    },
    [tripId, overrides, serverFavorites],
  );

  const value = useMemo(() => (plan ? { ...plan, isFavorite, toggleFavorite } : null), [plan, isFavorite, toggleFavorite]);

  return <TripPlanContext.Provider value={value}>{children}</TripPlanContext.Provider>;
}

export function useTripPlan() {
  return useContext(TripPlanContext);
}
