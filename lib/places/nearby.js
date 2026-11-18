import { placePhotoUrl } from "@/lib/places/photoUrl";
import { circle, openNow, placesRequest, toLatLng } from "@/lib/places/google";
// Everything a tourist would typically want nearby - lodging, food and
// drink, shopping, and the major sightseeing categories. Each is its own
// Nearby Search request since the API only accepts one `type` per call.
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
// 50km is the actual maximum radius Google's Nearby Search API accepts - as
// close to "no limit" as the API allows.
const RADIUS_METERS = 50000;
// The map shows every place the API returns (up to 20 per category, sorted by
// popularity); "Lugares para visitar" opts into the curated path below
// (`{ limit: true }`): only well-rated places, capped per category.
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

  const promise = fetch(`${maskBaseUri}.svg`)
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

const NEARBY_FIELDS = [
  "places.id",
  "places.displayName",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours.openNow",
  "places.shortFormattedAddress",
  "places.location",
  "places.photos",
  "places.businessStatus",
  "places.iconMaskBaseUri",
  "places.iconBackgroundColor",
].join(",");

// Nearby Search (Places API New): hasta 20 lugares por categoria, ordenados por
// popularidad. La API nueva no pagina (la vieja daba hasta 60 con esperas de 2s
// entre paginas), asi que ahora carga mas rapido.
async function fetchNearby(lat, lng, type, apiKey) {
  try {
    const data = await placesRequest("places:searchNearby", {
      apiKey,
      fieldMask: NEARBY_FIELDS,
      body: {
        includedTypes: [type],
        maxResultCount: 20,
        rankPreference: "POPULARITY",
        locationRestriction: circle(lat, lng, RADIUS_METERS),
      },
    });
    return data.places || [];
  } catch {
    return [];
  }
}

async function fetchCategory(lat, lng, type, apiKey, limit) {
  const allResults = await fetchNearby(lat, lng, type, apiKey);

  let complete = allResults.filter(
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
  );

  if (limit) {
    complete = complete
      .filter((place) => place.rating >= MIN_RATING && (place.userRatingCount || 0) >= MIN_RATINGS_COUNT)
      // Best-reviewed first, so the cap below keeps the most relevant spots.
      .sort((a, b) => b.rating - a.rating || (b.userRatingCount || 0) - (a.userRatingCount || 0))
      .slice(0, MAX_PER_CATEGORY);
  }

  const highlight = HIGHLIGHT_CATEGORIES.has(type);

  return Promise.all(
    complete.map(async (place) => {
      const icon = await buildMarkerIcon(place.iconMaskBaseUri, place.iconBackgroundColor, highlight);
      const location = toLatLng(place.location);

      return {
        id: place.id,
        name: place.displayName?.text || "",
        type,
        category: CATEGORY_LABELS[type] || type,
        group: CATEGORY_GROUPS[type],
        highlight,
        rating: place.rating,
        ratingsCount: place.userRatingCount || 0,
        openNow: openNow(place),
        address: place.shortFormattedAddress,
        lat: location.lat,
        lng: location.lng,
        image: placePhotoUrl(place.photos[0].name, place.id),
        icon: icon.url,
        iconSize: icon.size,
      };
    }),
  );
}

export async function getNearbyPlaces(lat, lng, apiKey, { limit = false } = {}) {
  const results = await Promise.all(CATEGORIES.map((type) => fetchCategory(lat, lng, type, apiKey, limit)));

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
