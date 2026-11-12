// Las photo_reference de Google vencen con el tiempo, asi que una URL de foto
// guardada en Firestore puede dejar de andar. Le agregamos el placeId para que
// /api/places/photo pueda pedir una referencia nueva si la guardada falla.
export function placePhotoUrl(ref, placeId) {
  const params = new URLSearchParams();
  if (ref) params.set("ref", ref);
  if (placeId) params.set("placeId", placeId);
  return `/api/places/photo?${params.toString()}`;
}

export function withPlaceId(image, placeId) {
  if (!placeId || typeof image !== "string" || !image.startsWith("/api/places/photo")) {
    return image;
  }
  const url = new URL(image, "http://local");
  if (url.searchParams.get("placeId")) return image;
  return placePhotoUrl(url.searchParams.get("ref"), placeId);
}
