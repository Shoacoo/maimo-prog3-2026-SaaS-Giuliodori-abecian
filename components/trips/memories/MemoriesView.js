"use client";

import { useMemo, useRef, useState } from "react";
import { deleteMemoryPhotoAction } from "@/app/dashboard/trips/actions";
import { rangeLabel, shortDate } from "@/lib/memories/client";
import UploadModal from "@/components/trips/memories/UploadModal";
import EntryModal from "@/components/trips/memories/EntryModal";
import PhotoViewer from "@/components/trips/memories/PhotoViewer";
import { PhotoIcon, PinIcon, PlaceChip, PrimaryButton, SecondaryButton, UploadIcon } from "@/components/trips/memories/ui";

const OTHER_ID = "__otros";

function byDateAsc(a, b) {
  return (a.date || "9999").localeCompare(b.date || "9999") || (a.createdAt || "").localeCompare(b.createdAt || "");
}

function byDateDesc(a, b) {
  return (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || "");
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

const weekdayFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric" });

function StatCard({ label, value, caption }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-[22px] shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-[30px] font-bold leading-none text-gray-900">{value}</p>
      <p className="truncate text-[13px] text-gray-500">{caption}</p>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
        active ? "bg-[#7386f5] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function Tile({ photo, big = false, extra = 0, className = "", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl bg-gray-100 ${className}`}
      aria-label={photo.placeName ? `Ver foto de ${photo.placeName}` : "Ver foto"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={big ? photo.url : photo.thumbUrl}
        alt={photo.placeName || ""}
        loading="lazy"
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
      {extra > 0 ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
          <span className="text-[22px] font-bold leading-none">+{extra}</span>
          <span className="mt-1 text-xs font-medium">fotos más</span>
        </span>
      ) : photo.placeName ? (
        <>
          <span className="absolute inset-0 bg-linear-to-b from-transparent from-45% to-black/45" />
          <span className="absolute bottom-2.5 left-2.5 inline-flex max-w-[calc(100%-20px)] items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[11px] font-medium text-gray-900">
            <span className="shrink-0 text-[#7386f5]">
              <PinIcon size={11} />
            </span>
            <span className="truncate">{photo.placeName}</span>
          </span>
        </>
      ) : null}
    </button>
  );
}

// Grilla del diseño: una foto grande y hasta 4 chicas a la derecha (la ultima
// muestra "+N fotos más" si hay mas).
function PhotoGrid({ photos, onOpen }) {
  const [first, ...others] = photos;
  const rest = others.slice(0, 4);
  const hidden = photos.length - 1 - rest.length;
  const spans = {
    1: ["col-span-2 row-span-2"],
    2: ["col-span-2", "col-span-2"],
    3: ["col-span-2", "", ""],
    4: ["", "", "", ""],
  }[rest.length];

  // @container: se acomoda al ancho que le queda dentro de la card (no al de la
  // pantalla). Con poco lugar, la grande va arriba y las chicas abajo; con
  // lugar, lado a lado y las chicas ocupan un porcentaje (nunca un ancho fijo
  // que pueda empujar la grande a 0 y salirse de la card).
  return (
    <div className="@container min-w-0 flex-1">
      <div className="flex flex-col gap-2 @sm:flex-row">
      <Tile photo={first} big onClick={() => onOpen(0)} className="h-56 min-w-0 @sm:h-[268px] @sm:flex-1" />
      {rest.length ? (
        <div className="grid h-[268px] grid-cols-2 grid-rows-2 gap-2 @sm:w-[46%] @sm:shrink-0">
          {rest.map((photo, index) => (
            <Tile
              key={photo.id}
              photo={photo}
              className={spans[index]}
              extra={index === rest.length - 1 ? hidden : 0}
              onClick={() => onOpen(index + 1)}
            />
          ))}
        </div>
      ) : null}
      </div>
    </div>
  );
}

