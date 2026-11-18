import { NextResponse } from "next/server";
import { PHOTO_NAME_RE, PLACE_ID_RE, placesRequest } from "@/lib/places/google";

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

// placeId -> nombre de foto vigente, para no pedir Place Details en cada foto.
const freshRefs = new Map();

// Places API (New): una foto se pide por su nombre ("places/ID/photos/REF");
// Google redirige a la imagen y fetch sigue la redireccion.
async function fetchPhoto(name, apiKey) {
  if (!PHOTO_NAME_RE.test(name)) {
    return null;
  }
  const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
  url.searchParams.set("maxWidthPx", "800");
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
  if (!PLACE_ID_RE.test(placeId)) {
    return null;
  }
  try {
    const place = await placesRequest(`places/${placeId}`, { apiKey, fieldMask: "photos" });
    return place.photos?.[0]?.name || null;
  } catch {
    return null;
  }
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
    // 1) El nombre de foto guardado (formato nuevo "places/...") o el vigente
    //    que ya conseguimos antes. Las referencias viejas (de la API legacy,
    //    guardadas en viajes anteriores) no sirven en la API nueva: se saltean.
    const cachedRef = placeId ? freshRefs.get(placeId) : null;
    const firstRef = cachedRef || (ref && ref.startsWith("places/") ? ref : null);
    let photo = firstRef ? await fetchPhoto(firstRef, apiKey).catch(() => null) : null;

    // 2) Si no hay o vencio, pedimos una foto vigente del lugar con su placeId.
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
