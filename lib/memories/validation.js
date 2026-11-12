import { listTripDates } from "@/lib/trips/dates";

// Validacion en servidor de lo que llega desde Recuerdos. Nunca se confia en
// el nombre de ciudad que manda el cliente: se toma de los destinos del viaje.

export const ENTRY_TEXT_MAX = 600;
export const ENTRY_TITLE_MAX = 80;
export const PLACE_NAME_MAX = 80;

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

export function resolveCity(trip, cityId) {
  const city = trip.destinations.find((destination) => destination.id === cityId);
  if (!city) {
    throw new Error("La ciudad elegida no es parte del viaje.");
  }
  return { cityId: city.id, cityName: city.name };
}

export function resolveDate(trip, date) {
  if (!date) return null;
  const dates = trip.startDate && trip.endDate ? listTripDates(trip.startDate, trip.endDate) : [];
  return dates.includes(date) ? date : null;
}

export function sanitizePhotoMeta(trip, { cityId, date, placeName, placeId }) {
  return {
    ...resolveCity(trip, String(cityId || "")),
    date: resolveDate(trip, String(date || "")),
    placeName: clean(placeName, PLACE_NAME_MAX) || null,
    placeId: clean(placeId, 200) || null,
  };
}

export function sanitizeEntry(trip, { cityId, date, title, text, places }) {
  const cleanText = clean(text, ENTRY_TEXT_MAX);
  if (!cleanText) {
    throw new Error("La entrada de la bitácora está vacía.");
  }
  const city = resolveCity(trip, String(cityId || ""));
  const cleanPlaces = Array.isArray(places)
    ? [...new Set(places.map((place) => clean(place, PLACE_NAME_MAX)).filter(Boolean))].slice(0, 6)
    : [];
  return {
    ...city,
    date: resolveDate(trip, String(date || "")),
    title: clean(title, ENTRY_TITLE_MAX) || cleanPlaces[0] || `Recuerdos de ${city.cityName}`,
    text: cleanText,
    places: cleanPlaces,
  };
}
