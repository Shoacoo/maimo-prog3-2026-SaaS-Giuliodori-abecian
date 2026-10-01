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
// Nearby Search can return up to 3 pages (60 results) per category, but each
// extra page costs a mandatory 2s wait (Google's pagetoken activation delay).
// The map wants every place it can get (full coverage for markers/filters),
// so it uses the full 3 pages; "Lugares para visitar" opts into the faster,
// curated path below (`{ limit: true }`) since showing hundreds of mediocre
// results there was both slow and not actually useful to a traveler. Google
// already returns page 1 sorted by prominence/relevance, so a single page
// plus the quality filter still gives the most relevant places first.
const MAX_PAGES_FULL = 3;
const MAX_PAGES_LIMITED = 1;
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

async function fetchNearbySearchPage(lat, lng, type, apiKey, pageToken) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  if (pageToken) {
    // Per Google's docs, a follow-up page request only takes the token itself.
    url.searchParams.set("pagetoken", pageToken);
  } else {
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(RADIUS_METERS));
    url.searchParams.set("type", type);
  }
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  return response.json();
}

async function fetchCategory(lat, lng, type, apiKey, limit) {
  let allResults = [];
  let pageToken;
  const maxPages = limit ? MAX_PAGES_LIMITED : MAX_PAGES_FULL;

  for (let page = 0; page < maxPages; page += 1) {
    if (page > 0) {
      if (!pageToken) {
        break;
      }
      // A fresh next_page_token isn't valid immediately - Google requires a
      // short delay before it can be used.
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const data = await fetchNearbySearchPage(lat, lng, type, apiKey, pageToken);
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      break;
    }

    allResults = allResults.concat(data.results || []);
    pageToken = data.next_page_token;
    if (!pageToken) {
      break;
    }
  }

  let complete = allResults.filter(
    (place) =>
      Boolean(place.rating) &&
      Boolean(place.photos?.[0]?.photo_reference) &&
      Boolean(place.vicinity) &&
      place.business_status !== "CLOSED_PERMANENTLY" &&
      place.business_status !== "CLOSED_TEMPORARILY" &&
      // Hotels get tagged as "restaurant"/"bar" too when they have one in-house -
      // skip that leakage into the other categories, but let it through when
      // we're actually searching for lodging.
      (type === "lodging" || !place.types?.includes("lodging")),
  );

  if (limit) {
    complete = complete
      .filter((place) => place.rating >= MIN_RATING && (place.user_ratings_total || 0) >= MIN_RATINGS_COUNT)
      // Best-reviewed first, so the cap below keeps the most relevant spots.
      .sort((a, b) => b.rating - a.rating || b.user_ratings_total - a.user_ratings_total)
      .slice(0, MAX_PER_CATEGORY);
  }

  const highlight = HIGHLIGHT_CATEGORIES.has(type);

  return Promise.all(
    complete.map(async (place) => {
      const icon = await buildMarkerIcon(place.icon_mask_base_uri, place.icon_background_color, highlight);

      return {
        id: place.place_id,
        name: place.name,
        type,
        category: CATEGORY_LABELS[type] || type,
        group: CATEGORY_GROUPS[type],
        highlight,
        rating: place.rating,
        ratingsCount: place.user_ratings_total || 0,
        openNow: typeof place.opening_hours?.open_now === "boolean" ? place.opening_hours.open_now : null,
        address: place.vicinity,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        image: `/api/places/photo?ref=${encodeURIComponent(place.photos[0].photo_reference)}`,
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
