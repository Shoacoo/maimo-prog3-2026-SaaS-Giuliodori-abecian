import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { logPlaceEvent } from "@/lib/analytics/placeEvents";
import { withPlaceId } from "@/lib/places/photoUrl";
import { deleteTripPhotoFiles } from "@/lib/memories/photoStore";

const COLLECTION = "trips";

function withItineraryPhotos(itinerary) {
  return Object.fromEntries(
    Object.entries(itinerary).map(([date, items]) => [
      date,
      Array.isArray(items) ? items.map((item) => ({ ...item, image: withPlaceId(item.image, item.placeId) })) : items,
    ]),
  );
}

// Las fotos de Recuerdos se sirven por un route handler que valida el dueño
// (app/api/memories/photos/[photoId]); en el viaje solo se guardan sus datos.
export function withPhotoUrls(photo) {
  return {
    ...photo,
    url: `/api/memories/photos/${photo.id}`,
    thumbUrl: `/api/memories/photos/${photo.id}?size=thumb`,
  };
}

function serializeTrip(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name || "",
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    destinations: Array.isArray(data.destinations)
      ? data.destinations.map((destination) => ({
          ...destination,
          image: withPlaceId(destination.image, destination.id || destination.placeId),
        }))
      : [],
    itinerary: data.itinerary && typeof data.itinerary === "object" ? withItineraryPhotos(data.itinerary) : {},
    companions: Array.isArray(data.companions) ? data.companions : [],
    favorites: Array.isArray(data.favorites)
      ? data.favorites.map((place) => ({ ...place, image: withPlaceId(place.image, place.placeId) }))
      : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    noteFolders: Array.isArray(data.noteFolders) ? data.noteFolders : [],
    memoryPhotos: Array.isArray(data.memoryPhotos) ? data.memoryPhotos.map(withPhotoUrls) : [],
    memoryEntries: Array.isArray(data.memoryEntries) ? data.memoryEntries : [],
    budget: data.budget && typeof data.budget === "object" ? data.budget : null,
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    createdAt: data.createdAt?.toDate?.().toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
  };
}

// --- Viajes compartidos ---
// userId es el dueño. memberIds tiene al dueño y a los compañeros con cuenta:
// todos ellos ven y editan el viaje. Solo el dueño lo borra y suma compañeros.
// invitedEmails guarda los emails invitados que todavia no se registraron.
export function isTripMember(data, uid) {
  return Boolean(uid) && (data.userId === uid || (Array.isArray(data.memberIds) && data.memberIds.includes(uid)));
}

function withRole(trip, uid) {
  return { ...trip, role: trip.userId === uid ? "owner" : "editor" };
}

// Viajes propios + viajes donde es compañero. Se consultan los dos por separado
// porque los viajes viejos (anteriores a compartir) no tienen memberIds.
export async function listUserTrips(userId) {
  const collection = getDb().collection(COLLECTION);
  const [owned, shared] = await Promise.all([
    collection.where("userId", "==", userId).get(),
    collection.where("memberIds", "array-contains", userId).get(),
  ]);
  const byId = new Map([...owned.docs, ...shared.docs].map((doc) => [doc.id, doc]));
  return [...byId.values()]
    .map((doc) => withRole(serializeTrip(doc), userId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function getUserTrip(userId, tripId) {
  const doc = await getDb().collection(COLLECTION).doc(tripId).get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    return null;
  }

  return withRole(serializeTrip(doc), userId);
}

export async function createUserTrip(userId, data) {
  const now = FieldValue.serverTimestamp();
  const companions = data.companions || [];
  const docRef = await getDb()
    .collection(COLLECTION)
    .add({
      userId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      destinations: data.destinations,
      companions,
      memberIds: [...new Set([userId, ...companions.filter((item) => item.uid).map((item) => item.uid)])],
      invitedEmails: companions.filter((item) => !item.uid).map((item) => item.email),
      createdAt: now,
      updatedAt: now,
    });
  return docRef.id;
}

export async function updateTripDestinationsOrder(userId, tripId, destinations) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }

  await docRef.update({ destinations, updatedAt: FieldValue.serverTimestamp() });
}

export async function addItineraryItem(userId, tripId, date, item) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }

  const itinerary = { ...(doc.data().itinerary || {}) };
  const savedItem = { ...item, id: crypto.randomUUID() };
  itinerary[date] = [...(itinerary[date] || []), savedItem];

  await docRef.update({ itinerary, updatedAt: FieldValue.serverTimestamp() });

  logPlaceEvent({
    type: "itinerary_add",
    placeId: savedItem.placeId,
    placeName: savedItem.name,
    category: savedItem.category,
    userId,
    tripId,
  });

  return savedItem;
}

