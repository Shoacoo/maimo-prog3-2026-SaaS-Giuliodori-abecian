"use client";

import { useEffect, useState } from "react";
import AddToItineraryButton from "@/components/trips/AddToItineraryButton";
import FavoriteButton from "@/components/trips/FavoriteButton";
import { PinIcon } from "@/components/trips/memories/ui";
import { useMapFocus } from "@/components/map/MapFocusProvider";

function SouvenirCard({ place, cityName, focused, onShowOnMap }) {
  const km = place.distanceKm !== null ? String(place.distanceKm).replace(".", ",") : null;
  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        focused ? "border-[#7386f5] ring-2 ring-[#7386f5]/30" : "border-gray-200"
      }`}
    >
      <div className="relative h-36 shrink-0 bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.image} alt={place.name} loading="lazy" className="h-full w-full object-cover" />
        <FavoriteButton place={{ ...place, city: cityName }} size="sm" className="absolute right-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h4 className="line-clamp-1 font-semibold text-gray-900" title={place.name}>
          {place.name}
        </h4>
        <p className="truncate text-xs text-gray-500">
          {place.typeLabel ? `${place.typeLabel} · ` : ""}
          <span className="font-medium text-gray-700">★ {Number(place.rating).toFixed(1)}</span> ({place.ratingsCount.toLocaleString("es-AR")})
        </p>
        {place.address ? (
          <p className="flex items-start gap-1 text-xs text-gray-500">
            <span className="mt-px shrink-0 text-[#7386f5]">
              <PinIcon size={11} />
            </span>
            <span className="line-clamp-1">
              {place.address}
              {km ? ` · a ${km} km del centro` : ""}
            </span>
          </p>
        ) : null}
        {place.openNow !== null ? (
          <p className={`text-xs font-semibold ${place.openNow ? "text-emerald-600" : "text-red-500"}`}>
            {place.openNow ? "Abierto ahora" : "Cerrado ahora"}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <AddToItineraryButton
            place={{ ...place, cityName }}
            compact
            direction="up"
            label="+ Itinerario"
            buttonClassName="inline-flex h-8 items-center justify-center rounded-full bg-[#7386f5] px-3.5 text-xs font-semibold text-white transition hover:bg-[#5f70e0]"
          />
          <button
            type="button"
            onClick={() => onShowOnMap(place)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#7386f5] hover:underline"
          >
            <PinIcon size={12} /> {focused ? "En el mapa" : "Ver en el mapa"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  );
}

// Parada que se esta recorriendo hoy; si no, la primera.
function defaultStopId(stops) {
  const today = new Date().toISOString().slice(0, 10);
  return (stops.find((stop) => stop.dates.includes(today)) || stops[0])?.id || null;
}

// Recuerdos > Souvenirs: tiendas de regalos, artesanias, mercados y shoppings
// cerca de cada ciudad del viaje (Places API New, con cache en el servidor).
export default function SouvenirsView({ stops }) {
  const [cityId, setCityId] = useState(() => defaultStopId(stops));
  const [byCity, setByCity] = useState({}); // cityId -> { groups } | { error }
  const [filter, setFilter] = useState("all");
  const [focusedId, setFocusedId] = useState(null);
  const mapFocus = useMapFocus();
  const stop = stops.find((item) => item.id === cityId);

  // Se marca en el mapa de la derecha; si no se ve (pantalla chica), se abre
  // el lugar en Google Maps.
  function showOnMap(place) {
    if (mapFocus?.focusPlace({ ...place, city: stop?.name })) {
      setFocusedId(place.placeId);
    } else if (place.mapsUrl) {
      window.open(place.mapsUrl, "_blank", "noopener,noreferrer");
    }
  }
  const result = cityId ? byCity[cityId] : null;

  useEffect(() => {
    if (!stop || byCity[stop.id]) return undefined;
    let cancelled = false;
    fetch(`/api/places/souvenirs?lat=${stop.lat}&lng=${stop.lng}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        setByCity((current) => ({ ...current, [stop.id]: ok ? { groups: data.groups || [] } : { error: data.error || "error" } }));
      })
      .catch(() => {
        if (!cancelled) setByCity((current) => ({ ...current, [stop.id]: { error: "error" } }));
      });
    return () => {
      cancelled = true;
    };
  }, [stop, byCity]);

  const groups = (result?.groups || []).filter((group) => group.places.length);
  const visibleGroups = filter === "all" ? groups : groups.filter((group) => group.id === filter);

  if (!stops.length) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
        Este viaje no tiene destinos todavía. Agregá ciudades para ver dónde comprar souvenirs.
      </p>
    );
  }

  return (
    <div className="@container flex flex-col gap-7">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Souvenirs para llevar 🎁</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tiendas de regalos, artesanías, mercados y shoppings bien puntuados cerca de cada ciudad del viaje.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {stops.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCityId(item.id);
                setFilter("all");
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                item.id === cityId ? "bg-[#7386f5] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.flagUrl} alt="" className="h-3 w-auto rounded-[2px]" />
              ) : null}
              {item.name}
            </button>
          ))}
        </div>

        {groups.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === "all" ? "border-[#7386f5] bg-[#7386f5]/10 text-[#7386f5]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Todo
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setFilter(group.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  filter === group.id ? "border-[#7386f5] bg-[#7386f5]/10 text-[#7386f5]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {group.emoji} {group.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!result ? (
        <SkeletonGrid />
      ) : result.error ? (
        <p className="rounded-[10px] bg-red-50 px-4 py-3 text-sm font-medium text-red-500">
          No pudimos cargar los lugares de {stop?.name}. Probá de nuevo en un rato.
        </p>
      ) : !groups.length ? (
        <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
          No encontramos tiendas de souvenirs bien puntuadas cerca de {stop?.name}.
        </p>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.id} className="flex flex-col gap-3" aria-label={group.label}>
            <h3 className="text-base font-semibold text-gray-900">
              {group.emoji} {group.label} <span className="font-normal text-gray-400">· {group.places.length}</span>
            </h3>
            <div className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-3">
              {group.places.map((place) => (
                <SouvenirCard
                  key={place.placeId}
                  place={place}
                  cityName={stop?.name}
                  focused={place.placeId === focusedId}
                  onShowOnMap={showOnMap}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-xs text-gray-400">Datos y puntuaciones de Google Maps. Los horarios pueden cambiar: revisalos antes de ir.</p>
    </div>
  );
}
