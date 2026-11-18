import { CATEGORY_LABELS } from "@/lib/places/nearby";
import { placePhotoUrl } from "@/lib/places/photoUrl";
import { DAY, HOUR, cached, circle, compactHours, openStatus, placesRequest, priceLevelNumber, roundCoord, toLatLng } from "@/lib/places/google";

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

// Descripcion del lugar desde Places API (New). Primero usa el resumen
// editorial de Google (una linea curada, en español), que solo existe para
// lugares conocidos (ej. Museo Picasso si, una galeria chica no: probado
// contra la API). Si no hay, arma una con tipo + zona + puntuacion, para que
// todas las cards tengan descripcion sin inventar nada.
async function fetchEditorialSummaryUncached(placeId) {
  const data = await placesRequest(`places/${placeId}`, {
    fieldMask: "editorialSummary,primaryTypeDisplayName,addressComponents,rating,userRatingCount",
  });
  return data.editorialSummary?.text || composeDescription(data);
}

// 30 dias por placeId. Un error de Google no se guarda (devuelve null).
const cachedEditorialSummary = cached(fetchEditorialSummaryUncached, "description", 30 * DAY);

// apiKey se acepta por compatibilidad: la key se lee de process.env.
// eslint-disable-next-line no-unused-vars
export async function fetchEditorialSummary(placeId, apiKey) {
  try {
    return await cachedEditorialSummary(placeId);
  } catch {
    return null;
  }
}

// Datos extra de la ficha de lugar (tipo legible, formas de pago, para llevar,
// reservas, accesibilidad y rango de precios): se piden en el mismo pedido que
// el resto de la ficha (ver getPlaceDetails).
const EXTRA_FIELDS = "paymentOptions,takeout,delivery,dineIn,reservable,accessibilityOptions,priceRange";

function distanceMeters(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Estacion de transporte mas cercana, para "Cómo llegar" ("A 4 min de la
// estación Namba"). Minutos caminando estimados a 80 m/min.
async function fetchNearestStationUncached(lat, lng) {
  // Nearby Search (Places API New): la estacion mas cercana en 2 km.
  const data = await placesRequest("places:searchNearby", {
      fieldMask: "places.displayName,places.location",
      body: {
        includedTypes: ["transit_station"],
        maxResultCount: 1,
        rankPreference: "DISTANCE",
        locationRestriction: circle(lat, lng, 2000),
      },
    });
  const station = data.places?.[0];
  if (!station?.location) {
    return null;
  }
  const meters = distanceMeters({ lat, lng }, toLatLng(station.location));
  if (meters > 2000) {
    return null;
  }
  return { name: station.displayName?.text || "", walkMinutes: Math.max(1, Math.round(meters / 80)) };
}

// Las estaciones no se mudan: 30 dias.
const cachedNearestStation = cached(fetchNearestStationUncached, "station", 30 * DAY);

async function fetchNearestStation(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  try {
    return await cachedNearestStation(roundCoord(lat), roundCoord(lng));
  } catch {
    return null;
  }
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

// Ficha completa de un lugar con Places API (New), en un solo pedido: datos
// basicos, horarios, reseñas, fotos, la descripcion (resumen editorial o la
// armada con datos reales) y, con extras, formas de pago y demas. Devuelve el
// mismo formato que la version anterior (Places legacy).
const DETAIL_FIELDS = [
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
  "utcOffsetMinutes",
  "reviews",
  "photos",
  "priceLevel",
  "editorialSummary",
  "primaryTypeDisplayName",
  "addressComponents",
].join(",");

// Siempre se piden tambien los extras: van en el mismo pedido y al mismo
// precio (la ficha ya pide reseñas, que son del SKU mas alto), y asi la ficha
// del mapa y el refresco del itinerario comparten una sola entrada de cache.
// Se guarda 12 h; "abierto ahora" NO se guarda, se calcula al leer.
async function fetchPlaceUncached(placeId) {
  const place = await placesRequest(`places/${placeId}`, { fieldMask: `${DETAIL_FIELDS},${EXTRA_FIELDS}` });
  return {
    ...place,
    regularOpeningHours: place.regularOpeningHours
      ? { periods: compactHours(place.regularOpeningHours), weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions || [] }
      : null,
  };
}

const cachedPlace = cached(fetchPlaceUncached, "place-details", 12 * HOUR);

// apiKey se acepta por compatibilidad: la key se lee de process.env.
// eslint-disable-next-line no-unused-vars
export async function getPlaceDetails(placeId, apiKey, { extras = false } = {}) {
  let place;
  try {
    place = await cachedPlace(placeId);
  } catch (err) {
    return { error: err.message };
  }

  const location = toLatLng(place.location);
  const openingHours = place.regularOpeningHours;
  const { openNow: isOpen, closesAt } = openStatus(openingHours?.periods, place.utcOffsetMinutes);
  const station = extras ? await fetchNearestStation(location.lat, location.lng) : null;

  return {
    placeId,
    name: place.displayName?.text || "",
    lat: location.lat,
    lng: location.lng,
    category: guessCategory(place.types),
    description: place.editorialSummary?.text || composeDescription(place),
    rating: place.rating ?? null,
    ratingsCount: place.userRatingCount || 0,
    address: place.formattedAddress || null,
    phone: place.nationalPhoneNumber || null,
    website: place.websiteUri || null,
    priceLevel: priceLevelNumber(place.priceLevel),
    openNow: isOpen,
    closesAt: isOpen ? closesAt : null,
    weekdayText: openingHours?.weekdayDescriptions || [],
    reviews: (place.reviews || []).map((review) => ({
      author: review.authorAttribution?.displayName || "",
      avatar: review.authorAttribution?.photoUri || null,
      rating: review.rating,
      relativeTime: review.relativePublishTimeDescription || "",
      text: review.text?.text || review.originalText?.text || "",
    })),
    ...(extras ? { ...buildExtras(place), station } : {}),
    photos: (place.photos || []).slice(0, 12).map((photo) => placePhotoUrl(photo.name, placeId)),
  };
}
