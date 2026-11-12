"use client";

import { useEffect, useRef, useState } from "react";
import { flagEmoji } from "@/lib/countries/flags";
import { placePhotoUrl } from "@/lib/places/photoUrl";

const RECENTS_KEY = "triphy:recent-cities";
const MAX_RECENTS = 3;

const inputClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#7386f5] focus:ring-1 focus:ring-[#7386f5]";

function readRecents() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(entry) {
  try {
    const next = [entry, ...readRecents().filter((item) => item.placeId !== entry.placeId)].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Sin localStorage (modo privado): simplemente no guardamos recientes.
  }
}

// "Prefectura de Osaka, Japón" -> { country: "Japón", region: "Prefectura de Osaka" }
function splitSecondary(text) {
  const parts = String(text || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const country = parts.pop() || "";
  return { country, region: parts.join(", ") };
}

export default function CitySearch({ onSelect, excludeIds = [], busy = false }) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [recents, setRecents] = useState([]);
  const [error, setError] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPredictions([]);
      return undefined;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json();
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setPredictions([]);
        } else {
          setError("");
          setPredictions((data.predictions || []).slice(0, 5));
          setHighlight(0);
        }
      } catch {
        if (!cancelled) setError("No se pudo buscar la ciudad.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const visibleRecents = recents.filter(
    (item) => !excludeIds.includes(item.placeId) && !predictions.some((p) => p.placeId === item.placeId),
  );

  // Una sola lista navegable con el teclado: primero ciudades, despues recientes.
  const options = [
    ...predictions.map((prediction) => ({ kind: "city", ...prediction })),
    ...visibleRecents.map((recent) => ({ kind: "recent", ...recent })),
  ];

  function handleFocus() {
    setRecents(readRecents());
    setOpen(true);
  }

  async function choose(option) {
    const { country } = option.kind === "city" ? splitSecondary(option.secondaryText) : { country: option.country };
    const name = option.kind === "city" ? option.mainText : option.name;
    saveRecent({ placeId: option.placeId, name, country });
    setQuery("");
    setPredictions([]);
    setOpen(false);
    const result = await onSelect(option.placeId);
    if (result?.error) setError(result.error);
    else setError("");
  }

  function handleKeyDown(event) {
    if (!open || options.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (current + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => (current - 1 + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(options[Math.min(highlight, options.length - 1)]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && options.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Buscar ciudad..."
        aria-autocomplete="list"
        className={inputClass}
      />
      {loading || busy ? (
        <span className="pointer-events-none absolute right-4 top-6 -translate-y-1/2 text-xs text-gray-400">
          {busy ? "Agregando..." : "Buscando..."}
        </span>
      ) : null}

      {showDropdown ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[14px] border border-gray-200 bg-white py-2 shadow-lg">
          {predictions.length > 0 ? (
            <>
              <p className="pb-1 pl-3.5 pt-1 text-[11px] font-semibold text-gray-400">CIUDADES</p>
              {predictions.map((prediction, index) => {
                const { country, region } = splitSecondary(prediction.secondaryText);
                const flag = flagEmoji(null, country);
                const active = index === highlight;

                return (
                  <button
                    key={prediction.placeId}
                    type="button"
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose({ kind: "city", ...prediction })}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${
                      active ? "bg-[#7386f5]/8" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={placePhotoUrl(null, prediction.placeId)}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-gray-900">{prediction.mainText}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {[country, region].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {active ? (
                      <span className="shrink-0 whitespace-pre text-xs font-medium text-[#7386f5]">
                        {flag ? `${flag}  ` : ""}Enter ↵
                      </span>
                    ) : flag ? (
                      <span className="shrink-0 text-base">{flag}</span>
                    ) : null}
                  </button>
                );
              })}
            </>
          ) : null}

          {visibleRecents.length > 0 ? (
            <>
              {predictions.length > 0 ? <div className="my-2 h-px bg-gray-100" /> : null}
              <p className="pb-1 pl-3.5 pt-1 text-[11px] font-semibold text-gray-400">BÚSQUEDAS RECIENTES</p>
              {visibleRecents.map((recent, index) => {
                const optionIndex = predictions.length + index;
                const active = optionIndex === highlight;
                return (
                  <button
                    key={recent.placeId}
                    type="button"
                    onMouseEnter={() => setHighlight(optionIndex)}
                    onClick={() => choose({ kind: "recent", ...recent })}
                    className={`flex w-full items-center gap-3 px-3.5 py-2 text-left text-sm text-gray-700 transition ${
                      active ? "bg-[#7386f5]/8" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm">🕘</span>
                    <span className="truncate">{[recent.name, recent.country].filter(Boolean).join(", ")}</span>
                  </button>
                );
              })}
            </>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
