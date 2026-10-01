import { NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/places/placeDetails";
import { getCurrentUser } from "@/lib/firebase/session";
import { logPlaceEvent } from "@/lib/analytics/placeEvents";

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

  // This endpoint is the real "a user looked this place up" chokepoint - map
  // POI clicks, resolving a search result to add to an itinerary, and "ver
  // mas" in Lugares para visitar all land here. The itinerario page's own
  // bulk refresh of already-saved items calls getPlaceDetails directly
  // (bypassing this route) specifically so that recurring status checks never
  // get counted as new searches.
  getCurrentUser().then((user) => {
    logPlaceEvent({
      type: "view",
      placeId,
      placeName: details.name,
      category: details.category,
      userId: user?.uid,
    });
  });

  return NextResponse.json(details);
}
