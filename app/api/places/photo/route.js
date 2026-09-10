import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!ref || !apiKey) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("maxwidth", "800");
  url.searchParams.set("photo_reference", ref);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);

  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: 502 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
