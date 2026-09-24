import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasLocationBias = Number.isFinite(lat) && Number.isFinite(lng);

  if (!query) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query);
  if (hasLocationBias) {
    // General place/business search (restaurants, museums, etc.), biased near
    // a given point - used when searching for a specific place to add to an
    // itinerary day, as opposed to the city search below.
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "50000");
  } else {
    url.searchParams.set("types", "(cities)");
  }
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ error: data.error_message || data.status }, { status: 502 });
  }

  const predictions = (data.predictions || []).map((prediction) => ({
    placeId: prediction.place_id,
    mainText: prediction.structured_formatting?.main_text || prediction.description,
    secondaryText: prediction.structured_formatting?.secondary_text || "",
  }));

  return NextResponse.json({ predictions });
}
