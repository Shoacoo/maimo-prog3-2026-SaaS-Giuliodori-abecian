"use client";

import { useState, useTransition } from "react";
import { addPlaceToItinerary } from "@/app/dashboard/trips/actions";

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric" });

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateLabel(date) {
  return capitalize(DATE_LABEL_FORMATTER.format(new Date(`${date}T00:00:00`)));
}

// Shared "add this place to a day of the trip" control - a button that opens
// a small popover listing the trip's dates. Used both in the Lugares para
// visitar grid (full-width button, popover opens upward since the button
// sits at the bottom of a tall card) and in the map's place sheet (small
// inline button right under the photo, where opening upward would collide
// with/get clipped by the image above it inside the sheet's scroll area -
// `direction="down"` opens it below instead).
export default function AddToItineraryButton({ place, dateList, tripId, className = "", compact = false, direction = "up" }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [, startTransition] = useTransition();

  function handlePick(date) {
    setOpen(false);
    startTransition(async () => {
      try {
        await addPlaceToItinerary(tripId, date, place);
        setConfirmation(`Agregado a ${dateLabel(date)}`);
        setTimeout(() => setConfirmation(""), 2500);
      } catch {
        setConfirmation("No se pudo agregar.");
        setTimeout(() => setConfirmation(""), 2500);
      }
    });
  }

  return (
    <div className={`relative ${compact ? "inline-block" : ""} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? "inline-flex h-7 items-center justify-center rounded-full bg-[#7386f5] px-3 text-xs font-semibold text-white shadow-md transition hover:bg-[#5f70e0]"
            : "flex h-10 w-full items-center justify-center rounded-full bg-[#7386f5] text-sm font-semibold text-white shadow-md transition hover:bg-[#5f70e0]"
        }
      >
        Agregar lugar
      </button>

      {confirmation ? (
        <p className="mt-1.5 text-center text-xs font-medium text-[#7386f5]">{confirmation}</p>
      ) : null}

      {open ? (
        <div
          className={`absolute left-0 z-20 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl ${
            direction === "down" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-400">Elegi el dia</p>
          <ul className="max-h-48 overflow-y-auto">
            {dateList.map((date) => (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => handlePick(date)}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  {dateLabel(date)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
