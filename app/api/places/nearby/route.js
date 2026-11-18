import { getApiKey } from "@/lib/places/google";
import { NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/places/nearby";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Faltan coordenadas validas." }, { status: 400 });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const places = await getNearbyPlaces(lat, lng, apiKey);
  return NextResponse.json({ places });
}
