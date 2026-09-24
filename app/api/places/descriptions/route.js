import { NextResponse } from "next/server";
import { fetchEditorialSummary } from "@/lib/places/placeDetails";

// Lightweight, batched companion to /api/places/poi-details - fetches only the
// editorial summary (New Places API) for a batch of place ids, so listing
// pages like "Lugares para visitar" can show a real description on every
// visible card without paying for a full Legacy Place Details call per card.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placeIds = (searchParams.get("placeIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (placeIds.length === 0) {
    return NextResponse.json({ descriptions: {} });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const entries = await Promise.all(
    placeIds.map(async (placeId) => [placeId, await fetchEditorialSummary(placeId, apiKey)]),
  );

  return NextResponse.json({ descriptions: Object.fromEntries(entries) });
}
