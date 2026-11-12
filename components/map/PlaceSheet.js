"use client";

import { useState, useTransition } from "react";
import AddToItineraryButton from "@/components/trips/AddToItineraryButton";
import { toggleFavoritePlace } from "@/app/dashboard/trips/actions";

const TABS = [
  { id: "overview", label: "Vista general" },
  { id: "menu", label: "Carta" },
  { id: "reviews", label: "Reseñas" },
  { id: "photos", label: "Fotos" },
  { id: "info", label: "Información" },
];

const AVATAR_COLORS = ["#059669", "#facc15", "#7386f5", "#f97316", "#0ea5e9", "#a855f7"];
const ITINERARY_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function stars(value) {
  const rounded = Math.round(value || 0);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function priceSymbols(level) {
  if (typeof level !== "number") return null;
  return level === 0 ? "Gratis" : "$".repeat(level);
}

function initials(name) {
  const words = String(name || "?").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "?";
}

function shortName(name) {
  const words = String(name || "").split(/\s+/).filter(Boolean);
  return words.length > 1 ? `${words[0]} ${words[1][0]}.` : words[0] || "";
}

// "lunes: 11:00–1:00" -> { day: "Lunes", hours: "11:00 – 1:00" }
function parseWeekday(line) {
  const index = line.indexOf(":");
  if (index === -1) return { day: line, hours: "" };
  return {
    day: capitalize(line.slice(0, index).trim()),
    hours: line.slice(index + 1).trim().replace(/\s*–\s*/g, " – "),
  };
}

// Google arranca weekday_text en lunes.
function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function findInItinerary(itinerary, placeId) {
  for (const [date, items] of Object.entries(itinerary || {})) {
    const item = (items || []).find((entry) => entry.placeId === placeId);
    if (item) return { date, time: item.time };
  }
  return null;
}

function InfoRow({ icon, title, subtitle, href }) {
  const content = (
    <span className="flex min-w-0 flex-1 flex-col gap-px">
      <span className="truncate text-sm font-medium text-gray-900">{title}</span>
      {subtitle ? <span className="truncate text-xs text-gray-500">{subtitle}</span> : null}
    </span>
  );

  return (
    <div className="flex w-full items-center gap-3">
      <span className="w-5 shrink-0 text-center text-base">{icon}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:text-[#7386f5]">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

function ReviewsTab({ details }) {
  const reviews = details?.reviews || [];
  if (!details?.rating && reviews.length === 0) {
    return <p className="text-sm text-gray-400">Todavía no hay reseñas de este lugar.</p>;
  }

  // Google solo devuelve hasta 5 reseñas: el reparto de estrellas sale de esas.
  const counts = [5, 4, 3, 2, 1].map((value) => reviews.filter((review) => Math.round(review.rating) === value).length);
  const max = Math.max(1, ...counts);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 flex-col items-center">
          <span className="text-4xl font-black text-gray-900">{details.rating?.toFixed(1)}</span>
          <span className="text-xs text-[#7386f5]">{stars(details.rating)}</span>
          <span className="text-[10px] text-gray-500">{(details.ratingsCount || 0).toLocaleString("es-AR")} reseñas</span>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {counts.map((count, index) => (
            <div key={5 - index} className="flex items-center gap-2">
              <span className="w-2 text-[10px] text-gray-500">{5 - index}</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span className="block h-full rounded-full bg-[#7386f5]" style={{ width: `${(count / max) * 100}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {reviews.map((review, index) => (
        <div key={`${review.author}-${index}`} className="flex gap-2.5">
          {review.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.avatar} alt="" referrerPolicy="no-referrer" className="h-6 w-6 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
            >
              {initials(review.author)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs">
              <span className="font-semibold text-gray-900">{shortName(review.author)}</span>
              <span className="ml-1.5 text-[#7386f5]">{stars(review.rating)}</span>
            </p>
            <p className="mt-0.5 line-clamp-3 text-xs text-gray-700">{review.text}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">{review.relativeTime}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuTab({ details }) {
  const price = priceSymbols(details?.priceLevel);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-gray-400">PRECIOS</p>
      {details?.priceRange ? (
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-900">Rango por persona</span>
          <span className="text-gray-700">{details.priceRange}</span>
        </div>
      ) : null}
      {price ? (
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-900">Nivel de precios</span>
          <span className="text-gray-700">{price}</span>
        </div>
      ) : null}
      {!details?.priceRange && !price ? (
        <p className="text-sm text-gray-400">Google no informa precios para este lugar.</p>
      ) : null}
      {details?.website ? (
        <a
          href={details.website}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-[#7386f5] hover:underline"
        >
          Ver la carta en su sitio web →
        </a>
      ) : null}
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
        Google no publica la carta completa: los precios son aproximados.
      </p>
    </div>
  );
}

function PhotosTab({ photos }) {
  if (!photos || photos.length === 0) {
    return <p className="text-sm text-gray-400">No hay fotos disponibles para este lugar.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={photo} src={photo} alt={`Foto ${index + 1}`} className="aspect-[4/3] w-full rounded-lg object-cover" />
      ))}
    </div>
  );
}

function InfoTab({ details }) {
  const days = (details?.weekdayText || []).map(parseWeekday);
  const today = todayIndex();

  return (
    <div className="flex flex-col gap-2">
      {days.length > 0 ? (
        <>
          <p className="text-[11px] font-semibold text-gray-400">HORARIOS</p>
          {days.map((entry, index) => {
            const closed = /cerrado/i.test(entry.hours);
            const isToday = index === today;
            return (
              <div key={entry.day} className="flex justify-between text-xs">
                <span className={isToday ? "font-semibold text-[#7386f5]" : "text-gray-700"}>{entry.day}</span>
                <span
                  className={
                    isToday ? "font-semibold text-[#7386f5]" : closed ? "text-red-500" : "text-gray-700"
                  }
                >
                  {closed ? "Cerrado" : entry.hours}
                </span>
              </div>
            );
          })}
        </>
      ) : null}

      {details?.station || details?.wheelchairAccessible || details?.paymentText ? (
        <>
          <p className="mt-2 text-[11px] font-semibold text-gray-400">CÓMO LLEGAR</p>
          {details.station ? (
            <InfoRow icon="🚇" title={details.station.name} subtitle={`${details.station.walkMinutes} min caminando`} />
          ) : null}
          {details.wheelchairAccessible ? <InfoRow icon="♿" title="Acceso para silla de ruedas" /> : null}
          {details.paymentText ? <InfoRow icon="💳" title={details.paymentText} /> : null}
        </>
      ) : null}

      {days.length === 0 && !details?.station ? (
        <p className="text-sm text-gray-400">Google no tiene más información de este lugar.</p>
      ) : null}
    </div>
  );
}

export default function PlaceSheet({
  place,
  details,
  loading,
  activeTab,
  onTabChange,
  onClose,
  tripId,
  dateList,
  itinerary,
  favoriteIds = [],
  city,
}) {
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.id}`;
  const [favorite, setFavorite] = useState(favoriteIds.includes(place.id));
  const [, startTransition] = useTransition();

  const rating = details?.rating ?? place.rating;
  const price = priceSymbols(details?.priceLevel);
  const category = details?.category || place.category;
  const itineraryPlace = {
    placeId: place.id,
    name: place.name,
    lat: details?.lat ?? place.lat,
    lng: details?.lng ?? place.lng,
    image: place.image,
    category,
    description: details?.description || place.description || null,
  };
  const inItinerary = findInItinerary(itinerary, place.id);
  const canPlan = Boolean(tripId && dateList?.length);
  const todayHours = details?.weekdayText?.[todayIndex()] ? parseWeekday(details.weekdayText[todayIndex()]).hours : null;

  function handleFavorite() {
    const previous = favorite;
    setFavorite(!previous);
    startTransition(async () => {
      try {
        const result = await toggleFavoritePlace(tripId, { ...itineraryPlace, city });
        setFavorite(result.saved);
      } catch {
        setFavorite(previous);
      }
    });
  }

  return (
    <div className="absolute inset-x-3 bottom-3 top-24 z-20 flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
      <div className="relative h-[170px] shrink-0 bg-gray-100">
        {place.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.image} alt={place.name} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-[60px] bg-linear-to-b from-white/0 to-white" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute left-3.5 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[13px] font-semibold text-gray-700 transition hover:bg-white"
        >
          ✕
        </button>
        {canPlan ? (
          <div className="absolute right-3.5 top-3">
            <AddToItineraryButton
              place={itineraryPlace}
              dateList={dateList}
              tripId={tripId}
              compact
              direction="down"
              label="+"
              showAdded={false}
              buttonClassName="flex h-7 w-7 items-center justify-center rounded-full bg-[#7386f5] text-lg font-semibold leading-none text-white transition hover:bg-[#5f70e0]"
            />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 px-5 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-[22px] font-bold text-gray-900 hover:text-[#7386f5]"
          >
            {place.name}
          </a>
          {rating ? (
            <span className="shrink-0 text-sm">
              <span className="font-medium text-gray-500">{Number(rating).toFixed(1)}</span>
              <span className="ml-1.5 text-[#7386f5]">{stars(rating)}</span>
            </span>
          ) : null}
        </div>
        <p className="truncate text-[13px]">
          {details?.typeLabel ? <span className="text-gray-500">{details.typeLabel} </span> : null}
          <span className="font-medium text-[#9E5941]">
            {details?.typeLabel && (category || price) ? "· " : ""}
            {[category, price].filter(Boolean).join(" · ")}
          </span>
        </p>
        {details && details.openNow !== null ? (
          <p className="text-[13px]">
            {details.openNow ? (
              <span className="font-semibold text-emerald-600">Abierto</span>
            ) : (
              <span className="font-semibold text-red-500">Cerrado</span>
            )}
            {details.closesAt ? <span className="whitespace-pre text-gray-700">{`  •  Cierra ${details.closesAt}`}</span> : null}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-between gap-2 overflow-x-auto border-b border-gray-200 px-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 whitespace-nowrap border-b-2 py-2.5 text-[13px] transition ${
              activeTab === tab.id
                ? "border-[#7386f5] font-semibold text-[#7386f5]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
        {loading ? (
          <p className="text-sm text-gray-400">Cargando información...</p>
        ) : (
          <>
            {activeTab === "overview" ? (
              <div className="flex flex-col gap-3.5">
                {canPlan ? (
                  <div className="flex gap-2.5">
                    <AddToItineraryButton
                      place={itineraryPlace}
                      dateList={dateList}
                      tripId={tripId}
                      className="flex-1"
                      direction="down"
                      label="+ Agregar al itinerario"
                      showAdded={false}
                      buttonClassName="flex w-full justify-center rounded-[10px] bg-[#7386f5] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5f70e0]"
                    />
                    <button
                      type="button"
                      onClick={handleFavorite}
                      aria-pressed={favorite}
                      className={`shrink-0 rounded-[10px] border px-3.5 py-2.5 text-sm font-medium transition ${
                        favorite
                          ? "border-[#7386f5] bg-[#7386f5]/10 text-[#7386f5]"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {favorite ? "♥ En favoritos" : "♡ Favoritos"}
                    </button>
                  </div>
                ) : null}

                {details?.description ? <p className="text-sm text-gray-700">{details.description}</p> : null}

                {price || details?.tags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {[price, ...(details?.tags || [])].filter(Boolean).map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {details?.address || place.address ? (
                  <InfoRow
                    icon="📍"
                    title={details?.address || place.address}
                    subtitle={
                      details?.station
                        ? `A ${details.station.walkMinutes} min de ${details.station.name}`
                        : null
                    }
                    href={mapsUrl}
                  />
                ) : null}
                {todayHours ? (
                  <InfoRow
                    icon="🕐"
                    title={`Hoy: ${todayHours}`}
                    subtitle={details.openNow === null ? null : details.openNow ? "Abierto ahora" : "Cerrado ahora"}
                  />
                ) : null}
                {details?.phone ? <InfoRow icon="📞" title={details.phone} href={`tel:${details.phone}`} /> : null}
                {details?.website ? (
                  <InfoRow
                    icon="🌐"
                    title={details.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    href={details.website}
                  />
                ) : null}

                {inItinerary ? (
                  <div className="flex items-center gap-2.5 rounded-xl bg-[#7386f5]/8 px-3 py-2.5">
                    <span className="text-base">🗓️</span>
                    <p className="flex-1 text-[13px] font-medium text-[#7386f5]">
                      Está en tu itinerario:{" "}
                      {capitalize(ITINERARY_DATE_FORMATTER.format(new Date(`${inItinerary.date}T00:00:00`)))}
                      {inItinerary.time ? `, ${inItinerary.time}` : ""}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "menu" ? <MenuTab details={details} /> : null}
            {activeTab === "reviews" ? <ReviewsTab details={details} /> : null}
            {activeTab === "photos" ? <PhotosTab photos={details?.photos} /> : null}
            {activeTab === "info" ? <InfoTab details={details} /> : null}
          </>
        )}
      </div>
    </div>
  );
}
