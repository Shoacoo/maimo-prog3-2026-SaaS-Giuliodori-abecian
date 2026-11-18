"use client";

import { useTripPlan } from "@/components/trips/TripPlanProvider";

// Corazon para guardar un lugar en los favoritos del viaje. Funciona en
// cualquier pantalla envuelta en TripPlanProvider; fuera de un viaje no se
// muestra.
export default function FavoriteButton({ place, className = "", size = "md" }) {
  const plan = useTripPlan();
  if (!plan?.toggleFavorite) return null;

  const placeId = place.placeId || place.id;
  const saved = plan.isFavorite(placeId);
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? 15 : 18;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        plan.toggleFavorite(place);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${place.name} de favoritos` : `Agregar ${place.name} a favoritos`}
      title={saved ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-white/95 shadow-md transition hover:scale-110 active:scale-95 ${
        saved ? "text-rose-500" : "text-gray-500 hover:text-rose-500"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" width={icon} height={icon} aria-hidden="true">
        <path
          d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.7 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.2 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4Z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
