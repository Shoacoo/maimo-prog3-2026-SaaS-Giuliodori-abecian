import { CATEGORY_LABELS } from "@/lib/places/nearby";

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

  return formatClock(todayPeriod.close.time);
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

// Datos extra de la ficha de lugar que solo existen en Places API (New):
// tipo legible ("Japanese sushi"), formas de pago, para llevar, reservas,
// accesibilidad y rango de precios. Best-effort: si falla, la ficha sigue.
async function fetchPlaceExtras(placeId, apiKey) {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=es`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "primaryTypeDisplayName,paymentOptions,takeout,delivery,dineIn,reservable,accessibilityOptions,priceRange",
      },
    });
    if (!response.ok) {
      return {};
    }
    return await response.json();
  } catch {
    return {};
  }
}

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
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("rankby", "distance");
    url.searchParams.set("type", "transit_station");
    url.searchParams.set("language", "es");
    url.searchParams.set("key", apiKey);
    const data = await (await fetch(url)).json();
    const station = data.results?.[0];
    if (!station?.geometry?.location) {
      return null;
    }
    const meters = distanceMeters({ lat, lng }, station.geometry.location);
    if (meters > 2000) {
      return null;
    }
    return { name: station.name, walkMinutes: Math.max(1, Math.round(meters / 80)) };
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

export async function getPlaceDetails(placeId, apiKey, { extras = false } = {}) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,geometry,types,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,current_opening_hours,reviews,photos,price_level",
  );
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  const [response, description] = await Promise.all([fetch(url), fetchEditorialSummary(placeId, apiKey)]);
  const data = await response.json();

  if (data.status !== "OK") {
    return { error: data.error_message || data.status };
  }

  const result = data.result;
  const openingHours = result.current_opening_hours || result.opening_hours;
  const location = result.geometry?.location || {};
  const [extraData, station] = extras
    ? await Promise.all([fetchPlaceExtras(placeId, apiKey), fetchNearestStation(location.lat, location.lng, apiKey)])
    : [null, null];

  return {
    placeId,
    name: result.name,
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
    category: guessCategory(result.types),
    description,
    rating: result.rating ?? null,
    ratingsCount: result.user_ratings_total || 0,
    address: result.formatted_address || null,
    phone: result.formatted_phone_number || null,
    website: result.website || null,
    priceLevel: typeof result.price_level === "number" ? result.price_level : null,
    openNow: typeof openingHours?.open_now === "boolean" ? openingHours.open_now : null,
    closesAt: openingHours?.open_now ? closingTimeToday(openingHours) : null,
    weekdayText: openingHours?.weekday_text || [],
    reviews: (result.reviews || []).map((review) => ({
      author: review.author_name,
      avatar: review.profile_photo_url || null,
      rating: review.rating,
      relativeTime: review.relative_time_description,
      text: review.text,
    })),
    ...(extras ? { ...buildExtras(extraData || {}), station } : {}),
    photos: (result.photos || [])
      .slice(0, 12)
      .map((photo) => `/api/places/photo?ref=${encodeURIComponent(photo.photo_reference)}`),
  };
}
