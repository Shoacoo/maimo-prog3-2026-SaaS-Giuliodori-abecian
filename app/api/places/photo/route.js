import { NextResponse } from "next/server";

// Imagen de reemplazo (PNG liso color arena) cuando Google no devuelve la foto (key rechazada,
// cuota agotada, referencia vencida). Responder siempre con una imagen no
// vacia evita que next/image falle con "internal image response is empty".
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAEUlEQVR4nGN4fu0QVsQwkBIAI4N30ekn4WwAAAAASUVORK5CYII=",
  "base64",
);

function placeholder() {
  return new NextResponse(PLACEHOLDER_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!ref || !apiKey) {
    return placeholder();
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("maxwidth", "800");
  url.searchParams.set("photo_reference", ref);
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url);
    const contentType = response.headers.get("Content-Type") || "";

    if (!response.ok || !contentType.startsWith("image/")) {
      return placeholder();
    }

    const body = await response.arrayBuffer();
    if (body.byteLength === 0) {
      return placeholder();
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return placeholder();
  }
}
