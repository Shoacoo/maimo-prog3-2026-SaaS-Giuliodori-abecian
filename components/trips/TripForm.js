"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { searchCities } from "@/lib/trips/cities";
import MapboxMap from "@/components/map/MapboxMap";

const ACCENTS = [
  "from-orange-400 to-yellow-300",
  "from-emerald-500 to-green-300",
  "from-sky-400 to-blue-300",
  "from-fuchsia-400 to-pink-300",
];

export default function TripForm({ action }) {
  const [query, setQuery] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [selected, setSelected] = useState(null);

  const suggestions = useMemo(() => {
    const addedIds = new Set(destinations.map((city) => city.id));
    return searchCities(query).filter((city) => !addedIds.has(city.id));
  }, [query, destinations]);

  function addDestination() {
    const city = selected || suggestions[0];
    if (!city) {
      return;
    }

    setDestinations((current) => [...current, city]);
    setQuery("");
    setSelected(null);
  }

  function removeDestination(id) {
    setDestinations((current) => current.filter((city) => city.id !== id));
  }

  const canSubmit = destinations.length > 0;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
      <form action={action} className="max-w-2xl">
        <input type="hidden" name="destinationIds" value={JSON.stringify(destinations.map((d) => d.id))} readOnly />

        <label className="grid gap-2 text-base font-medium text-gray-900">
          Nombre del viaje
          <input
            name="name"
            required
            className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
          />
        </label>

        <div className="mt-6">
          <span className="block text-base font-medium text-gray-900">¿A donde te diriges?</span>
          <div className="relative mt-2 flex gap-3">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(null);
                }}
                placeholder="Buscar ciudad..."
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
              />
              {query && suggestions.length > 0 ? (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  {suggestions.map((city) => (
                    <li key={city.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(city);
                          setQuery(`${city.name}, ${city.country}`);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span>{city.name}</span>
                        <span className="text-gray-400">{city.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={addDestination}
              disabled={!selected && suggestions.length === 0}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7386f5] text-xl text-white transition hover:bg-[#5f70e0] disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {destinations.map((city, index) => (
            <div key={city.id} className="relative flex overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              <div className="relative h-24 w-24 shrink-0">
                <Image src={city.image} alt={city.name} fill sizes="96px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-center px-4">
                <h3 className="text-lg font-semibold text-gray-900">{city.name}</h3>
                <p className="text-sm text-gray-500">{city.country}</p>
                <span className={`mt-2 h-1.5 w-full rounded-full bg-gradient-to-r ${ACCENTS[index % ACCENTS.length]}`} />
              </div>
              <button
                type="button"
                onClick={() => removeDestination(city.id)}
                aria-label={`Quitar ${city.name}`}
                className="m-3 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full bg-red-100 text-red-500 transition hover:bg-red-200"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-base font-semibold text-gray-900">Fechas del viaje</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-gray-700">
              Fecha de inicio
              <input
                type="date"
                name="startDate"
                required
                className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
              />
            </label>
            <label className="grid gap-2 text-sm text-gray-700">
              Fecha de finalizacion
              <input
                type="date"
                name="endDate"
                required
                className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-8 h-12 rounded-full bg-[#7386f5] px-8 text-sm font-semibold text-white transition hover:bg-[#5f70e0] disabled:opacity-40"
        >
          Crear viaje
        </button>
      </form>

      <div className="hidden lg:block">
        <MapboxMap
          className="h-72 w-full"
          markers={destinations.map((city) => ({ lng: city.lng, lat: city.lat, label: city.name }))}
        />
      </div>
    </div>
  );
}
