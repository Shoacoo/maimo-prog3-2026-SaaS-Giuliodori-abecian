import { NextResponse } from "next/server";
import { DAY, PLACE_ID_RE, cached, firstPhotoUrl, getApiKey, placesRequest, toLatLng } from "@/lib/places/google";

// Una ciudad no cambia de pais ni de coordenadas: 30 dias.
const cachedCity = cached(
  (placeId) => placesRequest(`places/${placeId}`, { fieldMask: "id,displayName,location,addressComponents,photos" }),
  "city",
  30 * DAY,
);

// Datos de una ciudad elegida en el buscador (crear viaje): nombre, pais,
// coordenadas y foto. Places API (New), mismo formato que antes.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId || !PLACE_ID_RE.test(placeId)) {
    return NextResponse.json({ error: "Falta placeId." }, { status: 400 });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    const place = await cachedCity(placeId);

    const countryComponent = (place.addressComponents || []).find((component) => component.types?.includes("country"));
    const location = toLatLng(place.location);

    return NextResponse.json({
      placeId,
      name: place.displayName?.text || "",
      country: countryComponent?.longText || "",
      countryCode: countryComponent?.shortText || "",
      lat: location.lat,
      lng: location.lng,
      image: firstPhotoUrl({ ...place, id: place.id || placeId }),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
