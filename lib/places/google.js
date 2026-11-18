import { unstable_cache } from "next/cache";

// Cliente minimo para Places API (New) y Routes API. Todo pasa por aca para
// que siempre se mande un field mask (Google cobra segun los campos pedidos:
// pedir de mas sube el SKU) y para que los errores tiren una excepcion, asi
// `cached` no guarda respuestas fallidas.

const PLACES_BASE = "https://places.googleapis.com/v1";

export const HOUR = 60 * 60;
export const DAY = 24 * HOUR;

export function getApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

export class GoogleApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function parseError(response) {
  try {
    const data = await response.json();
    return data.error?.message || data.error?.status || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function googleFetch(url, { method = "GET", body, fieldMask, apiKey = getApiKey() } = {}) {
  if (!apiKey) {
    throw new GoogleApiError("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor.", 500);
  }

  const headers = { "X-Goog-Api-Key": apiKey };
  if (fieldMask) headers["X-Goog-FieldMask"] = fieldMask;
  if (body) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GoogleApiError(await parseError(response), response.status);
  }

  return response.json();
}

// GET /v1/places/{id}
export function placeDetailsRequest(placeId, fieldMask) {
  return googleFetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=es`, { fieldMask });
}

// POST /v1/places:searchNearby | places:searchText | places:autocomplete
export function placesPost(action, body, fieldMask) {
  return googleFetch(`${PLACES_BASE}/places:${action}`, { method: "POST", body, fieldMask });
}

// GET /v1/{photoName}/media - con skipHttpRedirect devuelve solo la URL final
// de la imagen (photoUri). Bajar la imagen desde esa URL no se cobra, asi que
// guardando la URL en cache cada foto se paga una sola vez por dia.
export function photoMediaRequest(photoName, maxWidthPx = 800) {
  const url = new URL(`${PLACES_BASE}/${photoName}/media`);
  url.searchParams.set("maxWidthPx", String(maxWidthPx));
  url.searchParams.set("skipHttpRedirect", "true");
  return googleFetch(url.toString());
}

// POST https://routes.googleapis.com/directions/v2:computeRoutes
export function computeRoutesRequest(body, fieldMask) {
  return googleFetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    body,
    fieldMask,
  });
}

// Cache persistente de Next (sobrevive entre requests y deploys en Vercel, y en
// .next/cache en local). Los argumentos de la funcion forman parte de la clave.
// Si la funcion tira error no se guarda nada y se reintenta la proxima vez.
export function cached(fn, name, revalidate) {
  return unstable_cache(fn, ["google", name, "v1"], { revalidate });
}

// Redondea coordenadas para que dos pedidos casi iguales compartan cache
// (4 decimales = ~11 metros).
export function roundCoord(value) {
  return Math.round(Number(value) * 1e4) / 1e4;
}

// ---------------------------------------------------------------------------
// Horarios: Google devuelve "openNow" ya calculado, pero si lo guardamos en
// cache queda viejo. Guardamos los periodos semanales + el huso horario del
// lugar y calculamos abierto/cerrado en el momento de mostrarlo.

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
    if (!period.close) {
      return { openNow: true, closesAt: null };
    }
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

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// Places (New) devuelve el nivel de precio como texto; la UI usa 0-4.
export function priceLevelNumber(level) {
  return Object.hasOwn(PRICE_LEVELS, level) ? PRICE_LEVELS[level] : null;
}

export function distanceMeters(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function circle(lat, lng, radius) {
  return { circle: { center: { latitude: lat, longitude: lng }, radius } };
}
