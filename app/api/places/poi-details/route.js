import { NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/places/placeDetails";

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

  const details = await getPlaceDetails(placeId, apiKey);
  if (details.error) {
    return NextResponse.json(details, { status: 502 });
  }

  return NextResponse.json(details);
}
