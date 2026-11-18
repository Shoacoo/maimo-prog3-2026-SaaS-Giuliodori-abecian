import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/firebase/session";
import { getApiKey, readLatLng } from "@/lib/places/google";
import { getSouvenirPlaces } from "@/lib/places/souvenirs";

// Lugares para comprar souvenirs cerca de una ciudad (?lat=&lng=), agrupados
// por tipo. Lo usa la pantalla Recuerdos > Souvenirs.
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const point = readLatLng(new URL(request.url).searchParams);
  if (!point) {
    return NextResponse.json({ error: "Faltan coordenadas válidas." }, { status: 400 });
  }
  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const groups = await getSouvenirPlaces(point.lat, point.lng);
  return NextResponse.json({ groups }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
