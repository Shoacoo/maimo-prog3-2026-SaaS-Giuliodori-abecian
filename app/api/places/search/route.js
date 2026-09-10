import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query);
  url.searchParams.set("types", "(cities)");
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
