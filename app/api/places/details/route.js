import { NextResponse } from "next/server";
import { placePhotoUrl } from "@/lib/places/photoUrl";
import { cached, DAY, getApiKey, placeDetailsRequest } from "@/lib/places/google";

// Datos de la ciudad elegida al crear un viaje (Place Details New, solo los
// campos que se guardan). Una ciudad no cambia: se cachea 30 dias.
async function cityDetails(placeId) {
  const result = await placeDetailsRequest(placeId, "displayName,location,addressComponents,photos");
  const countryComponent = result.addressComponents?.find((component) => component.types?.includes("country"));
  const photoName = result.photos?.[0]?.name || null;

  return {
    placeId,
    name: result.displayName?.text || "",
    country: countryComponent?.longText || "",
    countryCode: countryComponent?.shortText || "",
    lat: result.location?.latitude,
    lng: result.location?.longitude,
    image: photoName ? placePhotoUrl(photoName, placeId) : null,
  };
}

const cachedCityDetails = cached(cityDetails, "city-details", 30 * DAY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "Falta placeId." }, { status: 400 });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  try {
    return NextResponse.json(await cachedCityDetails(placeId));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
