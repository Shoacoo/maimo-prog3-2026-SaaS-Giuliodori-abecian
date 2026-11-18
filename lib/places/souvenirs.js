import { DAY, cached, circle, compactHours, distanceKm, firstPhotoUrl, openStatus, placesRequest, roundCoord, toLatLng } from "@/lib/places/google";

// Lugares para comprar souvenirs cerca de una ciudad del viaje (seccion
// Recuerdos > Souvenirs). Combina dos tipos de busqueda de Places API (New):
// - por tipo de lugar (tiendas de regalos, mercados, shoppings), y
// - por texto ("souvenir shop", "handicrafts"), que encuentra tiendas chicas.
// La busqueda por texto solo *prioriza* la zona (probado: "artesanias" cerca
// de Osaka devolvia mercados de Mexico), asi que se descarta lo que quede a
// mas de MAX_KM del centro de la ciudad.

const RADIUS_METERS = 15000;
const MAX_KM = 25;
const MAX_PER_GROUP = 8;
const MIN_RATING = 3.8;
const MIN_RATINGS = 5;

export const SOUVENIR_GROUPS = [
  { id: "souvenirs", label: "Tiendas de souvenirs", emoji: "🎁", text: "souvenir shop" },
  // "traditional crafts shop" fue la que mejor anduvo (probada en Osaka,
  // Buenos Aires y Paris); "handicrafts" traia casas de articulos de arte.
  { id: "artesanias", label: "Artesanías y productos típicos", emoji: "🎨", text: "traditional crafts shop" },
  { id: "mercados", label: "Mercados y ferias", emoji: "🧺", types: ["market"] },
  { id: "shoppings", label: "Shoppings y grandes tiendas", emoji: "🛍️", types: ["shopping_mall", "department_store"] },
];

const FIELDS = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "shortFormattedAddress",
  "location",
  "photos",
  "regularOpeningHours.periods",
  "utcOffsetMinutes",
  "businessStatus",
  "googleMapsUri",
];
const LIST_FIELDS = FIELDS.map((field) => `places.${field}`).join(",");

// Se guarda solo lo necesario (y una foto) para que la cache sea liviana.
function compact(place) {
  return {
    id: place.id,
    name: place.displayName?.text || "",
    typeLabel: place.primaryTypeDisplayName?.text || null,
    rating: place.rating ?? null,
    ratingsCount: place.userRatingCount || 0,
    address: place.shortFormattedAddress || null,
    location: place.location || null,
    photos: place.photos?.[0] ? [{ name: place.photos[0].name }] : [],
    periods: compactHours(place.regularOpeningHours),
    utcOffsetMinutes: place.utcOffsetMinutes,
    closed: place.businessStatus === "CLOSED_PERMANENTLY" || place.businessStatus === "CLOSED_TEMPORARILY",
    mapsUrl: place.googleMapsUri || null,
  };
}

async function searchGroup(group, lat, lng) {
  try {
    const data = group.text
      ? await placesRequest("places:searchText", {
          fieldMask: LIST_FIELDS,
          body: { textQuery: group.text, pageSize: 15, locationBias: circle(lat, lng, RADIUS_METERS) },
        })
      : await placesRequest("places:searchNearby", {
          fieldMask: LIST_FIELDS,
          body: {
            includedTypes: group.types,
            maxResultCount: 15,
            rankPreference: "POPULARITY",
            locationRestriction: circle(lat, lng, RADIUS_METERS),
          },
        });
    return (data.places || []).map(compact);
  } catch {
    return [];
  }
}

// Lo crudo de Google por ciudad, una semana en cache (los horarios se guardan
// y "abierto ahora" se calcula al leer).
async function souvenirsUncached(lat, lng) {
  const lists = await Promise.all(SOUVENIR_GROUPS.map((group) => searchGroup(group, lat, lng)));
  return SOUVENIR_GROUPS.map((group, index) => ({ id: group.id, places: lists[index] }));
}

const cachedSouvenirs = cached(souvenirsUncached, "souvenirs", 7 * DAY);

// Mejor puntuacion, ponderada por cuanta gente opino (un 5.0 con 2 reseñas no
// le gana a un 4.5 con 3.000).
function score(place) {
  return (place.rating || 0) * Math.log10((place.ratingsCount || 0) + 10);
}

export async function getSouvenirPlaces(lat, lng) {
  const raw = await cachedSouvenirs(roundCoord(lat), roundCoord(lng));
  const center = { lat, lng };
  const seen = new Set();

  return SOUVENIR_GROUPS.map((group) => {
    const places = (raw.find((item) => item.id === group.id)?.places || [])
      .map((place) => {
        const location = toLatLng(place.location);
        return { ...place, ...location, distanceKm: location.lat === null ? null : distanceKm(center, location) };
      })
      .filter(
        (place) =>
          !place.closed &&
          place.distanceKm !== null &&
          place.distanceKm <= MAX_KM &&
          (place.rating || 0) >= MIN_RATING &&
          place.ratingsCount >= MIN_RATINGS &&
          place.photos.length > 0,
      )
      .sort((a, b) => score(b) - score(a))
      // Un mismo lugar aparece una sola vez (en el primer grupo donde salga).
      .filter((place) => !seen.has(place.id) && seen.add(place.id))
      .slice(0, MAX_PER_GROUP)
      .map((place) => ({
        placeId: place.id,
        name: place.name,
        typeLabel: place.typeLabel,
        rating: place.rating,
        ratingsCount: place.ratingsCount,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        distanceKm: Math.round(place.distanceKm * 10) / 10,
        image: firstPhotoUrl(place),
        mapsUrl: place.mapsUrl,
        openNow: openStatus(place.periods, place.utcOffsetMinutes).openNow,
        category: "Tienda",
      }));
    return { id: group.id, label: group.label, emoji: group.emoji, places };
  });
}
