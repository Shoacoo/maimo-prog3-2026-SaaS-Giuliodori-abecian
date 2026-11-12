"use client";

import { useEffect, useRef, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const AVATAR_COLORS = ["#10b981", "#9E5941", "#7386f5", "#f97316", "#0ea5e9", "#a855f7"];

const inputClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#7386f5] focus:bg-white focus:ring-1 focus:ring-[#7386f5]";

export function initials(person) {
  const source = person.name || person.email || "?";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "?";
}

function colorFor(person) {
  const key = person.email || person.name || "";
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({ person, size = 44, color, className = "" }) {
  const style = { width: size, height: size };
  if (person.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.photoURL}
        alt={person.name || person.email}
        referrerPolicy="no-referrer"
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={{ ...style, backgroundColor: color || colorFor(person), fontSize: size >= 40 ? 14 : 12 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
    >
      {initials(person)}
    </span>
  );
}

export default function CompanionSearch({ companions, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json();
        if (!cancelled) setResults(data.users || []);
      } catch {
        if (!cancelled) setResults([]);
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

  const trimmed = query.trim();
  const isAdded = (person) => companions.some((item) => item.email === person.email);
  const firstAddable = results.findIndex((person) => !isAdded(person));
  const exactMatch = results.some((person) => person.email === trimmed.toLowerCase());

  function add(person) {
    onAdd(person);
    setQuery("");
    setHint("");
    setOpen(false);
  }

  function invite() {
    if (!EMAIL_RE.test(trimmed)) {
      setHint("Escribí el email completo para mandarle la invitación.");
      return;
    }
    add({ uid: null, email: trimmed.toLowerCase(), name: "", photoURL: null });
  }

  const showDropdown = open && trimmed.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHint("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (firstAddable >= 0) add(results[firstAddable]);
            else if (!exactMatch && trimmed) invite();
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Buscar por email..."
        className={inputClass}
      />

      {showDropdown ? (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-lg">
          {results.map((person, index) => {
            const added = isAdded(person);
            const highlighted = index === firstAddable;
            return (
              <button
                key={person.uid}
                type="button"
                disabled={added}
                onClick={() => add(person)}
                className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-3 text-left transition ${
                  highlighted ? "bg-[#7386f5]/5" : "hover:bg-gray-50"
                } disabled:cursor-default`}
              >
                <Avatar person={person} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{person.name || person.email}</span>
                  <span className="block truncate text-[11px] text-gray-500">@{person.email}</span>
                </span>
                {added ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    ✓ Ya está en el viaje
                  </span>
                ) : (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      highlighted ? "bg-[#7386f5] text-white" : "bg-[#7386f5]/10 text-[#7386f5]"
                    }`}
                  >
                    + Agregar
                  </span>
                )}
              </button>
            );
          })}

          {!exactMatch ? (
            <button
              type="button"
              onClick={invite}
              className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-gray-50"
            >
              <span className="w-8 shrink-0 text-center text-sm">✉️</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">
                  Invitar a “{trimmed}” por email
                </span>
                <span className="block text-[11px] text-gray-500">Le mandamos un link para unirse al viaje</span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {hint ? <p className="mt-2 text-sm text-red-500">{hint}</p> : null}
    </div>
  );
}
