"use client";

import { useEffect, useRef, useState } from "react";
import { getFlagUrl } from "@/lib/countries/flags";
import AddToItineraryButton from "@/components/trips/AddToItineraryButton";

const SCROLLBAR_CLASSES =
  "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#7386f5]/40";

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className="text-[#7386f5]">
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

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true" className="text-[#7386f5]">
      <path d="M12 3c.6 3.2 1.9 4.7 5 5.3-3.1.6-4.4 2.1-5 5.3-.6-3.2-1.9-4.7-5-5.3 3.1-.6 4.4-2.1 5-5.3Z" />
      <path d="M19 13.5c.3 1.6.9 2.3 2.5 2.6-1.6.3-2.2 1-2.5 2.6-.3-1.6-.9-2.3-2.5-2.6 1.6-.3 2.2-1 2.5-2.6Z" />
    </svg>
  );
}

function StarRating({ value }) {
  if (!value) {
    return null;
  }

  return (
    <span className="text-[#7386f5]">
      {"★".repeat(Math.round(value))}
      <span className="text-gray-300">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

function StatusLine({ openNow }) {
  if (openNow === null || openNow === undefined) {
    return null;
  }

  return (
    <p className="text-xs font-semibold">
      {openNow ? <span className="text-emerald-600">Abierto</span> : <span className="text-red-500">Cerrado</span>}
    </p>
  );
}

// Fetches real editorial-summary descriptions (batched, New Places API) for
// whichever place ids are actually visible right now - never for the full
// unfiltered result set, since that can be in the hundreds.
function useDescriptions(visibleIds) {
  const [descriptions, setDescriptions] = useState({});
  const requestedRef = useRef(new Set());
  const key = visibleIds.join(",");

  useEffect(() => {
    const missing = visibleIds.filter((id) => !requestedRef.current.has(id));
    if (missing.length === 0) {
      return;
    }
    missing.forEach((id) => requestedRef.current.add(id));

    fetch(`/api/places/descriptions?placeIds=${missing.join(",")}`)
      .then((response) => response.json())
      .then((data) => setDescriptions((current) => ({ ...current, ...(data.descriptions || {}) })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return descriptions;
}


function PlaceCard({ place, description, dateList, tripId, className = "", recommended = false }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md ${className}`}>
      <div className="relative h-36 w-full shrink-0">
        {place.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.image} alt={place.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gray-100" />
        )}
        {recommended ? (
          <span
            title="Recomendado por Triphy"
            className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="Recomendado por Triphy" className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-bold text-gray-900">{place.name}</p>
          {place.rating ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-600">
              {place.rating}
              <StarRating value={place.rating} />
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-500">{place.category}</p>
        <StatusLine openNow={place.openNow} />
        {description ? <p className="text-xs text-gray-500">{description}</p> : null}
        <div className="mt-auto pt-3">
          <AddToItineraryButton place={place} dateList={dateList} tripId={tripId} />
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 30;

export default function PlacesExplorer({ tripId, dateList, destinations, places, categories }) {
  const [activeCity, setActiveCity] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const carouselRef = useRef(null);

  function toggleCategory(type) {
    setActiveCategory((current) => (current === type ? null : type));
    setVisibleCount(PAGE_SIZE);
  }

  function toggleCity(cityName) {
    setActiveCity((current) => (current === cityName ? null : cityName));
    setVisibleCount(PAGE_SIZE);
  }

  // Rating alone surfaces obscure spots with only a handful of reviews (a
  // goat pen, a single food stall) - those almost never have a Google
  // editorial summary. Prefer well-reviewed, well-known highlight places
  // when there are enough of them, since they both make better
  // recommendations and are far more likely to actually have a description.
  const highlightedPlaces = places.filter((place) => place.highlight);
  const wellKnownPlaces = highlightedPlaces.filter((place) => (place.ratingsCount || 0) >= 200);
  const recommendations = (wellKnownPlaces.length >= 4 ? wellKnownPlaces : highlightedPlaces)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 8);

  const filteredPlaces = places.filter(
    (place) => (!activeCity || place.cityName === activeCity) && (!activeCategory || place.type === activeCategory),
  );

  const visiblePlaces = filteredPlaces.slice(0, visibleCount);
  const visibleIds = Array.from(new Set([...recommendations, ...visiblePlaces].map((place) => place.id)));

  const descriptions = useDescriptions(visibleIds);

  return (
    <div>
      {recommendations.length > 0 ? (
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            Recomendaciones de Triphy
            <SparkleIcon />
          </h2>
          <div className="relative mt-4">
            <div ref={carouselRef} className={`flex gap-4 overflow-x-auto pb-3 ${SCROLLBAR_CLASSES}`}>
              {recommendations.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  description={descriptions[place.id]}
                  dateList={dateList}
                  tripId={tripId}
                  className="w-72 shrink-0"
                  recommended
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => carouselRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
              aria-label="Ver mas recomendaciones"
              className="absolute right-0 top-1/3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-500 shadow-xl transition hover:text-[#7386f5]"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      ) : null}

      {destinations.length > 0 ? (
        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            Paradas
            <PinIcon />
          </h2>
          <div className="mt-4 flex flex-wrap gap-5">
            {destinations.map((destination) => {
              const flagUrl = getFlagUrl(destination.countryCode, destination.country);
              const selected = activeCity === destination.name;
              return (
                <button
                  key={destination.id || destination.name}
                  type="button"
                  onClick={() => toggleCity(destination.name)}
                  className={`relative h-52 w-52 shrink-0 overflow-hidden rounded-3xl shadow-lg transition ${
                    selected ? "ring-4 ring-[#7386f5]" : ""
                  }`}
                >
                  {destination.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={destination.image} alt={destination.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gray-100" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  {flagUrl ? (
                    <span className="absolute right-3 top-3 h-8 w-8 overflow-hidden rounded-full ring-2 ring-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flagUrl} alt={destination.country} className="h-full w-full object-cover" />
                    </span>
                  ) : null}
                  <span className="absolute bottom-3 left-0 right-0 text-center text-lg font-bold text-white">
                    {destination.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900">Categorías</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => {
            const active = activeCategory === category.type;
            return (
              <button
                key={category.type}
                type="button"
                onClick={() => toggleCategory(category.type)}
                className={`flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-medium shadow-sm transition ${
                  active ? "bg-[#7386f5] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-white" : "bg-[#7386f5]/50"}`}
                  aria-hidden="true"
                />
                <span className="truncate">{category.label}</span>
              </button>
            );
          })}
        </div>

        {filteredPlaces.length > 0 ? (
          <>
            <p className="mt-6 text-sm text-gray-400">
              {filteredPlaces.length} {filteredPlaces.length === 1 ? "lugar encontrado" : "lugares encontrados"}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  description={descriptions[place.id]}
                  dateList={dateList}
                  tripId={tripId}
                />
              ))}
            </div>
            {visibleCount < filteredPlaces.length ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                  className="h-11 rounded-full bg-gray-100 px-6 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200"
                >
                  Cargar mas lugares
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-sm text-gray-400">No hay lugares que coincidan con estos filtros.</p>
        )}
      </div>
    </div>
  );
}
