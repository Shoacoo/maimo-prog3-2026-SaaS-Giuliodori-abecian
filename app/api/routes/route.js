import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/firebase/session";
import { computeDrivingRoute } from "@/lib/places/google";

// Ruta por carretera entre las paradas del viaje, para dibujarla en el mapa.
// Usa Routes API (reemplaza al DirectionsService legacy del navegador).
// Devuelve { path: [{lat, lng}] } o { path: null } si no hay camino por tierra
// (el mapa entonces dibuja una linea recta, como antes).
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const points = (Array.isArray(body.points) ? body.points : [])
    .map((point) => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .slice(0, 25); // Routes API acepta hasta 25 paradas intermedias

  if (points.length < 2) {
    return NextResponse.json({ path: null });
  }

  try {
    const path = await computeDrivingRoute(points, apiKey);
    return NextResponse.json({ path });
  } catch (err) {
    return NextResponse.json({ path: null, error: err.message });
  }
}
