import { NextResponse } from "next/server";
import { CATEGORY_LABELS } from "@/lib/places/nearby";
import { placePhotoUrl } from "@/lib/places/photoUrl";
import {
  cached,
  circle,
  compactHours,
  DAY,
  distanceMeters,
  getApiKey,
  openStatus,
  placesPost,
  roundCoord,
} from "@/lib/places/google";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.rating",
  "places.regularOpeningHours",
  "places.utcOffsetMinutes",
  "places.photos",
].join(",");

// Text Search (New): foto, rating, tipo y horarios en una sola llamada.
// Se cachea un dia por texto + tipo + zona; el "abierto ahora" se calcula
// al responder, asi no queda viejo.
async function textSearch(query, type, lat, lng) {
  const body = { textQuery: query, languageCode: "es", pageSize: 6 };
  if (lat !== null && lng !== null) {
    body.locationBias = circle(lat, lng, 30000);
  }
  if (type) {
    body.includedType = type;
  }

  const data = await placesPost("searchText", body, FIELD_MASK);
  return (data.places || []).slice(0, 6).map((place) => {
    const knownType = (place.types || []).find((item) => CATEGORY_LABELS[item]);
    return {
      placeId: place.id,
      name: place.displayName?.text || "",
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      category: knownType ? CATEGORY_LABELS[knownType] : null,
      rating: place.rating ?? null,
      periods: compactHours(place.regularOpeningHours),
      utcOffsetMinutes: place.utcOffsetMinutes ?? null,
      image: place.photos?.[0]?.name ? placePhotoUrl(place.photos[0].name, place.id) : null,
    };
  });
}

const cachedTextSearch = cached(textSearch, "text-search", DAY);

// Buscador del itinerario (diseño 05b).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasLocation = searchParams.has("lat") && searchParams.has("lng") && Number.isFinite(lat) && Number.isFinite(lng);

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    const places = await cachedTextSearch(
      query.toLowerCase(),
      type,
      hasLocation ? roundCoord(lat) : null,
      hasLocation ? roundCoord(lng) : null,
    );

    const results = places.map(({ periods, utcOffsetMinutes, ...place }) => ({
      ...place,
      openNow: openStatus(periods, utcOffsetMinutes).openNow,
      distanceKm:
        hasLocation && place.lat !== null && place.lng !== null
          ? Math.round(distanceMeters({ lat, lng }, place) / 100) / 10
          : null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
