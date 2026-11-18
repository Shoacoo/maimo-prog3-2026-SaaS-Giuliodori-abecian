import { CATEGORY_LABELS } from "@/lib/places/nearby";
import { placePhotoUrl } from "@/lib/places/photoUrl";
import {
  cached,
  circle,
  compactHours,
  DAY,
  distanceMeters,
  openStatus,
  placeDetailsRequest,
  placesPost,
  priceLevelNumber,
  roundCoord,
} from "@/lib/places/google";

function guessCategory(types) {
  const match = (types || []).find((type) => CATEGORY_LABELS[type]);
  return match ? CATEGORY_LABELS[match] : null;
}

const numberFormat = new Intl.NumberFormat("es-AR");

// Descripcion armada solo con datos reales de Google (tipo, barrio, ciudad y
// puntuacion) para los lugares que no tienen resumen editorial.
function composeDescription(data) {
  const type = data.primaryTypeDisplayName?.text;
  const components = data.addressComponents || [];
  const findPart = (pattern) => components.find((part) => part.types?.some((kind) => pattern.test(kind)))?.longText;
  const area = [findPart(/^(neighborhood|sublocality)/), findPart(/^locality$/)].filter(Boolean);
  const uniqueArea = [...new Set(area)].join(", ");

  const sentences = [];
  if (type) sentences.push(uniqueArea ? `${type} en ${uniqueArea}.` : `${type}.`);
  if (typeof data.rating === "number" && data.userRatingCount) {
    const rating = data.rating.toFixed(1).replace(".", ",");
    const reviews = numberFormat.format(data.userRatingCount);
    sentences.push(`Puntuación ${rating} en Google (${reviews} ${data.userRatingCount === 1 ? "reseña" : "reseñas"}).`);
  }
  return sentences.join(" ") || null;
}

const DESCRIPTION_FIELDS = "editorialSummary,primaryTypeDisplayName,addressComponents,rating,userRatingCount";

function describe(data) {
  return data.editorialSummary?.text || composeDescription(data);
}

// Descripcion del lugar desde Places API (New). Primero usa el resumen
// editorial de Google (una linea curada, en español), que solo existe para
// lugares conocidos (ej. Museo Picasso si, una galeria chica no: probado
// contra la API). Si no hay, arma una con tipo + zona + puntuacion, para que
// todas las cards tengan descripcion sin inventar nada. Cacheada 30 dias.
const cachedDescription = cached(
  async (placeId) => describe(await placeDetailsRequest(placeId, DESCRIPTION_FIELDS)),
  "place-description",
  30 * DAY,
);

export async function fetchEditorialSummary(placeId, apiKey) {
  try {
    return await cachedDescription(placeId);
  } catch {
    return null;
  }
}

// Estacion de transporte mas cercana, para "Cómo llegar" ("A 4 min de la
// estación Namba"). Minutos caminando estimados a 80 m/min. Nearby Search
// (New) ordenado por distancia, 1 resultado, cacheado 30 dias por punto.
async function nearestStation(lat, lng) {
  const data = await placesPost(
    "searchNearby",
    {
      includedTypes: ["transit_station"],
      maxResultCount: 1,
      rankPreference: "DISTANCE",
      languageCode: "es",
      locationRestriction: circle(lat, lng, 2000),
    },
    "places.displayName,places.location",
  );
  const station = data.places?.[0];
  if (!station?.location) {
    return null;
  }
  const meters = distanceMeters({ lat, lng }, { lat: station.location.latitude, lng: station.location.longitude });
  if (meters > 2000) {
    return null;
  }
  return { name: station.displayName?.text || "", walkMinutes: Math.max(1, Math.round(meters / 80)) };
}

const cachedStation = cached(nearestStation, "nearest-station", 30 * DAY);

async function fetchNearestStation(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return cachedStation(roundCoord(lat), roundCoord(lng)).catch(() => null);
}

function formatMoney(money) {
  if (!money?.currencyCode) {
    return null;
  }
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: money.currencyCode,
      maximumFractionDigits: 0,
    }).format(Number(money.units || 0));
  } catch {
    return `${money.currencyCode} ${money.units || 0}`;
  }
}

