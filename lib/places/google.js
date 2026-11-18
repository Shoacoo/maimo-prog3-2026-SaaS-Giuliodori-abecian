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

export async function placesRequest(path, { apiKey, fieldMask, body, languageCode = "es" } = {}) {
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
export async function computeDrivingRoute(points, apiKey) {
  const waypoint = (point) => ({ location: { latLng: { latitude: point.lat, longitude: point.lng } } });
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
    },
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
