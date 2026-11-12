"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveMemoryEntryAction } from "@/app/dashboard/trips/actions";
import { compressImage, longDate, uploadMemoryPhoto } from "@/lib/memories/client";
import {
  CalendarIcon,
  Field,
  GhostButton,
  ModalHeader,
  ModalShell,
  PinIcon,
  PlaceChip,
  PrimaryButton,
  Select,
  defaultDateFor,
  inputClass,
  suggestionsFor,
} from "@/components/trips/memories/ui";

const MAX_FILES = 20;
const TEXT_MAX = 600;

function toItem(file) {
  return { key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: "ready", progress: 0, error: "" };
}

function Thumb({ item, onRemove, locked }) {
  const overlay =
    item.status === "compressing"
      ? "Preparando…"
      : item.status === "uploading"
        ? `Subiendo… ${item.progress}%`
        : item.status === "error"
          ? "No se subió"
          : null;
  return (
    <div className="relative h-24 w-[108px] shrink-0 overflow-hidden rounded-[10px] bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.preview} alt="" className="h-full w-full object-cover" />
      {overlay ? (
        <div className={`absolute inset-0 flex flex-col justify-end gap-1.5 p-2.5 ${item.status === "error" ? "bg-red-600/60" : "bg-black/45"}`}>
          <span className="text-[11px] font-medium text-white" title={item.error || undefined}>
            {overlay}
          </span>
          {item.status === "uploading" || item.status === "compressing" ? (
            <span className="h-1 overflow-hidden rounded-full bg-white/35">
              <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${item.progress}%` }} />
            </span>
          ) : null}
        </div>
      ) : null}
      {item.status === "done" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-2xl text-white">✓</span>
      ) : null}
      {!locked && item.status !== "done" ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar foto"
          className="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white/95 text-[11px] font-bold text-gray-900 shadow"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

// "Subir fotos" (diseño 10b): fotos elegidas, donde se sacaron (ciudad, dia y
// lugar, con sugerencias del itinerario) y una entrada opcional de bitacora.
export default function UploadModal({ tripId, stops, suggestions, initialFiles, initialCityId, onClose, onUploaded, onEntrySaved }) {
  const [items, setItems] = useState(() => initialFiles.slice(0, MAX_FILES).map(toItem));
  const [cityId, setCityId] = useState(initialCityId || stops[0]?.id || "");
  const stop = stops.find((item) => item.id === cityId) || stops[0];
  const [date, setDate] = useState(() => defaultDateFor(stop));
  const [place, setPlace] = useState({ name: "", placeId: null });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Libera las vistas previas al cerrar.
  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), []);

  const placeOptions = useMemo(() => suggestionsFor(suggestions, stop, date), [suggestions, stop, date]);
  const pending = items.filter((item) => item.status !== "done");

  function update(key, changes) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }

  function addFiles(fileList) {
    const images = [...fileList].filter((file) => file.type.startsWith("image/"));
    setItems((current) => [...current, ...images.map(toItem)].slice(0, MAX_FILES));
    setError(images.length < fileList.length ? "Algunos archivos no eran imágenes y no se agregaron." : "");
  }

  function removeItem(key) {
    setItems((current) => {
      const item = current.find((entry) => entry.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((entry) => entry.key !== key);
    });
  }

  function changeCity(nextId) {
    setCityId(nextId);
    setDate(defaultDateFor(stops.find((item) => item.id === nextId)));
    setPlace({ name: "", placeId: null });
  }

  async function handleSave() {
    if (busy || (!pending.length && !text.trim())) return;
    setBusy(true);
    setError("");
    let failed = false;

    // De a una: menos memoria en el celular y progreso claro por foto.
    for (const item of pending) {
      update(item.key, { status: "compressing", progress: 15, error: "" });
      try {
        const { full, thumb, width, height } = await compressImage(item.file);
        update(item.key, { status: "uploading", progress: 0 });
        const photo = await uploadMemoryPhoto(
          tripId,
          { full, thumb, width, height, cityId, date, placeName: place.name.trim(), placeId: place.placeId },
          (progress) => update(item.key, { progress }),
        );
        update(item.key, { status: "done", progress: 100 });
        onUploaded(photo);
      } catch (err) {
        failed = true;
        update(item.key, { status: "error", error: err.message });
      }
    }

    if (failed) {
      setError("Algunas fotos no se pudieron subir. Podés quitarlas o volver a intentar.");
      setBusy(false);
      return;
    }

    if (text.trim()) {
      try {
        const entry = await saveMemoryEntryAction(tripId, {
          cityId,
          date,
          text,
          places: place.name.trim() ? [place.name.trim()] : [],
        });
        onEntrySaved(entry);
      } catch {
        setError("Las fotos se subieron, pero no pudimos guardar la bitácora. Probá de nuevo.");
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    onClose();
  }

  const saveLabel = pending.length
    ? `Guardar ${pending.length} ${pending.length === 1 ? "foto" : "fotos"}`
    : "Guardar en la bitácora";

  return (
    <ModalShell onClose={onClose} locked={busy} label="Subir fotos">
      <div className="flex flex-col gap-5">
        <ModalHeader title="Subir fotos" subtitle="Elegí las fotos y contá dónde las sacaste." onClose={onClose} locked={busy} />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[13px] font-medium">
            <span className="text-gray-900">
              {items.length} {items.length === 1 ? "foto" : "fotos"}
            </span>
            {items.length && !busy ? (
              <button
                type="button"
                onClick={() => {
                  items.forEach((item) => URL.revokeObjectURL(item.preview));
                  setItems([]);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                Quitar todas
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {items.map((item) => (
              <Thumb key={item.key} item={item} locked={busy} onRemove={() => removeItem(item.key)} />
            ))}
            {items.length < MAX_FILES ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex h-24 w-[108px] flex-col items-center justify-center gap-1 rounded-[10px] border-[1.5px] border-dashed border-[#7386f5]/55 bg-[#7386f5]/5 text-xs font-medium text-[#7386f5] transition hover:bg-[#7386f5]/10 disabled:opacity-50"
              >
                <span className="text-xl leading-none">+</span>
                Agregar
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files || []);
                event.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold text-gray-900">¿Dónde las sacaste?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ciudad">
              <Select value={cityId} onChange={changeCity} disabled={busy}>
                {stops.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Día del viaje">
              <Select value={date} onChange={setDate} disabled={busy} icon={<CalendarIcon />}>
                <option value="">Sin día</option>
                {(stop?.dates || []).map((day) => (
                  <option key={day} value={day}>
                    {longDate(day)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Lugar" hint="(opcional)">
            <span className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-[#7386f5]">
                <PinIcon size={16} />
              </span>
              <input
                value={place.name}
                onChange={(event) => setPlace({ name: event.target.value, placeId: null })}
                maxLength={80}
                disabled={busy}
                placeholder="Ej: Castillo de Osaka"
                className={`${inputClass} pl-9`}
              />
            </span>
          </Field>
          {placeOptions.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500">De tu itinerario:</span>
              {placeOptions.map((option) => (
                <PlaceChip
                  key={option.name}
                  active={place.name === option.name}
                  onClick={busy ? undefined : () => setPlace({ name: option.name, placeId: option.placeId })}
                >
                  {option.name}
                </PlaceChip>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium text-gray-900">
            Bitácora <span className="font-normal text-gray-400">(opcional)</span>
          </p>
          <div className="rounded-[10px] border border-gray-200 bg-white px-3 pb-2 pt-3 transition focus-within:border-[1.5px] focus-within:border-[#7386f5]">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, TEXT_MAX))}
              rows={3}
              disabled={busy}
              placeholder="¿Cómo fue? Contá lo que viviste en este lugar…"
              className="w-full resize-none text-sm leading-[22px] text-gray-700 outline-none placeholder:text-gray-400"
            />
            <p className="text-right text-xs text-gray-400">
              {text.length} / {TEXT_MAX}
            </p>
          </div>
          <p className="text-xs text-gray-500">Se guarda junto con estas fotos en los recuerdos de {stop?.name}.</p>
        </div>

        {error ? <p className="rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-500">{error}</p> : null}

        <div className="flex justify-end gap-3 pt-1">
          <GhostButton onClick={onClose} disabled={busy}>
            Cancelar
          </GhostButton>
          <PrimaryButton onClick={handleSave} disabled={busy || (!pending.length && !text.trim())}>
            {busy ? "Guardando…" : saveLabel}
          </PrimaryButton>
        </div>
      </div>
    </ModalShell>
  );
}
