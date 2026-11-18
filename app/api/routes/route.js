import { NextResponse } from "next/server";
import { cached, computeRoutesRequest, DAY, getApiKey, roundCoord } from "@/lib/places/google";

// Ruta por carretera entre las paradas del viaje (Routes API, reemplaza a la
// Directions API vieja). Se pide solo la polilinea ("routes.polyline"), sin
// trafico, y como mucho 10 paradas intermedias por llamada: asi cada llamada
// queda en el SKU mas barato (Compute Routes Essentials). Viajes con mas
// paradas se parten en tramos.
const MAX_STOPS_PER_REQUEST = 12; // origen + 10 intermedias + destino

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    for (const axis of ["lat", "lng"]) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === "lat") lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

const waypoint = ([lat, lng]) => ({ location: { latLng: { latitude: lat, longitude: lng } } });

async function computeLeg(stops) {
  const data = await computeRoutesRequest(
    {
      origin: waypoint(stops[0]),
      destination: waypoint(stops[stops.length - 1]),
      intermediates: stops.slice(1, -1).map(waypoint),
      travelMode: "DRIVE",
      polylineQuality: "OVERVIEW",
      languageCode: "es",
    },
    "routes.polyline.encodedPolyline",
  );

  const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
  // Sin ruta por carretera (ej. cruza un oceano): null, y el mapa dibuja la
  // linea recta. Se guarda igual en cache para no volver a preguntar.
  return encoded ? decodePolyline(encoded) : null;
}

// Una ruta entre las mismas paradas no cambia: 30 dias de cache.
const cachedLeg = cached(computeLeg, "route-leg", 30 * DAY);

function parseStops(raw) {
  return (raw || "")
    .split("|")
    .map((pair) => pair.split(",").map(Number))
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
    .map(([lat, lng]) => [roundCoord(lat), roundCoord(lng)]);
}

// GET /api/routes?stops=lat,lng|lat,lng|...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const stops = parseStops(searchParams.get("stops"));

  if (stops.length < 2 || stops.length > 50) {
    return NextResponse.json({ path: null });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const chunks = [];
  for (let start = 0; start < stops.length - 1; start += MAX_STOPS_PER_REQUEST - 1) {
    chunks.push(stops.slice(start, start + MAX_STOPS_PER_REQUEST));
  }

  try {
    const legs = await Promise.all(chunks.map((chunk) => cachedLeg(chunk)));
    if (legs.some((leg) => !leg)) {
      return NextResponse.json({ path: null }, { headers: { "Cache-Control": "private, max-age=86400" } });
    }

    const path = legs.flatMap((leg, index) => (index === 0 ? leg : leg.slice(1))).map(([lat, lng]) => ({ lat, lng }));
    return NextResponse.json({ path }, { headers: { "Cache-Control": "private, max-age=86400" } });
  } catch (error) {
    return NextResponse.json({ path: null, error: error.message }, { status: 502 });
  }
}
