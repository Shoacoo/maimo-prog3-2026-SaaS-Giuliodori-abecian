"use client";

import { useEffect, useState } from "react";
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

const THEME_KEY = "triphy:world-theme";

// Resumen de Mi mundo: misma tarjeta que la leyenda de estados (columna,
// circulo de color con icono y numero grande). En el celular pasa a 2x2.
function StatIcon({ name }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      {name === "compass" ? (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" {...common} />
        </>
      ) : name === "globe" ? (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" {...common} />
        </>
      ) : name === "pin" ? (
        <>
          <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" {...common} />
          <circle cx="12" cy="9.5" r="2.5" {...common} />
        </>
      ) : (
        <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1 4.5-4.5a2 2 0 0 1 3 3L15 13.5l1 7.5-1.5 1.5-2.5-7.5-3 3V21l-1.5 1-1-3.5L3 17.5l1-1.5h2.5l3-3Z" {...common} />
      )}
    </svg>
  );
}

function StatsCard({ stats }) {
  const items = [
    stats.exploringCountries
      ? { value: stats.exploringCountries, label: stats.exploringCountries === 1 ? "Pais explorando" : "Paises explorando", short: "Explorando", hint: "Con un viaje en curso", color: "#F5A524", icon: "compass" }
      : null,
    { value: stats.visitedCountries, label: stats.visitedCountries === 1 ? "Pais visitado" : "Paises visitados", short: "Visitados", hint: "Con viajes terminados", color: "#7CBE66", icon: "globe" },
    { value: stats.cities, label: stats.cities === 1 ? "Ciudad" : "Ciudades", short: "Ciudades", hint: "Paradas de tus viajes", color: "#143DA6", icon: "pin" },
    { value: stats.trips, label: stats.trips === 1 ? "Viaje" : "Viajes", short: "Viajes", hint: "Propios y compartidos", color: "#7386F5", icon: "plane" },
  ].filter(Boolean);

  return (
    <div className="pointer-events-none absolute left-5 right-5 top-5 z-10 rounded-2xl sm:right-auto sm:w-60 bg-white p-1.5 shadow-2xl">
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Mi mundo</p>
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 sm:py-2">
            <span
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:flex"
              style={{ backgroundColor: `${item.color}1f`, color: item.color }}
            >
              <StatIcon name={item.icon} />
            </span>
            <span
              className="h-2 w-2 shrink-0 rounded-full sm:hidden"
              style={{ backgroundColor: item.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-gray-600 sm:hidden">{item.short}</span>
              <span className="hidden truncate text-sm font-semibold text-gray-900 sm:block">{item.label}</span>
              <span className="hidden truncate text-[11px] text-gray-500 sm:block">{item.hint}</span>
            </span>
            <span className="text-base font-bold tabular-nums text-gray-900 sm:text-xl">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function WorldExplorer({ data }) {
  const [selectedCity, setSelectedCity] = useState(null);
  const [focus, setFocus] = useState(null);
  // Tierra de dia (Blue Marble) o de noche con luces (Black Marble). La
  // eleccion se recuerda en este navegador.
  const [theme, setTheme] = useState("day");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(THEME_KEY) === "night") setTheme("night");
    } catch {}
    // Precarga la otra imagen para que el cambio dia/noche sea inmediato.
    const timer = setTimeout(() => {
      ["/earth-day.jpg", "/earth-night.jpg"].forEach((src) => {
        const image = new Image();
        image.src = src;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const next = theme === "night" ? "day" : "night";
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {}
  }
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
    <div
      className={`relative h-[calc(100vh-4rem)] min-h-[480px] overflow-hidden rounded-3xl transition-colors duration-700 ${
        theme === "night"
          ? "bg-[radial-gradient(circle_at_50%_40%,#111a33_0%,#070b18_60%,#03050c_100%)]"
          : "bg-[radial-gradient(circle_at_50%_40%,#16306f_0%,#0a1a45_62%,#060f2a_100%)]"
      }`}
    >
      <WorldGlobe
        cities={cities}
        countries={countries}
        arcs={arcs}
        selectedCity={selectedCity}
        onSelectCity={selectCity}
        focus={focus}
        theme={theme}
      />

      <StatsCard stats={stats} />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "night" ? "Ver la Tierra de dia" : "Ver la Tierra de noche"}
        title={theme === "night" ? "Ver de dia" : "Ver de noche"}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-2xl transition hover:text-gray-900"
      >
        {theme === "night" ? <SunIcon /> : <MoonIcon />}
      </button>

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
