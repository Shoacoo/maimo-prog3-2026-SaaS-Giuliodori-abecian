import { placePhotoUrl } from "@/lib/places/photoUrl";
import { cached, circle, compactHours, DAY, openStatus, placesPost, roundCoord } from "@/lib/places/google";
// Everything a tourist would typically want nearby - lodging, food and
// drink, shopping, and the major sightseeing categories. Each is its own
// Nearby Search request so every category gets its own top 20.
export const CATEGORIES = [
  "lodging",
  "restaurant",
  "bar",
  "cafe",
  "tourist_attraction",
  "museum",
  "shopping_mall",
  "park",
  "zoo",
  "aquarium",
  "amusement_park",
  "art_gallery",
];
// 50km is the maximum radius Nearby Search accepts.
const RADIUS_METERS = 50000;
// Nearby Search (New) returns at most 20 places per request, already sorted
// by popularity. The map shows all of them; "Lugares para visitar" uses the
// curated path below (`{ limit: true }`).
const MAX_RESULTS = 20;
// Below this, a place reads as "a random hit" rather than an actual
// recommendation - only applied in limited mode.
const MIN_RATING = 4.0;
const MIN_RATINGS_COUNT = 15;
// Hard cap per category in limited mode, so a single destination can't flood
// the results with dozens of near-identical hotels/restaurants - the best
// ones (by rating, then by how many people rated them) go first.
const MAX_PER_CATEGORY = 15;

export const CATEGORY_LABELS = {
  lodging: "Hotel",
  restaurant: "Restaurante",
  bar: "Bar",
  cafe: "Cafe",
  tourist_attraction: "Atraccion turistica",
  museum: "Museo",
  shopping_mall: "Tienda",
  park: "Parque",
  zoo: "Zoologico",
  aquarium: "Acuario",
  amusement_park: "Parque de diversiones",
  art_gallery: "Galeria de arte",
};

// The "come see this" sightseeing categories - these get a bigger, more
// prominent marker than day-to-day places like restaurants or hotels, so
// they're what catches the eye first while exploring the map.
export const HIGHLIGHT_CATEGORIES = new Set(["tourist_attraction", "museum", "zoo", "aquarium", "amusement_park", "art_gallery"]);

// Collapses the 12 Places types into the 5 filter groups shown as toggle
// icons on the map - one request-per-type is too granular for that filter UI
// (the broader "Lugares para visitar" page filters by the raw `type` instead).
export const CATEGORY_GROUPS = {
  lodging: "hoteles",
  restaurant: "comida",
  bar: "comida",
  cafe: "comida",
  tourist_attraction: "atracciones",
  museum: "atracciones",
  zoo: "atracciones",
  aquarium: "atracciones",
  amusement_park: "atracciones",
  art_gallery: "atracciones",
  shopping_mall: "tiendas",
  park: "parques",
};

const pinletCache = new Map();

async function getGlyphSvg(maskBaseUri) {
  if (!maskBaseUri) {
    return null;
  }

  if (pinletCache.has(maskBaseUri)) {
    return pinletCache.get(maskBaseUri);
  }

  // Places (New) a veces ya trae la extension en la URL.
  const svgUrl = /\.(svg|png)$/.test(maskBaseUri) ? maskBaseUri.replace(/\.png$/, ".svg") : `${maskBaseUri}.svg`;
  const promise = fetch(svgUrl)
    .then((response) => (response.ok ? response.text() : null))
    .catch(() => null);

  pinletCache.set(maskBaseUri, promise);
  return promise;
}

async function buildMarkerIcon(maskBaseUri, backgroundColor, highlight) {
  const glyphSvg = await getGlyphSvg(maskBaseUri);

  let viewBox = "0 0 8 11";
  let inner = "";
  if (glyphSvg) {
    const viewBoxMatch = glyphSvg.match(/viewBox="([^"]+)"/);
    if (viewBoxMatch) {
      viewBox = viewBoxMatch[1];
    }

    const innerMatch = glyphSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    if (innerMatch) {
      inner = innerMatch[1].replace(/fill="#000000"/g, 'fill="#ffffff"');
    }
  }

  // Google's Places pinlet assets are just a colorless glyph mask - we
  // recreate the same look the Google Maps UI itself uses by default: a
  // category-colored circle with the white glyph centered on top. Sightseeing
  // spots (highlight = true) get a bigger circle, a thicker halo and a soft
  // drop shadow so they read as "the main attractions" against everyday
  // places like restaurants or hotels.
  const size = highlight ? 42 : 30;
  const radius = highlight ? 18 : 13;
  const center = size / 2;
  const strokeWidth = highlight ? 3 : 2;
  const glyphBox = highlight ? { x: 12, y: 9.5, w: 18, h: 23 } : { x: 9, y: 7, w: 12, h: 16 };
  const shadow = highlight
    ? `<circle cx="${center}" cy="${center + 1}" r="${radius + 1}" fill="#000000" opacity="0.18"/>`
    : "";

  const composite = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${shadow}
