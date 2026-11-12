import { getDb } from "@/lib/firebase/firestore";

// Almacen de las fotos de Recuerdos.
//
// El proyecto Firebase no tiene Cloud Storage (en proyectos nuevos requiere
// el plan Blaze), asi que cada foto se guarda comprimida como bytes en un
// documento propio de Firestore: la version grande (<= 850 KB) y una
// miniatura (<= 120 KB), para no superar el limite de 1 MiB por documento.
// La compresion la hace el navegador antes de subir (lib/memories/compress.js).
//
// Todo el acceso a las imagenes pasa por este modulo: para migrar a Vercel
// Blob o Firebase Storage alcanza con reimplementar estas funciones.
const COLLECTION = "memoryPhotos";

export const MAX_PHOTO_BYTES = 850 * 1024;
export const MAX_THUMB_BYTES = 120 * 1024;
export const ALLOWED_TYPES = new Set(["image/jpeg", "image/webp", "image/png"]);

export async function savePhotoFile({ id, userId, tripId, contentType, full, thumb }) {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .set({ userId, tripId, contentType, full, thumb, createdAt: new Date().toISOString() });
}

export async function readPhotoFile(id, size = "full") {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    userId: data.userId,
    tripId: data.tripId,
    contentType: data.contentType || "image/jpeg",
    bytes: size === "thumb" && data.thumb ? data.thumb : data.full,
  };
}

export async function deletePhotoFile(id) {
  await getDb().collection(COLLECTION).doc(id).delete();
}

// Borra en lotes (Firestore permite hasta 500 operaciones por batch).
async function deleteWhere(field, value) {
  const db = getDb();
  for (;;) {
    const snapshot = await db.collection(COLLECTION).where(field, "==", value).select().limit(400).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export function deleteTripPhotoFiles(tripId) {
  return deleteWhere("tripId", tripId);
}

export function deleteUserPhotoFiles(userId) {
  return deleteWhere("userId", userId);
}
