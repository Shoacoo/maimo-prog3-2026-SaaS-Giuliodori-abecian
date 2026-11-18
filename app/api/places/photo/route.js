import { NextResponse } from "next/server";
import { DAY, PHOTO_NAME_RE, PLACE_ID_RE, cached, getApiKey, getPhotoUri, photoUriUncached, placesRequest } from "@/lib/places/google";

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

const MAX_WIDTH = 800;

// Bajar la imagen desde el photoUri no se cobra (solo el pedido que da la
// URL), asi que la URL se guarda 1 dia (ver getPhotoUri).
async function download(photoUri) {
  const response = await fetch(photoUri, { cache: "no-store" });
  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok || !contentType.startsWith("image/")) {
    return null;
  }
  const body = await response.arrayBuffer();
  return body.byteLength > 0 ? { body, contentType } : null;
}

async function fetchPhoto(name) {
  if (!PHOTO_NAME_RE.test(name)) {
    return null;
  }
  const uri = await getPhotoUri(name, MAX_WIDTH).catch(() => null);
  if (!uri) return null;
  const photo = await download(uri).catch(() => null);
  if (photo) return photo;
  // La URL guardada pudo vencer: se pide una nueva una sola vez.
  const freshUri = await photoUriUncached(name, MAX_WIDTH).catch(() => null);
  return freshUri ? download(freshUri).catch(() => null) : null;
}

// placeId -> nombre de la primera foto vigente, 1 dia. Sirve para las fotos
// guardadas con referencias viejas (API legacy) o vencidas.
async function firstPhotoNameUncached(placeId) {
  const place = await placesRequest(`places/${placeId}`, { fieldMask: "photos" });
  const name = place.photos?.[0]?.name;
  if (!name) throw new Error("El lugar no tiene fotos.");
  return name;
}

const cachedFirstPhotoName = cached(firstPhotoNameUncached, "first-photo", DAY);

async function fetchFreshRef(placeId) {
  if (!PLACE_ID_RE.test(placeId)) {
    return null;
  }
  return cachedFirstPhotoName(placeId).catch(() => null);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const placeId = searchParams.get("placeId");
  if ((!ref && !placeId) || !getApiKey()) {
    return placeholder();
  }

  try {
    // 1) El nombre de foto guardado (formato nuevo "places/..."). Las
    //    referencias viejas (de la API legacy, guardadas en viajes anteriores)
    //    no sirven en la API nueva: se saltean.
    const firstRef = ref && ref.startsWith("places/") ? ref : null;
    let photo = firstRef ? await fetchPhoto(firstRef) : null;

    // 2) Si no hay o vencio, pedimos una foto vigente del lugar con su placeId.
    if (!photo && placeId) {
      const freshRef = await fetchFreshRef(placeId);
      if (freshRef && freshRef !== firstRef) {
        photo = await fetchPhoto(freshRef);
      }
    }

    if (!photo) {
      return placeholder();
    }

    return new NextResponse(photo.body, {
      headers: {
        "Content-Type": photo.contentType,
        // El navegador la guarda una semana: volver a una pantalla no pide
        // la foto de nuevo.
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return placeholder();
  }
}
