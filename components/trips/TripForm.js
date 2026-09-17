"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import GoogleMap from "@/components/map/GoogleMap";
import DateField from "@/components/trips/DateField";
import StopOrdinal from "@/components/trips/StopOrdinal";
import { getFlagUrl } from "@/lib/countries/flags";

const DUMMY_COMPANIONS = [
  { name: "Francisco Galeano", email: "franciscogaleano@gmail.com", initials: "FG", color: "bg-orange-400" },
  { name: "Ignacio Laluz", email: "ignaciolaluz@gmail.com", initials: "IL", color: "bg-sky-400" },
];

function CityThumbnail({ city, className }) {
  if (!city.image) {
    return (
      <div className={`grid place-items-center bg-gray-100 text-xs text-gray-400 ${className}`}>
        Sin foto
      </div>
    );
  }

  return <Image src={city.image} alt={city.name} fill sizes="96px" className={`object-cover ${className}`} />;
}

export default function TripForm({ action }) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selected, setSelected] = useState(null);
  const [resolvingPlaceId, setResolvingPlaceId] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [error, setError] = useState("");
  const [companionQuery, setCompanionQuery] = useState("");
  const [selectedCompanion, setSelectedCompanion] = useState(null);
  const [companions, setCompanions] = useState([]);
  const debounceRef = useRef(null);

  const companionMatches = companionQuery.trim()
    ? DUMMY_COMPANIONS.filter((person) => {
        const alreadyAdded = companions.some((added) => added.email === person.email);
        const matchesQuery =
          person.name.toLowerCase().includes(companionQuery.trim().toLowerCase()) ||
          person.email.toLowerCase().includes(companionQuery.trim().toLowerCase());
        return !alreadyAdded && matchesQuery;
      })
    : [];

  function selectCompanion(person) {
    setSelectedCompanion(person);
    setCompanionQuery(person.name);
  }

  function addCompanion() {
    if (!selectedCompanion) {
      return;
    }

    setCompanions((current) => [...current, selectedCompanion]);
    setCompanionQuery("");
    setSelectedCompanion(null);
  }

  function removeCompanion(email) {
    setCompanions((current) => current.filter((person) => person.email !== email));
  }

  useEffect(() => {
    if (selected || !query.trim()) {
      setPredictions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingPredictions(true);
      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.error) {
          setError(data.error);
          setPredictions([]);
        } else {
          setError("");
          setPredictions(data.predictions || []);
        }
      } catch {
        setError("No se pudo buscar la ciudad.");
      } finally {
        setLoadingPredictions(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  async function selectPrediction(prediction) {
    setPredictions([]);
    setQuery(`${prediction.mainText}, ${prediction.secondaryText}`);
    setResolvingPlaceId(prediction.placeId);
    setError("");

    try {
      const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setSelected(null);
      } else {
        setSelected(data);
      }
    } catch {
      setError("No se pudo obtener la informacion de la ciudad.");
    } finally {
      setResolvingPlaceId(null);
    }
  }

  function addDestination() {
    if (!selected) {
      return;
    }

    if (destinations.some((city) => city.placeId === selected.placeId)) {
      setError("Esa ciudad ya esta en el viaje.");
      return;
    }

    setDestinations((current) => [...current, selected]);
    setQuery("");
    setSelected(null);
  }

  function removeDestination(placeId) {
    setDestinations((current) => current.filter((city) => city.placeId !== placeId));
  }

  function handleStartDateChange(date) {
    setStartDate(date);
    if (date && endDate && endDate < date) {
      setEndDate(null);
    }
  }

  const canSubmit = destinations.length > 0 && Boolean(startDate) && Boolean(endDate);

  const mapMarkers = useMemo(
    () => destinations.map((city) => ({ lng: city.lng, lat: city.lat, label: city.name })),
    [destinations],
  );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
      <form action={action} className="max-w-2xl">
        <input type="hidden" name="destinations" value={JSON.stringify(destinations)} readOnly />

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
              {loadingPredictions ? (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Buscando...
                </span>
              ) : null}
              {predictions.length > 0 ? (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                  {predictions.map((prediction) => (
                    <li key={prediction.placeId}>
                      <button
                        type="button"
                        onClick={() => selectPrediction(prediction)}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span>{prediction.mainText}</span>
                        <span className="text-gray-400">{prediction.secondaryText}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={addDestination}
              disabled={!selected || Boolean(resolvingPlaceId)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7386f5] text-xl text-white transition hover:bg-[#5f70e0] disabled:opacity-40"
            >
              +
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
        </div>

        <div className="mt-6 grid gap-3">
          {destinations.map((city, index) => {
            const flagUrl = getFlagUrl(city.countryCode, city.country);
            const isLast = index === destinations.length - 1;

            return (
              <div key={city.placeId} className="flex gap-4">
                <StopOrdinal order={index + 1} highlighted={index === 0} isLast={isLast} />

                <div
                  className={`mb-3 flex h-24 w-64 shrink-0 overflow-hidden rounded-2xl shadow-md transition-shadow ${
                    index === 0 ? "" : "border border-gray-100"
                  }`}
                >
                  <div className="relative w-20 shrink-0 bg-gray-100">
                    <CityThumbnail city={city} className="h-24 w-20" />
                  </div>
                  <div
                    className={`flex flex-1 flex-col justify-center gap-1 px-3 ${
                      index === 0 ? "bg-[#7386f5]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h3 className={`truncate text-sm font-semibold ${index === 0 ? "text-white" : "text-gray-900"}`}>
                        {city.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeDestination(city.placeId)}
                        aria-label={`Quitar ${city.name}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs text-red-500 shadow-md transition hover:bg-red-200"
                      >
                        ✕
                      </button>
                    </div>
                    <p
                      className={`flex items-center gap-1.5 text-xs ${
                        index === 0 ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {flagUrl ? (
                        <span className="h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-white/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={flagUrl} alt={city.country} className="h-full w-full object-cover" />
                        </span>
                      ) : null}
                      <span className="truncate">{city.country}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <span className="block text-base font-medium text-gray-900">Agregar compañero:</span>
          <div className="relative mt-2 flex gap-3">
            <div className="relative flex-1">
              <input
                value={companionQuery}
                onChange={(event) => {
                  setCompanionQuery(event.target.value);
                  setSelectedCompanion(null);
                }}
                placeholder="Buscar por email..."
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none transition focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]"
              />
              {companionMatches.length > 0 ? (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                  {companionMatches.map((person) => (
                    <li key={person.email}>
                      <button
                        type="button"
                        onClick={() => selectCompanion(person)}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span>{person.name}</span>
                        <span className="text-gray-400">@{person.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={addCompanion}
              disabled={!selectedCompanion}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7386f5] text-xl text-white transition hover:bg-[#5f70e0] disabled:opacity-40"
            >
              +
            </button>
          </div>

          {companions.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {companions.map((person) => (
                <div key={person.email} className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${person.color}`}
                  >
                    {person.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{person.name}</p>
                    <p className="text-xs text-gray-500">@{person.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCompanion(person.email)}
                    aria-label={`Quitar ${person.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 transition hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <h3 className="text-base font-semibold text-gray-900">Fechas del viaje</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField label="Fecha de inicio" name="startDate" value={startDate} onChange={handleStartDateChange} />
            <DateField
              label="Fecha de finalizacion"
              name="endDate"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate || undefined}
            />
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
        <GoogleMap
          className="h-72 w-full"
          markers={mapMarkers}
        />
      </div>
    </div>
  );
}
