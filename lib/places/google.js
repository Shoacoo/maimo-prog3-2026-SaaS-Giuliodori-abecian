import { unstable_cache } from "next/cache";
import { placePhotoUrl } from "@/lib/places/photoUrl";

// Cliente minimo de Places API (New) y Routes API, usado por todas las rutas
// /api/places/*. Las versiones "legacy" (maps/api/place/... y Directions) no se
// pueden habilitar en proyectos de Google Cloud nuevos, asi que la app usa
// solo las nuevas. Cada ruta convierte la respuesta al mismo formato que ya
// usaban las pantallas, para que el cambio de API no se note en la interfaz.

const PLACES_BASE = "https://places.googleapis.com/v1";

export class GoogleApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function getApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

export const HOUR = 60 * 60;
export const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// Cache de servidor para los pedidos a Google. Cada pedido tarda y consume
// credito, y muchos se repiten (el mapa y "Lugares para visitar" piden lo
// mismo, varias personas abren la misma ciudad, una ficha se abre dos veces).
//
// - unstable_cache de Next: persiste en .next/cache (sobrevive reinicios del
//   servidor) y los argumentos forman parte de la clave. La API key NO va como
//   argumento: se lee de process.env adentro de cada funcion.
// - Si la funcion tira error no se guarda nada y se reintenta la proxima vez,
//   por eso las funciones cacheadas tiran excepcion ante un error de Google.
// - Ademas se comparten las promesas en curso: dos pedidos iguales al mismo
//   tiempo hacen una sola llamada a Google.
const inFlight = globalThis.__triphyGoogleInFlight || (globalThis.__triphyGoogleInFlight = new Map());

export function cached(fn, name, revalidate) {
  const persistent = unstable_cache(fn, ["google", name, "v2"], { revalidate });
  return (...args) => {
    const key = `${name}:${JSON.stringify(args)}`;
    if (inFlight.has(key)) return inFlight.get(key);
    const promise = persistent(...args).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };
}

// 4 decimales = ~11 metros: dos pedidos casi iguales comparten cache.
export function roundCoord(value) {
  return Math.round(Number(value) * 1e4) / 1e4;
}

// ---------------------------------------------------------------------------
// Horarios: el "openNow" de Google queda viejo si se guarda en cache, asi que
// se guardan los periodos semanales + el huso horario del lugar y se calcula
// abierto/cerrado en el momento de mostrarlo.
function formatClock(hour, minute) {
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return minute ? `${hour12}:${String(minute).padStart(2, "0")}${suffix}` : `${hour12}${suffix}`;
}

const WEEK = 7 * 24 * 60;

export function openStatus(periods, utcOffsetMinutes, fallbackOpenNow = null) {
  if (!Array.isArray(periods) || periods.length === 0 || !Number.isFinite(utcOffsetMinutes)) {
    return { openNow: typeof fallbackOpenNow === "boolean" ? fallbackOpenNow : null, closesAt: null };
  }

  const local = new Date(Date.now() + utcOffsetMinutes * 60 * 1000);
  const now = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes();

  for (const period of periods) {
    const open = period.open;
    if (!open) continue;
    const start = open.day * 1440 + (open.hour || 0) * 60 + (open.minute || 0);
    // Sin "close" = abierto las 24 horas.
    if (!period.close) return { openNow: true, closesAt: null };
    let end = period.close.day * 1440 + (period.close.hour || 0) * 60 + (period.close.minute || 0);
    if (end <= start) end += WEEK;
    if ((now >= start && now < end) || (now + WEEK >= start && now + WEEK < end)) {
      return { openNow: true, closesAt: formatClock(period.close.hour || 0, period.close.minute || 0) };
    }
  }

  return { openNow: false, closesAt: null };
}

// Solo lo que hace falta de regularOpeningHours para calcular el estado.
export function compactHours(hours) {
  return (hours?.periods || []).map((period) => ({
    open: period.open ? { day: period.open.day, hour: period.open.hour, minute: period.open.minute } : null,
    close: period.close ? { day: period.close.day, hour: period.close.hour, minute: period.close.minute } : null,
  }));
}

