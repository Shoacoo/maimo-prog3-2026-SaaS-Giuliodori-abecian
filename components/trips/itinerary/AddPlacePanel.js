"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "favorites", label: "♡ Favoritos" },
  { id: "restaurant", label: "Restaurantes", query: "restaurantes", category: "Restaurante" },
  { id: "tourist_attraction", label: "Atracciones", query: "atracciones turísticas", category: "Atraccion turistica" },
  { id: "museum", label: "Museos", query: "museos", category: "Museo" },
];

const SHORT_DATE = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric" });

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true" className="shrink-0 text-gray-500">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Row({ place, meta, added, onAdd }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-1.5 py-2 ${added ? "" : "hover:bg-gray-50"}`}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {place.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.image} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{place.name}</p>
        <p className="truncate text-[11px] text-gray-500">{meta}</p>
      </div>
      {added ? (
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
          ✓ Agregado
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-full bg-[#7386f5] px-2.5 py-0.5 text-[10px] font-semibold text-white transition hover:bg-[#5f70e0]"
        >
          + Agregar
        </button>
      )}
    </div>
  );
}

function Status({ openNow }) {
  if (openNow === null || openNow === undefined) return null;
  return openNow ? (
    <span className="ml-1.5 font-medium text-emerald-600">Abierto</span>
  ) : (
    <span className="ml-1.5 font-medium text-red-500">Cerrado</span>
  );
}

// Panel "agregar lugar" de un dia del itinerario (diseño 05b): favoritos de
// la ciudad del dia + busqueda en Google Places con filtros por categoria.
export default function AddPlacePanel({ date, city, favorites, dayItems, onAdd, onClose, mapHref }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const active = FILTERS.find((item) => item.id === filter);
  const searchText = query.trim() || (active.query && city ? `${active.query} en ${city.name}` : "");

  useEffect(() => {
    if (!searchText || filter === "favorites") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: searchText });
        if (city) {
          params.set("lat", String(city.lat));
          params.set("lng", String(city.lng));
        }
        if (active.query) params.set("type", active.id);
        const data = await (await fetch(`/api/places/text-search?${params}`)).json();
        if (!cancelled) setResults(data.results || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchText, filter, city, active]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    }
    function handleEscape(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const addedIds = new Set(dayItems.map((item) => item.placeId));
  const cityFavorites = favorites.filter((place) => {
    if (filter !== "favorites" && city && place.city && place.city !== city.name) return false;
    if (query.trim() && !place.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (active.category && place.category !== active.category) return false;
    return true;
  });
  const showResults = filter !== "favorites";

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full z-30 mt-2 w-[min(600px,calc(100vw-4rem))] rounded-2xl border border-gray-100 bg-white p-4 shadow-xl"
    >
      <div className="flex h-11 items-center gap-2.5 rounded-xl border-2 border-[#7386f5] px-3">
        <SearchIcon />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={city ? `Buscar lugares en ${city.name}...` : "Buscar lugares..."}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
        />
        {loading ? <span className="text-xs text-gray-400">Buscando...</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              filter === item.id ? "bg-[#7386f5] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto">
        {cityFavorites.length > 0 ? (
          <>
            <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase text-gray-400">
              Tus favoritos{city && filter !== "favorites" ? ` en ${city.name}` : ""}
            </p>
            {cityFavorites.map((place) => {
              const added = addedIds.has(place.placeId);
              return (
                <Row
                  key={place.placeId}
                  place={place}
                  added={added}
                  meta={
                    <>
                      {[place.category, place.rating ? `${place.rating} ★` : null].filter(Boolean).join(" · ")}
                      {added ? <span className="ml-1.5 font-medium text-emerald-600">Ya está en este día</span> : null}
                    </>
                  }
                  onAdd={() => onAdd(place)}
                />
              );
            })}
          </>
        ) : filter === "favorites" ? (
          <p className="px-1.5 py-3 text-sm text-gray-400">Todavía no guardaste favoritos para este viaje.</p>
        ) : null}

        {showResults && results.length > 0 ? (
          <>
            <p className="mt-2 px-1.5 pb-1 text-[10px] font-semibold uppercase text-gray-400">
              {query.trim() ? `Resultados para “${query.trim()}”` : `${active.label} en ${city?.name || "la zona"}`}
            </p>
            {results.map((place) => (
              <Row
                key={place.placeId}
                place={place}
                added={addedIds.has(place.placeId)}
                meta={
                  <>
                    {[
                      place.category,
                      place.rating ? `${place.rating} ★` : null,
                      place.distanceKm !== null ? `a ${place.distanceKm} km` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <Status openNow={place.openNow} />
                  </>
                }
                onAdd={() => onAdd(place)}
              />
            ))}
          </>
        ) : null}

        {showResults && !loading && searchText && results.length === 0 ? (
          <p className="px-1.5 py-3 text-sm text-gray-400">No encontramos lugares para esa búsqueda.</p>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px]">
        <span className="text-gray-500">
          Se agrega al {capitalize(SHORT_DATE.format(new Date(`${date}T00:00:00`)))} · podés cambiar la hora después
        </span>
        {mapHref ? (
          <Link href={mapHref} className="font-semibold text-[#7386f5] hover:underline">
            Ver en el mapa →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
