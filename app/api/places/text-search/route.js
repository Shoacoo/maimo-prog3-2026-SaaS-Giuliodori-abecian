import { NextResponse } from "next/server";
import { CATEGORY_LABELS } from "@/lib/places/nearby";
import { circle, distanceKm, firstPhotoUrl, openNow, placesRequest, readLatLng, toLatLng } from "@/lib/places/google";

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.rating",
  "places.currentOpeningHours.openNow",
  "places.photos",
].join(",");

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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    const data = await placesRequest("places:searchText", {
      apiKey,
      fieldMask: FIELDS,
      body: {
        textQuery: query,
        pageSize: 6,
        ...(hasLocation ? { locationBias: circle(lat, lng, 30000) } : {}),
        ...(type ? { includedType: type } : {}),
      },
    });

    const results = (data.places || []).slice(0, 6).map((place) => {
      const location = toLatLng(place.location);
      const knownType = (place.types || []).find((item) => CATEGORY_LABELS[item]);
      return {
        placeId: place.id,
        name: place.displayName?.text || "",
        lat: location.lat,
        lng: location.lng,
        category: knownType ? CATEGORY_LABELS[knownType] : null,
        rating: place.rating ?? null,
        openNow: openNow(place),
        distanceKm:
          hasLocation && location.lat !== null ? Math.round(distanceKm({ lat, lng }, location) * 10) / 10 : null,
        image: firstPhotoUrl(place),
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