export async function placesRequest(path, { apiKey = getApiKey(), fieldMask, body, languageCode = "es" } = {}) {
  if (!apiKey) throw new GoogleApiError("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor.", 500);
  const url = new URL(`${PLACES_BASE}/${path}`);
  if (!body && languageCode) url.searchParams.set("languageCode", languageCode);

  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body.languageCode || !languageCode ? body : { ...body, languageCode }) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GoogleApiError(data.error?.message || `Google respondió ${response.status}`, response.status);
  }
  return data;
}

// Ids de lugar y nombres de foto: se validan antes de armar URLs con ellos.
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;
export const PHOTO_NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

// Lee lat/lng opcionales de la URL. Ojo: Number(null) es 0, asi que sin este
// chequeo una busqueda sin coordenadas quedaba "cerca de 0,0" (y la busqueda
// de ciudades perdia el filtro de solo ciudades).
export function readLatLng(searchParams) {
  const rawLat = searchParams.get("lat");
  const rawLng = searchParams.get("lng");
  if (!rawLat || !rawLng) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function toLatLng(location) {
  return { lat: location?.latitude ?? null, lng: location?.longitude ?? null };
}

export function circle(lat, lng, radius) {
  return { circle: { center: { latitude: lat, longitude: lng }, radius } };
}

export function firstPhotoUrl(place) {
  const name = place.photos?.[0]?.name;
  return name ? placePhotoUrl(name, place.id) : null;
}

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// La API nueva devuelve el nivel de precio como texto; la app usa 0 a 4.
export function priceLevelNumber(priceLevel) {
  return priceLevel in PRICE_LEVELS ? PRICE_LEVELS[priceLevel] : null;
}

export function openNow(place) {
  const value = place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow;
  return typeof value === "boolean" ? value : null;
}

export function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Polyline codificada (formato de Google) -> lista de {lat, lng}.
export function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of ["lat", "lng"]) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === "lat") lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Routes API: ruta en auto que pasa por las paradas en orden. Devuelve null si
// no hay camino por tierra (por ejemplo, ciudades separadas por un oceano).
async function computeDrivingRouteUncached(points) {
  const apiKey = getApiKey();
  if (!apiKey) throw new GoogleApiError("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor.", 500);
  const waypoint = (point) => ({ location: { latLng: { latitude: point.lat, longitude: point.lng } } });
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
    },
    cache: "no-store",
    body: JSON.stringify({
      origin: waypoint(points[0]),
      destination: waypoint(points[points.length - 1]),
      intermediates: points.slice(1, -1).map(waypoint),
      travelMode: "DRIVE",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GoogleApiError(data.error?.message || `Google respondió ${response.status}`, response.status);
  }
  const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
  return encoded ? decodePolyline(encoded) : null;
}

// Las rutas entre ciudades no cambian: 30 dias. Las coordenadas se redondean
// para que el mismo viaje siempre use la misma entrada.
const cachedDrivingRoute = cached(computeDrivingRouteUncached, "route", 30 * DAY);

export function computeDrivingRoute(points) {
  return cachedDrivingRoute(points.map((point) => ({ lat: roundCoord(point.lat), lng: roundCoord(point.lng) })));
}

// GET /v1/{photoName}/media con skipHttpRedirect: devuelve solo la URL final de
// la imagen (photoUri). Bajar la imagen desde esa URL no se cobra, asi que
// guardando la URL cada foto se paga una vez por dia.
async function photoUriUncached(photoName, maxWidthPx) {
  const apiKey = getApiKey();
  if (!apiKey) throw new GoogleApiError("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor.", 500);
  const url = new URL(`${PLACES_BASE}/${photoName}/media`);
  url.searchParams.set("maxWidthPx", String(maxWidthPx));
  url.searchParams.set("skipHttpRedirect", "true");
  const response = await fetch(url, { headers: { "X-Goog-Api-Key": apiKey }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.photoUri) {
    throw new GoogleApiError(data.error?.message || `Google respondió ${response.status}`, response.status);
  }
  return data.photoUri;
}

export const getPhotoUri = cached(photoUriUncached, "photo-uri", DAY);
export { photoUriUncached };