export async function removeItineraryItem(userId, tripId, date, itemId) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }

  const itinerary = { ...(doc.data().itinerary || {}) };
  itinerary[date] = (itinerary[date] || []).filter((entry) => entry.id !== itemId);

  await docRef.update({ itinerary, updatedAt: FieldValue.serverTimestamp() });
}

// Edits the user-owned fields of a single saved activity (the planned time
// and a free-form personal note) - never touches the place data itself
// (name/location/etc come from Google and are resolved again on re-render).
export async function updateItineraryItem(userId, tripId, date, itemId, updates) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }

  const itinerary = { ...(doc.data().itinerary || {}) };
  const items = itinerary[date] || [];
  itinerary[date] = items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));

  await docRef.update({ itinerary, updatedAt: FieldValue.serverTimestamp() });
}

// Reorders a single day's items to match `orderedIds` - only reorders, never
// trusts rich item data from the client. Any item the client didn't mention
// (shouldn't happen in practice) is kept, appended at the end, so a stale
// payload can never silently drop an activity.
export async function reorderItineraryItems(userId, tripId, date, orderedIds) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }

  const itinerary = { ...(doc.data().itinerary || {}) };
  const currentItems = itinerary[date] || [];
  const byId = new Map(currentItems.map((item) => [item.id, item]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
  const missing = currentItems.filter((item) => !orderedIds.includes(item.id));
  itinerary[date] = [...reordered, ...missing];

  await docRef.update({ itinerary, updatedAt: FieldValue.serverTimestamp() });
}

// Moves an item from one day to another, reordering both days' arrays in the
// same write. Like reorderItineraryItems, trusts only the id lists - both
// `fromOrderedIds` and `toOrderedIds` are reconstructed from the items
// already stored on the trip, never from client-sent item data.
export async function moveItineraryItem(userId, tripId, fromDate, toDate, fromOrderedIds, toOrderedIds) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }

  const itinerary = { ...(doc.data().itinerary || {}) };
  const byId = new Map(
    [...(itinerary[fromDate] || []), ...(itinerary[toDate] || [])].map((item) => [item.id, item]),
  );

  itinerary[fromDate] = fromOrderedIds.map((id) => byId.get(id)).filter(Boolean);
  itinerary[toDate] = toOrderedIds.map((id) => byId.get(id)).filter(Boolean);

  await docRef.update({ itinerary, updatedAt: FieldValue.serverTimestamp() });
}

async function getEditableTripDoc(userId, tripId) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }
  return docRef;
}

async function getEditableTripRef(userId, tripId) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || !isTripMember(doc.data(), userId)) {
    throw new Error("Trip not found.");
  }
  return { docRef, data: doc.data() };
}

// Favoritos del viaje (diseño 04 / ficha de lugar): alterna el lugar y
// devuelve si quedo guardado.
export async function toggleTripFavorite(userId, tripId, place) {
  const { docRef, data } = await getEditableTripRef(userId, tripId);
  const favorites = Array.isArray(data.favorites) ? data.favorites : [];
  const exists = favorites.some((item) => item.placeId === place.placeId);
  const next = exists
    ? favorites.filter((item) => item.placeId !== place.placeId)
    : [...favorites, { ...place, savedAt: new Date().toISOString() }];

  await docRef.update({ favorites: next, updatedAt: FieldValue.serverTimestamp() });
  return !exists;
}

