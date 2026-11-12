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

// placeId -> photo_reference fresca, para no pedir Place Details en cada foto.
const freshRefs = new Map();

async function fetchPhoto(ref, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("maxwidth", "800");
  url.searchParams.set("photo_reference", ref);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok || !contentType.startsWith("image/")) {
    return null;
  }

  const body = await response.arrayBuffer();
  return body.byteLength > 0 ? { body, contentType } : null;
}

async function fetchFreshRef(placeId, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "photos");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = await response.json();
  return data.status === "OK" ? data.result?.photos?.[0]?.photo_reference || null : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const placeId = searchParams.get("placeId");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if ((!ref && !placeId) || !apiKey) {
    return placeholder();
  }

  try {
    // 1) La referencia guardada (o la fresca que ya conseguimos antes).
    const cachedRef = placeId ? freshRefs.get(placeId) : null;
    const firstRef = cachedRef || ref;
    let photo = firstRef ? await fetchPhoto(firstRef, apiKey).catch(() => null) : null;

    // 2) Si vencio, pedimos una referencia nueva con el placeId.
    if (!photo && placeId) {
      const freshRef = await fetchFreshRef(placeId, apiKey);
      if (freshRef) {
        freshRefs.set(placeId, freshRef);
        photo = await fetchPhoto(freshRef, apiKey);
      }
    }

    if (!photo) {
      return placeholder();
    }

    return new NextResponse(photo.body, {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return placeholder();
  }
}