<circle cx="${center}" cy="${center}" r="${radius}" fill="${backgroundColor || "#7B9EB0"}" stroke="#ffffff" stroke-width="${strokeWidth}"/>
<svg x="${glyphBox.x}" y="${glyphBox.y}" width="${glyphBox.w}" height="${glyphBox.h}" viewBox="${viewBox}">${inner}</svg>
</svg>`;

  return {
    url: `data:image/svg+xml;base64,${Buffer.from(composite, "utf-8").toString("base64")}`,
    size,
  };
}

const NEARBY_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
  "places.utcOffsetMinutes",
  "places.shortFormattedAddress",
  "places.location",
  "places.photos",
  "places.businessStatus",
  "places.iconMaskBaseUri",
  "places.iconBackgroundColor",
].join(",");

// Una Nearby Search (New) por categoria: hasta 20 lugares, ordenados por
// popularidad. La API nueva no tiene paginas (la vieja traia hasta 60 con 2s
// de espera entre paginas y 3 cobros por categoria). Se guarda en cache una
// semana por punto + categoria, asi abrir el mapa o "Lugares para visitar"
// no vuelve a llamar a Google en cada carga.
async function fetchCategoryRaw(lat, lng, type) {
  const data = await placesPost(
    "searchNearby",
    {
      includedTypes: [type],
      maxResultCount: MAX_RESULTS,
      rankPreference: "POPULARITY",
      languageCode: "es",
      locationRestriction: circle(lat, lng, RADIUS_METERS),
    },
    NEARBY_FIELD_MASK,
  );

  return (data.places || [])
    .filter(
      (place) =>
        Boolean(place.rating) &&
        Boolean(place.photos?.[0]?.name) &&
        Boolean(place.shortFormattedAddress) &&
        place.businessStatus !== "CLOSED_PERMANENTLY" &&
        place.businessStatus !== "CLOSED_TEMPORARILY" &&
        // Hotels get tagged as "restaurant"/"bar" too when they have one in-house -
        // skip that leakage into the other categories, but let it through when
        // we're actually searching for lodging.
        (type === "lodging" || !place.types?.includes("lodging")),
    )
    .map((place) => ({
      id: place.id,
      name: place.displayName?.text || "",
      rating: place.rating,
      ratingsCount: place.userRatingCount || 0,
      periods: compactHours(place.regularOpeningHours),
      utcOffsetMinutes: place.utcOffsetMinutes ?? null,
      address: place.shortFormattedAddress,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      photo: place.photos[0].name,
      iconMaskBaseUri: place.iconMaskBaseUri || null,
      iconBackgroundColor: place.iconBackgroundColor || null,
    }));
}

const cachedCategory = cached(fetchCategoryRaw, "nearby-category", 7 * DAY);

async function fetchCategory(lat, lng, type, limit) {
  let complete = await cachedCategory(roundCoord(lat), roundCoord(lng), type).catch(() => []);

  if (limit) {
    complete = complete
      .filter((place) => place.rating >= MIN_RATING && place.ratingsCount >= MIN_RATINGS_COUNT)
      // Best-reviewed first, so the cap below keeps the most relevant spots.
      .sort((a, b) => b.rating - a.rating || b.ratingsCount - a.ratingsCount)
      .slice(0, MAX_PER_CATEGORY);
  }

  const highlight = HIGHLIGHT_CATEGORIES.has(type);

  return Promise.all(
    complete.map(async (place) => {
      const icon = await buildMarkerIcon(place.iconMaskBaseUri, place.iconBackgroundColor, highlight);

      return {
        id: place.id,
        name: place.name,
        type,
        category: CATEGORY_LABELS[type] || type,
        group: CATEGORY_GROUPS[type],
        highlight,
        rating: place.rating,
        ratingsCount: place.ratingsCount,
        openNow: openStatus(place.periods, place.utcOffsetMinutes).openNow,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        image: placePhotoUrl(place.photo, place.id),
        icon: icon.url,
        iconSize: icon.size,
      };
    }),
  );
}

// `apiKey` se mantiene por compatibilidad: la key se lee del entorno.
export async function getNearbyPlaces(lat, lng, apiKey, { limit = false } = {}) {
  const results = await Promise.all(CATEGORIES.map((type) => fetchCategory(lat, lng, type, limit)));

  const seen = new Set();
  const places = [];
  for (const list of results) {
    for (const place of list) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        places.push(place);
      }
    }
  }

  return places;
}
