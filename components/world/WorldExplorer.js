"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import CityPanel from "@/components/world/CityPanel";
import TripStatusPanel from "@/components/world/TripStatusPanel";

// WebGL solo existe en el navegador, asi que el globo no se prerenderiza.
const WorldGlobe = dynamic(() => import("@/components/world/WorldGlobe"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Cargando el globo...</div>
  ),
});

function Stat({ value, label }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 text-white backdrop-blur">
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-white/70">{label}</p>
    </div>
  );
}

export default function WorldExplorer({ data }) {
  const [selectedCity, setSelectedCity] = useState(null);
  const [focus, setFocus] = useState(null);
  const { cities, countries, arcs, stats, trips = [] } = data;

  function selectCity(city) {
    setFocus(null);
    setSelectedCity(city);
  }

  function focusTrip(trip) {
    setSelectedCity(null);
    // Objeto nuevo en cada click para que el globo vuelva a girar aunque se
    // elija el mismo viaje dos veces.
    setFocus(trip?.focus ? { ...trip.focus, tripId: trip.id, at: Date.now() } : null);
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[480px] overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_50%_40%,#1d3f99_0%,#0b1d4f_65%,#07122f_100%)]">
      <WorldGlobe
        cities={cities}
        countries={countries}
        arcs={arcs}
        selectedCity={selectedCity}
        onSelectCity={selectCity}
        focus={focus}
      />

      <div
        className={`pointer-events-none absolute left-4 top-4 z-10 grid gap-2 ${
          stats.exploringCountries ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        }`}
      >
        {stats.exploringCountries ? <Stat value={stats.exploringCountries} label="Explorando ahora" /> : null}
        <Stat value={stats.visitedCountries} label="Paises visitados" />
        <Stat value={stats.cities} label="Ciudades" />
        <Stat value={stats.trips} label="Viajes" />
      </div>

      {trips.length ? (
        <TripStatusPanel trips={trips} activeTripId={focus?.tripId} onSelectTrip={focusTrip} onClose={() => setFocus(null)} />
      ) : null}

      {cities.length === 0 ? (
        <div className="absolute inset-x-0 bottom-10 z-10 mx-auto w-fit rounded-2xl bg-white px-5 py-4 text-center shadow-xl">
          <p className="text-sm font-medium text-gray-800">Todavia no hay destinos en tu mapa</p>
          <Link href="/dashboard/trips/new" className="mt-2 inline-block text-sm font-semibold text-[#143DA6] hover:underline">
            Crear mi primer viaje
          </Link>
        </div>
      ) : null}

      <CityPanel city={selectedCity} onClose={() => setSelectedCity(null)} />
    </div>
  );
}
