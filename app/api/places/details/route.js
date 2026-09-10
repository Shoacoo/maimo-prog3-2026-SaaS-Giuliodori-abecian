import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "Falta placeId." }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,geometry,address_component,photo");
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    return NextResponse.json({ error: data.error_message || data.status }, { status: 502 });
  }

  const result = data.result;
  const countryComponent = result.address_components?.find((component) => component.types.includes("country"));
  const country = countryComponent?.long_name || "";
  const countryCode = countryComponent?.short_name || "";
  const photoRef = result.photos?.[0]?.photo_reference || null;

  return NextResponse.json({
    placeId,
    name: result.name,
    country,
    countryCode,
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
    image: photoRef ? `/api/places/photo?ref=${encodeURIComponent(photoRef)}` : null,
  });
}
