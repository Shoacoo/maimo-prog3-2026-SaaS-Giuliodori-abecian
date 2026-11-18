import { NextResponse } from "next/server";
import { circle, placesRequest, readLatLng } from "@/lib/places/google";

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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    const data = await placesRequest("places:autocomplete", {
      apiKey,
      body: {
        input: query,
        ...(point ? { locationBias: circle(point.lat, point.lng, 50000) } : { includedPrimaryTypes: ["(cities)"] }),
      },
    });

    const predictions = (data.suggestions || [])
      .map((suggestion) => suggestion.placePrediction)
      .filter(Boolean)
      .map((prediction) => ({
        placeId: prediction.placeId,
        mainText: prediction.structuredFormat?.mainText?.text || prediction.text?.text || "",
        secondaryText: prediction.structuredFormat?.secondaryText?.text || "",
      }));

    return NextResponse.json({ predictions });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
