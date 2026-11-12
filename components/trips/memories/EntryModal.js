"use client";

import { useMemo, useState } from "react";
import { deleteMemoryEntryAction, saveMemoryEntryAction } from "@/app/dashboard/trips/actions";
import { longDate } from "@/lib/memories/client";
import {
  CalendarIcon,
  Field,
  GhostButton,
  ModalHeader,
  ModalShell,
  PlaceChip,
  PrimaryButton,
  Select,
  TrashIcon,
  defaultDateFor,
  inputClass,
  suggestionsFor,
} from "@/components/trips/memories/ui";

const TEXT_MAX = 600;
const MAX_PLACES = 6;

// Escribir o editar una entrada de la bitacora: ciudad, dia, titulo, texto y
// los lugares que se mencionan.
export default function EntryModal({ tripId, stops, suggestions, entry, initialCityId, onClose, onSaved, onDeleted }) {
  const editing = Boolean(entry);
  const [cityId, setCityId] = useState(entry?.cityId || initialCityId || stops[0]?.id || "");
  const stop = stops.find((item) => item.id === cityId) || stops[0];
  const [date, setDate] = useState(entry ? entry.date || "" : defaultDateFor(stop));
  const [title, setTitle] = useState(entry?.title || "");
  const [text, setText] = useState(entry?.text || "");
  const [places, setPlaces] = useState(entry?.places || []);
  const [placeDraft, setPlaceDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const placeOptions = useMemo(
    () => suggestionsFor(suggestions, stop, date).filter((option) => !places.includes(option.name)),
    [suggestions, stop, date, places],
  );

  function addPlace(name) {
    const clean = name.trim();
    if (!clean || places.includes(clean) || places.length >= MAX_PLACES) return;
    setPlaces((current) => [...current, clean]);
    setPlaceDraft("");
  }

  function changeCity(nextId) {
    setCityId(nextId);
    setDate(defaultDateFor(stops.find((item) => item.id === nextId)));
  }

  async function handleSave() {
    if (!text.trim()) {
      setError("Escribí algo antes de guardar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveMemoryEntryAction(tripId, { id: entry?.id, cityId, date, title, text, places });
      onSaved(saved);
      onClose();
    } catch {
      setError("No pudimos guardar la entrada. Probá de nuevo.");
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteMemoryEntryAction(tripId, entry.id);
      onDeleted(entry.id);
      onClose();
    } catch {
      setError("No pudimos borrar la entrada.");
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} locked={busy} label={editing ? "Editar entrada" : "Nueva entrada"}>
      <div className="flex flex-col gap-5">
        <ModalHeader
          title={editing ? "Editar entrada" : "Escribir en la bitácora"}
          subtitle="Contá lo que viviste para no olvidarlo."
          onClose={onClose}
          locked={busy}
        />

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

        <Field label="Título" hint="(opcional)">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            disabled={busy}
            placeholder="Ej: Primera noche en Dotonbori"
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium text-gray-900">¿Cómo fue?</p>
          <div className="rounded-[10px] border border-gray-200 bg-white px-3 pb-2 pt-3 transition focus-within:border-[1.5px] focus-within:border-[#7386f5]">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, TEXT_MAX))}
              rows={5}
              disabled={busy}
              autoFocus
              placeholder="Lo que viste, comiste, la gente que conociste…"
              className="w-full resize-none text-sm leading-[22px] text-gray-700 outline-none placeholder:text-gray-400"
            />
            <p className="text-right text-xs text-gray-400">
              {text.length} / {TEXT_MAX}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-gray-900">
            Lugares <span className="font-normal text-gray-400">(hasta {MAX_PLACES})</span>
          </p>
          {places.length ? (
            <div className="flex flex-wrap gap-1.5">
              {places.map((name) => (
                <PlaceChip key={name} active onRemove={busy ? undefined : () => setPlaces((current) => current.filter((item) => item !== name))}>
                  {name}
                </PlaceChip>
              ))}
            </div>
          ) : null}
          {places.length < MAX_PLACES ? (
            <input
              value={placeDraft}
              onChange={(event) => setPlaceDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPlace(placeDraft);
                }
              }}
              maxLength={80}
              disabled={busy}
              placeholder="Escribí un lugar y apretá Enter"
              className={inputClass}
            />
          ) : null}
          {placeOptions.length && places.length < MAX_PLACES ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500">De tu itinerario:</span>
              {placeOptions.map((option) => (
                <PlaceChip key={option.name} onClick={busy ? undefined : () => addPlace(option.name)}>
                  {option.name}
                </PlaceChip>
              ))}
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-500">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {editing ? (
            confirmDelete ? (
              <span className="flex items-center gap-2 text-[13px]">
                <span className="text-gray-600">¿Borrar esta entrada?</span>
                <button type="button" onClick={handleDelete} disabled={busy} className="font-semibold text-red-500 hover:underline">
                  Sí, borrar
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className="text-gray-500 hover:underline">
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-500 hover:underline"
              >
                <TrashIcon size={14} />
                Borrar entrada
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <GhostButton onClick={onClose} disabled={busy}>
              Cancelar
            </GhostButton>
            <PrimaryButton onClick={handleSave} disabled={busy || !text.trim()}>
              {busy ? "Guardando…" : "Guardar entrada"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
