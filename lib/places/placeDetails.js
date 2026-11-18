import { CATEGORY_LABELS } from "@/lib/places/nearby";
import { placePhotoUrl } from "@/lib/places/photoUrl";
import { circle, openNow, placesRequest, priceLevelNumber, toLatLng } from "@/lib/places/google";

function formatClock(hhmm) {
  if (!hhmm || hhmm.length !== 4) {
    return hhmm;
  }

  const hour24 = Number(hhmm.slice(0, 2));
  const minutes = hhmm.slice(2);
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 || 12;

  return minutes === "00" ? `${hour12}${suffix}` : `${hour12}:${minutes}${suffix}`;
}

function closingTimeToday(openingHours) {
  const periods = openingHours?.periods;
  if (!periods) {
    return null;
  }

  const now = new Date();
  const todayIndex = now.getDay();

  // An open period can close after midnight (close.day is the next day) - match
  // on the open side's day, which is what "today's hours" means to a visitor.
  const todayPeriod = periods.find((period) => period.open?.day === todayIndex);
  if (!todayPeriod?.close) {
    return null;
  }

  // Places API (New) da hora y minuto por separado: se arma "HHMM".
  const { hour = 0, minute = 0 } = todayPeriod.close;
  return formatClock(`${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`);
}

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
export async function fetchEditorialSummary(placeId, apiKey) {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=es`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "editorialSummary,primaryTypeDisplayName,addressComponents,rating,userRatingCount",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.editorialSummary?.text || composeDescription(data);
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
async function fetchNearestStation(lat, lng, apiKey) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  try {
    // Nearby Search (Places API New): la estacion mas cercana en 2 km.
    const data = await placesRequest("places:searchNearby", {
      apiKey,
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
  "currentOpeningHours",
  "regularOpeningHours",
  "reviews",
  "photos",
  "priceLevel",
  "editorialSummary",
  "primaryTypeDisplayName",
  "addressComponents",
].join(",");

export async function getPlaceDetails(placeId, apiKey, { extras = false } = {}) {
  let place;
  try {
    place = await placesRequest(`places/${placeId}`, {
      apiKey,
      fieldMask: extras ? `${DETAIL_FIELDS},${EXTRA_FIELDS}` : DETAIL_FIELDS,
    });
  } catch (err) {
    return { error: err.message };
  }

  const location = toLatLng(place.location);
  const openingHours = place.currentOpeningHours || place.regularOpeningHours;
  const isOpen = openNow(place);
  const station = extras ? await fetchNearestStation(location.lat, location.lng, apiKey) : null;

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
    closesAt: isOpen ? closingTimeToday(openingHours) : null,
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
