import { NextResponse } from "next/server";
import { CATEGORY_LABELS } from "@/lib/places/nearby";
import { placePhotoUrl } from "@/lib/places/photoUrl";

function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Buscador del itinerario (diseño 05b): Text Search devuelve foto, rating,
// tipo y si esta abierto en una sola llamada, a diferencia del autocomplete.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  if (hasLocation) {
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "30000");
  }
  if (type) {
    url.searchParams.set("type", type);
  }
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  const data = await (await fetch(url)).json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ error: data.error_message || data.status }, { status: 502 });
  }

  const results = (data.results || []).slice(0, 6).map((place) => {
    const location = place.geometry?.location;
    const knownType = (place.types || []).find((item) => CATEGORY_LABELS[item]);
    return {
      placeId: place.place_id,
      name: place.name,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      category: knownType ? CATEGORY_LABELS[knownType] : null,
      rating: place.rating ?? null,
      openNow: typeof place.opening_hours?.open_now === "boolean" ? place.opening_hours.open_now : null,
      distanceKm: hasLocation && location ? Math.round(distanceKm({ lat, lng }, location) * 10) / 10 : null,
      image: place.photos?.[0]?.photo_reference
        ? placePhotoUrl(place.photos[0].photo_reference, place.place_id)
        : null,
    };
  });

  return NextResponse.json({ results });
}