function Journal({ city, entries, onWrite, onEdit }) {
  const [index, setIndex] = useState(0);
  const entry = entries[Math.min(index, entries.length - 1)];

  if (!entry) {
    return (
      <div className="flex flex-col items-start justify-center gap-3 rounded-xl bg-gray-50 p-5 @3xl:w-[300px] @3xl:shrink-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-[#7386f5]">BITÁCORA</p>
        <p className="text-[15px] font-semibold text-gray-900">Todavía no escribiste sobre {city}</p>
        <p className="text-sm text-gray-500">Contá qué hiciste, qué comiste o lo que no querés olvidarte.</p>
        <SecondaryButton onClick={onWrite}>Escribir en la bitácora</SecondaryButton>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2.5 @3xl:w-[300px] @3xl:shrink-0">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-[#7386f5]">
        BITÁCORA{entry.date ? ` · ${shortDate(entry.date)}` : ""}
      </p>
      <h3 className="text-[17px] font-semibold leading-[22px] text-gray-900">{entry.title}</h3>
      <p className="whitespace-pre-line text-sm leading-[22px] text-gray-700">{entry.text}</p>
      {entry.places?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {entry.places.map((place) => (
            <PlaceChip key={place}>{place}</PlaceChip>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-4 pt-2 text-[13px] font-semibold">
        <button type="button" onClick={() => onEdit(entry)} className="text-[#7386f5] hover:underline">
          Editar entrada
        </button>
        <button type="button" onClick={onWrite} className="text-gray-500 hover:text-gray-800">
          + Nueva entrada
        </button>
        {entries.length > 1 ? (
          <span className="ml-auto flex items-center gap-2 font-medium text-gray-500">
            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
              aria-label="Entrada más nueva"
              className="disabled:opacity-30"
            >
              ‹
            </button>
            {index + 1} de {entries.length}
            <button
              type="button"
              onClick={() => setIndex((current) => Math.min(entries.length - 1, current + 1))}
              disabled={index >= entries.length - 1}
              aria-label="Entrada más vieja"
              className="disabled:opacity-30"
            >
              ›
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CityBlock({ stop, order, photos, entries, onUpload, onWrite, onEdit, onOpenPhoto }) {
  const placeCount = new Set(photos.map((photo) => photo.placeName).filter(Boolean)).size;
  const meta = [
    stop.startDate ? rangeLabel(stop.startDate, stop.endDate) : null,
    placeCount ? plural(placeCount, "lugar", "lugares") : null,
    photos.length ? plural(photos.length, "foto", "fotos") : null,
    !photos.length && !entries.length ? "todavía sin recuerdos" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="flex flex-col gap-3.5" aria-label={`Recuerdos de ${stop.name}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-2 border-[#7386f5] bg-white text-[13px] font-semibold text-[#7386f5]">
          {order ? `${order}°` : "+"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            {stop.name}
            {stop.flagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stop.flagUrl} alt="" className="h-3.5 w-auto rounded-[2px] shadow-sm" />
            ) : null}
          </h3>
          <p className="text-[13px] text-gray-500">{meta}</p>
        </div>
        {photos.length || entries.length ? (
          <button type="button" onClick={onUpload} className="shrink-0 text-[13px] font-semibold text-[#7386f5] hover:underline">
            + Agregar fotos
          </button>
        ) : null}
      </div>

      {photos.length || entries.length ? (
        // La card es un @container: bitácora y fotos van lado a lado solo si la
        // card mide al menos 48rem; si no, la bitácora arriba y las fotos abajo.
        <div className="@container rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-6 @3xl:flex-row">
          <Journal city={stop.name} entries={entries} onWrite={onWrite} onEdit={onEdit} />
          {photos.length ? (
            <PhotoGrid photos={photos} onOpen={onOpenPhoto} />
          ) : (
            <button
              type="button"
              onClick={onUpload}
              className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#7386f5]/40 text-sm font-medium text-[#7386f5] transition hover:bg-[#7386f5]/5"
            >
              <PhotoIcon />
              Sumá fotos de {stop.name}
            </button>
          )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-[#7386f5]/40 px-6 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7386f5]/10 text-[#7386f5]">
            <PhotoIcon />
          </span>
          <p className="text-base font-semibold text-gray-900">Todavía no hay recuerdos de {stop.name}</p>
          <p className="text-sm text-gray-500">Cuando subas fotos o escribas en la bitácora, van a aparecer acá.</p>
          <div className="flex flex-wrap justify-center gap-3 pt-1.5">
            <PrimaryButton onClick={onUpload}>Subir fotos de {stop.name}</PrimaryButton>
            <SecondaryButton onClick={onWrite}>Escribir en la bitácora</SecondaryButton>
          </div>
        </div>
      )}
    </section>
  );
}

// Recuerdos del viaje (diseño 10): fotos y bitacora agrupadas por cada ciudad
// del recorrido, con filtros, subida de fotos y visor.
export default function MemoriesView({ tripId, startDate, endDate, stops, initialPhotos, initialEntries, suggestions }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState("all");
  const [upload, setUpload] = useState(null); // { files, cityId }
  const [editor, setEditor] = useState(null); // { entry, cityId }
  const [viewer, setViewer] = useState(null); // { cityId, index }
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Fotos o entradas de una ciudad que ya no esta en el viaje van a "Otros lugares".
  const allStops = useMemo(() => {
    const ids = new Set(stops.map((stop) => stop.id));
    const orphan = [...photos, ...entries].find((item) => !ids.has(item.cityId));
    return orphan ? [...stops, { id: OTHER_ID, name: "Otros lugares", dates: [], startDate: null, endDate: null }] : stops;
  }, [stops, photos, entries]);

  const grouped = useMemo(() => {
    const ids = new Set(stops.map((stop) => stop.id));
    const keyOf = (item) => (ids.has(item.cityId) ? item.cityId : OTHER_ID);
    const map = Object.fromEntries(allStops.map((stop) => [stop.id, { photos: [], entries: [] }]));
    photos.forEach((photo) => map[keyOf(photo)]?.photos.push(photo));
    entries.forEach((entry) => map[keyOf(entry)]?.entries.push(entry));
    Object.values(map).forEach((group) => {
      group.photos.sort(byDateAsc);
      group.entries.sort(byDateDesc);
    });
    return map;
  }, [allStops, stops, photos, entries]);

  const places = useMemo(
    () => [...new Set([...photos.map((photo) => photo.placeName), ...entries.flatMap((entry) => entry.places || [])].filter(Boolean))],
    [photos, entries],
  );
  const citiesWithPhotos = new Set(photos.map((photo) => photo.cityId)).size;
  const latestEntry = [...entries].sort(byDateDesc)[0];
  const latestCaption = latestEntry
    ? `La última, ${latestEntry.date ? `el ${weekdayFormatter.format(new Date(`${latestEntry.date}T00:00:00`))} ` : ""}en ${latestEntry.cityName}`
    : "Todavía no escribiste nada";

  const visibleStops = filter === "all" ? allStops : allStops.filter((stop) => stop.id === filter);
  const uploadStops = stops.length ? stops : allStops;

  function openUpload(files = [], cityId = filter !== "all" && filter !== OTHER_ID ? filter : null) {
    if (!uploadStops.length) return;
    setUpload({ files: [...files], cityId });
  }

  async function handleDeletePhoto(photo) {
    setError("");
    try {
      await deleteMemoryPhotoAction(tripId, photo.id);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch {
      setError("No pudimos borrar la foto. Probá de nuevo.");
      throw new Error("delete failed");
    }
  }

  const viewerStop = viewer ? allStops.find((stop) => stop.id === viewer.cityId) : null;
  const viewerPhotos = viewer ? grouped[viewer.cityId]?.photos || [] : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Recuerdos del viaje</h2>
        <p className="mt-1 text-sm text-gray-500">
          {[
            stops.map((stop) => stop.name).join(" → "),
            startDate && endDate ? rangeLabel(startDate, endDate) : null,
            plural(photos.length, "foto", "fotos"),
            plural(entries.length, "entrada de bitácora", "entradas de bitácora"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <StatCard
          label="Fotos subidas"
          value={photos.length}
          caption={photos.length ? `En ${citiesWithPhotos} de ${stops.length} ${stops.length === 1 ? "ciudad" : "ciudades"} del viaje` : "Subí la primera desde acá abajo"}
        />
        <StatCard
          label="Lugares con recuerdos"
          value={places.length}
          caption={places.length ? `${places.slice(0, 2).join(", ")}${places.length > 2 ? ` y ${places.length - 2} más` : ""}` : "Marcá dónde sacaste cada foto"}
        />
        <StatCard label="Bitácora" value={plural(entries.length, "entrada", "entradas")} caption={latestCaption} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-semibold text-gray-900">Por lugar</h2>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Todos
        </FilterChip>
        {allStops.map((stop) => (
          <FilterChip key={stop.id} active={filter === stop.id} onClick={() => setFilter(stop.id)}>
            {stop.flagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stop.flagUrl} alt="" className="h-3 w-auto rounded-[2px]" />
            ) : null}
            {stop.name}
          </FilterChip>
        ))}
        <PrimaryButton onClick={() => openUpload()} className="ml-2" disabled={!uploadStops.length}>
          Subir fotos +
        </PrimaryButton>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files?.length) openUpload(event.dataTransfer.files);
        }}
        className={`flex flex-col gap-4 rounded-2xl border-[1.5px] border-dashed px-6 py-5 transition sm:flex-row sm:items-center ${
          dragging ? "border-[#7386f5] bg-[#7386f5]/10" : "border-[#7386f5]/55 bg-[#7386f5]/5"
        }`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#7386f5]">
          <UploadIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-gray-900">{dragging ? "Soltá las fotos para subirlas" : "Arrastrá tus fotos acá"}</p>
          <p className="mt-1 text-[13px] leading-[19px] text-gray-500">
            O elegilas desde tu compu o celular. Después marcás en qué lugar las sacaste y, si querés, escribís cómo fue. Las
            achicamos antes de subirlas para que carguen rápido.
          </p>
        </div>
        <SecondaryButton onClick={() => fileInputRef.current?.click()} disabled={!uploadStops.length}>
          Elegir fotos
        </SecondaryButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) openUpload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {error ? <p className="rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-500">{error}</p> : null}

      <div className="flex flex-col gap-7">
        {visibleStops.map((stop) => {
          const order = stops.findIndex((item) => item.id === stop.id) + 1;
          const group = grouped[stop.id] || { photos: [], entries: [] };
          const uploadCity = stop.id === OTHER_ID ? null : stop.id;
          return (
            <CityBlock
              key={stop.id}
              stop={stop}
              order={order}
              photos={group.photos}
              entries={group.entries}
              onUpload={() => openUpload([], uploadCity)}
              onWrite={() => setEditor({ entry: null, cityId: uploadCity })}
              onEdit={(entry) => setEditor({ entry, cityId: entry.cityId })}
              onOpenPhoto={(index) => setViewer({ cityId: stop.id, index })}
            />
          );
        })}
        {!allStops.length ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
            Este viaje no tiene destinos todavía. Agregá ciudades para empezar a guardar recuerdos.
          </p>
        ) : null}
      </div>

      {upload ? (
        <UploadModal
          tripId={tripId}
          stops={uploadStops}
          suggestions={suggestions}
          initialFiles={upload.files}
          initialCityId={upload.cityId}
          onClose={() => setUpload(null)}
          onUploaded={(photo) => setPhotos((current) => [...current, photo])}
          onEntrySaved={(entry) => setEntries((current) => [entry, ...current])}
        />
      ) : null}

      {editor ? (
        <EntryModal
          tripId={tripId}
          stops={uploadStops}
          suggestions={suggestions}
          entry={editor.entry}
          initialCityId={editor.cityId}
          onClose={() => setEditor(null)}
          onSaved={(saved) =>
            setEntries((current) =>
              current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...current],
            )
          }
          onDeleted={(id) => setEntries((current) => current.filter((item) => item.id !== id))}
        />
      ) : null}

      {viewer && viewerPhotos.length ? (
        <PhotoViewer
          photos={viewerPhotos}
          startIndex={viewer.index}
          cityName={viewerStop?.name || ""}
          onClose={() => setViewer(null)}
          onDelete={handleDeletePhoto}
        />
      ) : null}
    </div>
  );
}
