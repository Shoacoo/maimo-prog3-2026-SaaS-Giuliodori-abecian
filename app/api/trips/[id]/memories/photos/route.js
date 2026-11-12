import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/firebase/session";
import { addMemoryPhoto, getUserTrip, withPhotoUrls } from "@/lib/trips/trips";
import { ALLOWED_TYPES, MAX_PHOTO_BYTES, MAX_THUMB_BYTES, savePhotoFile, deletePhotoFile } from "@/lib/memories/photoStore";
import { sanitizePhotoMeta } from "@/lib/memories/validation";

// Sube UNA foto de Recuerdos (el cliente las manda de a una para mostrar el
// progreso de cada archivo). Recibe la version grande y la miniatura ya
// comprimidas por el navegador, mas la ciudad, el dia y el lugar.
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  const { id: tripId } = await params;
  const trip = await getUserTrip(user.uid, tripId);
  if (!trip) {
    return NextResponse.json({ error: "Viaje no encontrado." }, { status: 404 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la foto." }, { status: 400 });
  }

  const full = form.get("full");
  const thumb = form.get("thumb");
  if (!(full instanceof Blob) || !(thumb instanceof Blob)) {
    return NextResponse.json({ error: "Falta la foto." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(full.type) || !ALLOWED_TYPES.has(thumb.type)) {
    return NextResponse.json({ error: "Formato no soportado. Usá JPG, PNG o WebP." }, { status: 415 });
  }
  if (full.size > MAX_PHOTO_BYTES || thumb.size > MAX_THUMB_BYTES) {
    return NextResponse.json({ error: "La foto es demasiado pesada." }, { status: 413 });
  }

  let meta;
  try {
    meta = sanitizePhotoMeta(trip, {
      cityId: form.get("cityId"),
      date: form.get("date"),
      placeName: form.get("placeName"),
      placeId: form.get("placeId"),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const photo = {
    id: crypto.randomUUID(),
    ...meta,
    width: Math.round(Number(form.get("width"))) || null,
    height: Math.round(Number(form.get("height"))) || null,
    createdAt: new Date().toISOString(),
  };

  await savePhotoFile({
    id: photo.id,
    userId: user.uid,
    tripId,
    contentType: full.type,
    full: Buffer.from(await full.arrayBuffer()),
    thumb: Buffer.from(await thumb.arrayBuffer()),
  });

  try {
    await addMemoryPhoto(user.uid, tripId, photo);
  } catch (err) {
    // Si no se pudo asociar al viaje, no dejamos la imagen huerfana.
    await deletePhotoFile(photo.id).catch(() => {});
    throw err;
  }

  revalidatePath(`/dashboard/trips/${tripId}/recuerdos`);
  return NextResponse.json({ photo: withPhotoUrls(photo) }, { status: 201 });
}
