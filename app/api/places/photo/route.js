import { NextResponse } from "next/server";
import { cached, DAY, getApiKey, photoMediaRequest, placeDetailsRequest } from "@/lib/places/google";

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

// En Places API (New) una foto se identifica por su "name"
// (places/{placeId}/photos/{id}). Las fotos guardadas antes en Firestore
// tienen la photo_reference de la API vieja, que la nueva no entiende: para
// esas usamos el placeId y pedimos la primera foto actual del lugar.
function isNewPhotoName(ref) {
  return typeof ref === "string" && /^places\/[^/]+\/photos\/[^/]+$/.test(ref);
}

// photo name -> URL publica de la imagen (1 cobro de Place Photo por dia y foto).
async function resolvePhotoUri(photoName) {
  const data = await photoMediaRequest(photoName, 800);
  if (!data.photoUri) throw new Error("Sin photoUri");
  return data.photoUri;
}
const cachedPhotoUri = cached(resolvePhotoUri, "photo-uri", DAY);

// placeId -> name de su primera foto (field mask solo "photos").
async function resolveFirstPhotoName(placeId) {
  const data = await placeDetailsRequest(placeId, "photos");
  return data.photos?.[0]?.name || null;
}
const cachedFirstPhotoName = cached(resolveFirstPhotoName, "first-photo", DAY);

// Si una URL guardada en cache dejo de andar, la reemplazamos en memoria
// hasta que venza la entrada vieja.
const overrides = new Map();

async function downloadImage(uri) {
  const response = await fetch(uri, { cache: "no-store" });
  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok || !contentType.startsWith("image/")) {
    return null;
  }
  const body = await response.arrayBuffer();
  return body.byteLength > 0 ? { body, contentType } : null;
}

async function photoFromName(photoName) {
  const known = overrides.get(photoName);
  const uri = known || (await cachedPhotoUri(photoName).catch(() => null));
  let photo = uri ? await downloadImage(uri).catch(() => null) : null;

  if (!photo && !known) {
    // La URL en cache pudo vencer: pedimos una nueva sin cache.
    const freshUri = await resolvePhotoUri(photoName).catch(() => null);
    if (freshUri && freshUri !== uri) {
      overrides.set(photoName, freshUri);
      photo = await downloadImage(freshUri).catch(() => null);
    }
  }
  return photo;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const placeId = searchParams.get("placeId");

  if ((!ref && !placeId) || !getApiKey()) {
    return placeholder();
  }

  try {
    // 1) El name de foto de Places (New) que vino en la URL.
    let photo = isNewPhotoName(ref) ? await photoFromName(ref) : null;

    // 2) Referencia vieja o vencida: buscamos la foto actual por placeId.
    if (!photo && placeId) {
      const name = await cachedFirstPhotoName(placeId).catch(() => null);
      if (name && name !== ref) {
        photo = await photoFromName(name);
      }
      if (!photo) {
        const freshName = await resolveFirstPhotoName(placeId).catch(() => null);
        if (freshName && freshName !== name && freshName !== ref) {
          photo = await photoFromName(freshName);
        }
      }
    }

    if (!photo) {
      return placeholder();
    }

    return new NextResponse(photo.body, {
      headers: {
        "Content-Type": photo.contentType,
        // Una semana en el navegador, en la CDN de Vercel y en el optimizador
        // de next/image: la misma foto no vuelve a pasar por Google.
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return placeholder();
  }
}