function buildExtras(extras) {
  const payment = extras.paymentOptions || {};
  const tags = [];
  if (payment.acceptsCreditCards) tags.push("Acepta tarjeta");
  if (payment.acceptsCashOnly) tags.push("Solo efectivo");
  if (extras.takeout) tags.push("Para llevar");
  if (extras.delivery) tags.push("Delivery");
  if (extras.reservable === true) tags.push("Con reserva");
  if (extras.reservable === false) tags.push("Sin reserva");

  let paymentText = null;
  if (payment.acceptsCashOnly) paymentText = "Solo efectivo";
  else if (payment.acceptsCreditCards) paymentText = payment.acceptsNfc ? "Efectivo, tarjeta y pago con el celular" : "Efectivo y tarjeta";

  const start = formatMoney(extras.priceRange?.startPrice);
  const end = formatMoney(extras.priceRange?.endPrice);

  return {
    typeLabel: extras.primaryTypeDisplayName?.text || null,
    tags,
    paymentText,
    wheelchairAccessible: extras.accessibilityOptions?.wheelchairAccessibleEntrance === true,
    priceRange: start ? (end ? `${start} – ${end}` : `Desde ${start}`) : null,
  };
}

// Todo lo que muestra la ficha del lugar, en UNA llamada a Place Details
// (New). Antes eran hasta tres (Details vieja + descripcion + extras).
const DETAILS_FIELDS = [
  "id",
  "displayName",
  "location",
  "types",
  "rating",
  "userRatingCount",
  "formattedAddress",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "currentOpeningHours",
  "utcOffsetMinutes",
  "reviews",
  "photos",
  "priceLevel",
  "priceRange",
  "editorialSummary",
  "primaryTypeDisplayName",
  "addressComponents",
  "paymentOptions",
  "takeout",
  "delivery",
  "dineIn",
  "reservable",
  "accessibilityOptions",
].join(",");

// Se guarda ya armado (sin "abierto ahora", que se calcula al leer) durante
// 12 horas: el itinerario, el mapa y la ficha comparten esta misma entrada.
async function fetchPlaceDetails(placeId) {
  const result = await placeDetailsRequest(placeId, DETAILS_FIELDS);
  const hours = result.currentOpeningHours || result.regularOpeningHours;

  return {
    placeId,
    name: result.displayName?.text || "",
    lat: result.location?.latitude ?? null,
    lng: result.location?.longitude ?? null,
    category: guessCategory(result.types),
    description: describe(result),
    rating: result.rating ?? null,
    ratingsCount: result.userRatingCount || 0,
    address: result.formattedAddress || null,
    phone: result.nationalPhoneNumber || null,
    website: result.websiteUri || null,
    priceLevel: priceLevelNumber(result.priceLevel),
    periods: compactHours(result.regularOpeningHours),
    utcOffsetMinutes: result.utcOffsetMinutes ?? null,
    weekdayText: hours?.weekdayDescriptions || [],
    reviews: (result.reviews || []).map((review) => ({
      author: review.authorAttribution?.displayName || "",
      avatar: review.authorAttribution?.photoUri || null,
      rating: review.rating,
      relativeTime: review.relativePublishTimeDescription || "",
      text: review.text?.text || review.originalText?.text || "",
    })),
    extras: buildExtras(result),
    photos: (result.photos || []).slice(0, 12).map((photo) => placePhotoUrl(photo.name, placeId)),
  };
}

const cachedPlaceDetails = cached(fetchPlaceDetails, "place-details", 12 * 60 * 60);

export async function getPlaceDetails(placeId, apiKey, { extras = false } = {}) {
  let details;
  try {
    details = await cachedPlaceDetails(placeId);
  } catch (error) {
    return { error: error.message || "No se pudo cargar el lugar." };
  }

  const { periods, utcOffsetMinutes, extras: extraData, ...rest } = details;
  const status = openStatus(periods, utcOffsetMinutes);
  const station = extras ? await fetchNearestStation(rest.lat, rest.lng) : null;

  return {
    ...rest,
    openNow: status.openNow,
    closesAt: status.openNow ? status.closesAt : null,
    ...(extras ? { ...extraData, station } : {}),
  };
}
