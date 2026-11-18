import { NextResponse } from "next/server";
import { CATEGORY_LABELS } from "@/lib/places/nearby";
import { DAY, cached, circle, compactHours, distanceKm, firstPhotoUrl, getApiKey, openStatus, placesRequest, readLatLng, roundCoord, toLatLng } from "@/lib/places/google";

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.rating",
  "places.regularOpeningHours.periods",
  "places.utcOffsetMinutes",
  "places.photos",
].join(",");

// Resultados crudos 1 dia; "abierto ahora" y la distancia se calculan al leer.
async function textSearchUncached(query, point, type) {
  const data = await placesRequest("places:searchText", {
    fieldMask: FIELDS,
    body: {
      textQuery: query,
      pageSize: 6,
      ...(point ? { locationBias: circle(point.lat, point.lng, 30000) } : {}),
      ...(type ? { includedType: type } : {}),
    },
  });
  return (data.places || []).slice(0, 6).map((place) => ({
    id: place.id,
    displayName: place.displayName,
    location: place.location,
    types: place.types,
    rating: place.rating,
    periods: compactHours(place.regularOpeningHours),
    utcOffsetMinutes: place.utcOffsetMinutes,
    photos: place.photos?.[0] ? [{ name: place.photos[0].name }] : [],
  }));
}

const cachedTextSearch = cached(textSearchUncached, "text-search", DAY);

// Buscador del itinerario (diseño 05b): Text Search (Places API New) devuelve
// foto, rating, tipo y si esta abierto en una sola llamada.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "";
  const point = readLatLng(searchParams);
  const hasLocation = Boolean(point);
  const { lat, lng } = point || {};

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    const places = await cachedTextSearch(
      query.toLowerCase().replace(/\s+/g, " "),
      hasLocation ? { lat: roundCoord(lat), lng: roundCoord(lng) } : null,
      type,
    );

    const results = places.map((place) => {
      const location = toLatLng(place.location);
      const knownType = (place.types || []).find((item) => CATEGORY_LABELS[item]);
      return {
        placeId: place.id,
        name: place.displayName?.text || "",
        lat: location.lat,
        lng: location.lng,
        category: knownType ? CATEGORY_LABELS[knownType] : null,
        rating: place.rating ?? null,
        openNow: openStatus(place.periods, place.utcOffsetMinutes).openNow,
        distanceKm:
          hasLocation && location.lat !== null ? Math.round(distanceKm({ lat, lng }, location) * 10) / 10 : null,
        image: firstPhotoUrl(place),
      };
    });

    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
