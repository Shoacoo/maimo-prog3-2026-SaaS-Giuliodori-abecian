import { NextResponse } from "next/server";
import { cached, circle, DAY, getApiKey, placesPost, roundCoord } from "@/lib/places/google";

// Autocomplete de Places API (New). Sin coordenadas busca ciudades (crear
// viaje); con coordenadas busca cualquier lugar cerca de ese punto (agregar
// al itinerario). Cacheado un dia por texto + zona.
async function autocomplete(query, lat, lng) {
  const body = { input: query, languageCode: "es" };
  if (lat !== null && lng !== null) {
    body.locationBias = circle(lat, lng, 50000);
  } else {
    body.includedPrimaryTypes = ["(cities)"];
  }

  const data = await placesPost(
    "autocomplete",
    body,
    "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
  );

  return (data.suggestions || [])
    .map((suggestion) => suggestion.placePrediction)
    .filter(Boolean)
    .map((prediction) => ({
      placeId: prediction.placeId,
      mainText: prediction.structuredFormat?.mainText?.text || prediction.text?.text || "",
      secondaryText: prediction.structuredFormat?.secondaryText?.text || "",
    }));
}

const cachedAutocomplete = cached(autocomplete, "autocomplete", DAY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasLocationBias = searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng);

  if (!query) {
    return NextResponse.json({ predictions: [] });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    const predictions = await cachedAutocomplete(
      query.toLowerCase(),
      hasLocationBias ? roundCoord(lat) : null,
      hasLocationBias ? roundCoord(lng) : null,
    );
    return NextResponse.json(
      { predictions },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