// Sumar compañeros es solo del dueño. Si el compañero ya tiene cuenta entra
// directo a memberIds (ve y edita el viaje); si no, queda en invitedEmails
// hasta que se registre con ese email (linkPendingInvites).
export async function addTripCompanion(userId, tripId, companion) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().userId !== userId) {
    throw new Error("Solo el dueño puede sumar compañeros.");
  }
  const data = doc.data();
  const companions = Array.isArray(data.companions) ? data.companions : [];
  if (companions.some((item) => item.email === companion.email)) {
    return null;
  }
  await docRef.update({
    companions: [...companions, companion],
    ...(companion.uid
      ? { memberIds: FieldValue.arrayUnion(userId, companion.uid) }
      : { invitedEmails: FieldValue.arrayUnion(companion.email) }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Devuelve los datos del viaje para poder mandarle la invitacion al nuevo compañero.
  return { id: tripId, name: data.name, startDate: data.startDate, endDate: data.endDate, destinations: data.destinations || [] };
}

// Cuando alguien inicia sesion, los viajes a los que lo invitaron por email
// (antes de tener cuenta) pasan a ser suyos tambien: entra a memberIds y su
// invitacion pendiente pasa a "added".
export async function linkPendingInvites({ uid, email, name, photoURL }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!uid || !cleanEmail) return 0;
  const snapshot = await getDb().collection(COLLECTION).where("invitedEmails", "array-contains", cleanEmail).get();
  await Promise.all(
    snapshot.docs.map((doc) => {
      const companions = (doc.data().companions || []).map((item) =>
        item.email === cleanEmail && !item.uid
          ? { ...item, uid, name: item.name || name || "", photoURL: item.photoURL || photoURL || null, status: "added" }
          : item,
      );
      return doc.ref.update({
        companions,
        memberIds: FieldValue.arrayUnion(doc.data().userId, uid),
        invitedEmails: FieldValue.arrayRemove(cleanEmail),
      });
    }),
  );
  return snapshot.size;
}

// Para el visor de fotos de Recuerdos: ¿este usuario puede ver este viaje?
export async function userCanAccessTrip(userId, tripId) {
  if (!tripId) return false;
  const doc = await getDb().collection(COLLECTION).doc(tripId).get();
  return doc.exists && isTripMember(doc.data(), userId);
}

// Al borrar una cuenta: se borran sus viajes (y sus fotos) y se lo saca de
// los viajes compartidos donde era compañero.
export async function removeUserFromTrips(uid) {
  const db = getDb();
  const [owned, shared] = await Promise.all([
    db.collection(COLLECTION).where("userId", "==", uid).get(),
    db.collection(COLLECTION).where("memberIds", "array-contains", uid).get(),
  ]);
  for (const doc of owned.docs) {
    await doc.ref.delete();
    await deleteTripPhotoFiles(doc.id);
  }
  await Promise.all(
    shared.docs
      .filter((doc) => doc.data().userId !== uid)
      .map((doc) =>
        doc.ref.update({
          memberIds: FieldValue.arrayRemove(uid),
          companions: (doc.data().companions || []).filter((item) => item.uid !== uid),
        }),
      ),
  );
}

export async function addNoteFolder(userId, tripId, { name, color }) {
  const docRef = await getEditableTripDoc(userId, tripId);
  const doc = await docRef.get();

  const folder = { id: crypto.randomUUID(), name, color };
  const noteFolders = [...(doc.data().noteFolders || []), folder];

  await docRef.update({ noteFolders, updatedAt: FieldValue.serverTimestamp() });
  return folder;
}

export async function deleteNoteFolder(userId, tripId, folderId) {
  const docRef = await getEditableTripDoc(userId, tripId);
  const doc = await docRef.get();

  const noteFolders = (doc.data().noteFolders || []).filter((folder) => folder.id !== folderId);
  const notes = (doc.data().notes || []).map((note) => (note.folderId === folderId ? { ...note, folderId: null } : note));

  await docRef.update({ noteFolders, notes, updatedAt: FieldValue.serverTimestamp() });
}

export async function addNote(userId, tripId, { folderId, title, content, color }) {
  const docRef = await getEditableTripDoc(userId, tripId);
  const doc = await docRef.get();

  const now = new Date().toISOString();
  const note = { id: crypto.randomUUID(), folderId: folderId || null, title, content, color, createdAt: now, updatedAt: now };
  // Newest first, matching the optimistic update on the client - array order
  // is the source of truth for display order (drag-and-drop reorders it).
  const notes = [note, ...(doc.data().notes || [])];

  await docRef.update({ notes, updatedAt: FieldValue.serverTimestamp() });
  return note;
}

export async function updateNote(userId, tripId, noteId, { title, content, color, folderId }) {
  const docRef = await getEditableTripDoc(userId, tripId);
  const doc = await docRef.get();

  const notes = (doc.data().notes || []).map((note) =>
    note.id === noteId
      ? { ...note, title, content, color, folderId: folderId || null, updatedAt: new Date().toISOString() }
      : note,
  );

  await docRef.update({ notes, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteNote(userId, tripId, noteId) {
  const docRef = await getEditableTripDoc(userId, tripId);
  const doc = await docRef.get();

  const notes = (doc.data().notes || []).filter((note) => note.id !== noteId);

  await docRef.update({ notes, updatedAt: FieldValue.serverTimestamp() });
}

// Same "reorder by id, never trust rich client data" pattern as
// reorderItineraryItems.
export async function reorderNotes(userId, tripId, orderedIds) {
  const docRef = await getEditableTripDoc(userId, tripId);
  const doc = await docRef.get();

  const currentNotes = doc.data().notes || [];
  const byId = new Map(currentNotes.map((note) => [note.id, note]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
  const missing = currentNotes.filter((note) => !orderedIds.includes(note.id));

  await docRef.update({ notes: [...reordered, ...missing], updatedAt: FieldValue.serverTimestamp() });
}

// --- Presupuesto: cuanto piensan gastar (budget) y lo que van anotando
// (expenses). Lo pueden editar el dueño y los compañeros del viaje. ---

export async function setTripBudget(userId, tripId, budget) {
  const docRef = await getEditableTripDoc(userId, tripId);
  await docRef.update({ budget, updatedAt: FieldValue.serverTimestamp() });
}

// Crea el gasto (sin id) o lo reemplaza (con id existente).
export async function saveTripExpense(userId, tripId, expense) {
  const { docRef, data } = await getEditableTripRef(userId, tripId);
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const now = new Date().toISOString();
  const existing = expense.id ? expenses.find((item) => item.id === expense.id) : null;
  const saved = existing
    ? { ...existing, ...expense, id: existing.id, createdAt: existing.createdAt, createdBy: existing.createdBy, updatedAt: now }
    : { ...expense, id: crypto.randomUUID(), createdBy: userId, createdAt: now, updatedAt: now };
  const next = existing ? expenses.map((item) => (item.id === saved.id ? saved : item)) : [...expenses, saved];
  await docRef.update({ expenses: next, updatedAt: FieldValue.serverTimestamp() });
  return saved;
}

export async function deleteTripExpense(userId, tripId, expenseId) {
  const { docRef, data } = await getEditableTripRef(userId, tripId);
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  await docRef.update({
    expenses: expenses.filter((item) => item.id !== expenseId),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// --- Recuerdos: fotos (datos en el viaje, imagen en lib/memories/photoStore)
// y entradas de bitacora. ---

// arrayUnion es atomico: varias fotos subiendo a la vez no se pisan.
export async function addMemoryPhoto(userId, tripId, photo) {
  const docRef = await getEditableTripDoc(userId, tripId);
  await docRef.update({ memoryPhotos: FieldValue.arrayUnion(photo), updatedAt: FieldValue.serverTimestamp() });
}

export async function removeMemoryPhoto(userId, tripId, photoId) {
  const { docRef, data } = await getEditableTripRef(userId, tripId);
  const photos = Array.isArray(data.memoryPhotos) ? data.memoryPhotos : [];
  if (!photos.some((photo) => photo.id === photoId)) return false;
  await docRef.update({
    memoryPhotos: photos.filter((photo) => photo.id !== photoId),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

// Crea la entrada si no existe (id nuevo) o la reemplaza si ya existe.
export async function saveMemoryEntry(userId, tripId, entry) {
  const { docRef, data } = await getEditableTripRef(userId, tripId);
  const entries = Array.isArray(data.memoryEntries) ? data.memoryEntries : [];
  const now = new Date().toISOString();
  const existing = entry.id ? entries.find((item) => item.id === entry.id) : null;
  const saved = existing
    ? { ...existing, ...entry, id: existing.id, createdAt: existing.createdAt, updatedAt: now }
    : { ...entry, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  const next = existing ? entries.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...entries];
  await docRef.update({ memoryEntries: next, updatedAt: FieldValue.serverTimestamp() });
  return saved;
}

export async function deleteMemoryEntry(userId, tripId, entryId) {
  const { docRef, data } = await getEditableTripRef(userId, tripId);
  const entries = Array.isArray(data.memoryEntries) ? data.memoryEntries : [];
  await docRef.update({
    memoryEntries: entries.filter((item) => item.id !== entryId),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteUserTrip(userId, tripId) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  // Borrar el viaje es solo del dueño (los compañeros pueden editarlo, no borrarlo).
  if (!doc.exists || doc.data().userId !== userId) {
    throw new Error("Solo el dueño puede borrar el viaje.");
  }

  await docRef.delete();
  // Las fotos de Recuerdos viven en su propia coleccion: se borran con el viaje.
  await deleteTripPhotoFiles(tripId);
}

// --- Admin-only helpers (no ownership check - the caller must already have
// verified getCurrentAdminUser()). ---

export async function listAllTrips() {
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs
    .map(serializeTrip)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function countAllItineraryItems() {
  const trips = await listAllTrips();
  return trips.reduce((total, trip) => total + Object.values(trip.itinerary).flat().length, 0);
}

export async function getTripsCreatedPerWeek(weeks = 8) {
  const trips = await listAllTrips();
  const buckets = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    buckets.push({ weekStart, weekEnd, count: 0 });
  }

  for (const trip of trips) {
    if (!trip.createdAt) continue;
    const createdAt = new Date(trip.createdAt);
    const bucket = buckets.find((b) => createdAt >= b.weekStart && createdAt < b.weekEnd);
    if (bucket) bucket.count += 1;
  }

  return buckets.map((bucket) => ({
    week: bucket.weekStart.toISOString().slice(0, 10),
    count: bucket.count,
  }));
}

export async function deleteTripAsAdmin(tripId) {
  await getDb().collection(COLLECTION).doc(tripId).delete();
  await deleteTripPhotoFiles(tripId);
}
