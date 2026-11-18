import { NextResponse } from "next/server";
import { DAY, cached, circle, getApiKey, placesRequest, readLatLng, roundCoord } from "@/lib/places/google";

// Mismo texto (sin mayusculas ni espacios de mas) cerca del mismo punto: 1 dia.
async function autocompleteUncached(query, point) {
  const data = await placesRequest("places:autocomplete", {
    body: {
      input: query,
      ...(point ? { locationBias: circle(point.lat, point.lng, 50000) } : { includedPrimaryTypes: ["(cities)"] }),
    },
  });
  return (data.suggestions || [])
    .map((suggestion) => suggestion.placePrediction)
    .filter(Boolean)
    .map((prediction) => ({
      placeId: prediction.placeId,
      mainText: prediction.structuredFormat?.mainText?.text || prediction.text?.text || "",
      secondaryText: prediction.structuredFormat?.secondaryText?.text || "",
    }));
}

const cachedAutocomplete = cached(autocompleteUncached, "autocomplete", DAY);

// Autocompletado (Places API New). Sin coordenadas busca ciudades (crear
// viaje); con coordenadas busca cualquier lugar cerca de ese punto (agregar un
// lugar a un dia del itinerario). Devuelve el mismo formato que antes.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const point = readLatLng(searchParams);

  if (!query) {
    return NextResponse.json({ predictions: [] });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    const predictions = await cachedAutocomplete(
      query.toLowerCase().replace(/\s+/g, " "),
      point ? { lat: roundCoord(point.lat), lng: roundCoord(point.lng) } : null,
    );

    return NextResponse.json({ predictions }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
