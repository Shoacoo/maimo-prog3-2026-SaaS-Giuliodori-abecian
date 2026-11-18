import { NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/places/nearby";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Faltan coordenadas validas." }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const places = await getNearbyPlaces(lat, lng, apiKey);
  // Los datos ya vienen de la cache del servidor; esto evita repetir el pedido
  // al volver a abrir el mapa en la misma sesion.
  return NextResponse.json({ places }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
