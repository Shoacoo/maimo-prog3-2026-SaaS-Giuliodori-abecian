"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { longDate } from "@/lib/memories/client";
import { CloseIcon, PinIcon, TrashIcon } from "@/components/trips/memories/ui";

function Arrow({ direction, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Foto anterior" : "Foto siguiente"}
      className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 ${
        direction === "left" ? "left-4" : "right-4"
      }`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path
          d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// Visor de fotos de una ciudad: flechas o teclado para moverse, Esc para
// cerrar y borrar con confirmacion.
export default function PhotoViewer({ photos, startIndex, cityName, onClose, onDelete }) {
  const [index, setIndex] = useState(startIndex);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const photo = photos[Math.min(index, photos.length - 1)];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % photos.length);
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, photos.length]);

  useEffect(() => {
    setConfirming(false);
  }, [index]);

  if (!photo || typeof document === "undefined") return null;

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete(photo);
      if (photos.length <= 1) onClose();
      else setIndex((current) => Math.min(current, photos.length - 2));
    } catch {
      // el error ya se muestra en la vista de Recuerdos
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95" role="dialog" aria-modal="true" aria-label="Foto">
      <div className="flex items-center justify-between gap-4 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-base font-semibold">
            {photo.placeName ? (
              <>
                <PinIcon size={15} />
                {photo.placeName}
              </>
            ) : (
              cityName
            )}
          </p>
          <p className="truncate text-xs text-white/60">
            {[photo.placeName ? cityName : null, longDate(photo.date)].filter(Boolean).join(" · ")}
            {photos.length > 1 ? ` · ${index + 1} de ${photos.length}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px]">
              ¿Borrar esta foto?
              <button type="button" onClick={handleDelete} disabled={busy} className="font-semibold text-red-300 hover:underline">
                {busy ? "Borrando…" : "Sí, borrar"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="text-white/70 hover:underline">
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Borrar foto"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-red-500"
            >
              <TrashIcon />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.placeName || cityName}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
        />
        {photos.length > 1 ? (
          <>
            <Arrow direction="left" onClick={() => setIndex((current) => (current - 1 + photos.length) % photos.length)} />
            <Arrow direction="right" onClick={() => setIndex((current) => (current + 1) % photos.length)} />
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
