import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { logPlaceEvent } from "@/lib/analytics/placeEvents";

const COLLECTION = "trips";

function serializeTrip(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name || "",
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    destinations: Array.isArray(data.destinations) ? data.destinations : [],
    itinerary: data.itinerary && typeof data.itinerary === "object" ? data.itinerary : {},
    notes: Array.isArray(data.notes) ? data.notes : [],
    noteFolders: Array.isArray(data.noteFolders) ? data.noteFolders : [],
    createdAt: data.createdAt?.toDate?.().toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
  };
}

export async function listUserTrips(userId) {
  const snapshot = await getDb().collection(COLLECTION).where("userId", "==", userId).get();
  return snapshot.docs
    .map(serializeTrip)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function getUserTrip(userId, tripId) {
  const doc = await getDb().collection(COLLECTION).doc(tripId).get();
  if (!doc.exists) {
    return null;
  }

  const trip = serializeTrip(doc);
  if (trip.userId !== userId) {
    return null;
  }

  return trip;
}

export async function createUserTrip(userId, data) {
  const now = FieldValue.serverTimestamp();
  await getDb()
    .collection(COLLECTION)
    .add({
      userId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      destinations: data.destinations,
      createdAt: now,
      updatedAt: now,
    });
}

export async function updateTripDestinationsOrder(userId, tripId, destinations) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().userId !== userId) {
    throw new Error("Trip not found.");
  }

  await docRef.update({ destinations, updatedAt: FieldValue.serverTimestamp() });
}

export async function addItineraryItem(userId, tripId, date, item) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().userId !== userId) {
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
  if (!doc.exists || doc.data().userId !== userId) {
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
  if (!doc.exists || doc.data().userId !== userId) {
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
  if (!doc.exists || doc.data().userId !== userId) {
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
  if (!doc.exists || doc.data().userId !== userId) {
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

async function getOwnedTripDoc(userId, tripId) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().userId !== userId) {
    throw new Error("Trip not found.");
  }
  return docRef;
}

export async function addNoteFolder(userId, tripId, { name, color }) {
  const docRef = await getOwnedTripDoc(userId, tripId);
  const doc = await docRef.get();

  const folder = { id: crypto.randomUUID(), name, color };
  const noteFolders = [...(doc.data().noteFolders || []), folder];

  await docRef.update({ noteFolders, updatedAt: FieldValue.serverTimestamp() });
  return folder;
}

export async function deleteNoteFolder(userId, tripId, folderId) {
  const docRef = await getOwnedTripDoc(userId, tripId);
  const doc = await docRef.get();

  const noteFolders = (doc.data().noteFolders || []).filter((folder) => folder.id !== folderId);
  const notes = (doc.data().notes || []).map((note) => (note.folderId === folderId ? { ...note, folderId: null } : note));

  await docRef.update({ noteFolders, notes, updatedAt: FieldValue.serverTimestamp() });
}

export async function addNote(userId, tripId, { folderId, title, content, color }) {
  const docRef = await getOwnedTripDoc(userId, tripId);
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
  const docRef = await getOwnedTripDoc(userId, tripId);
  const doc = await docRef.get();

  const notes = (doc.data().notes || []).map((note) =>
    note.id === noteId
      ? { ...note, title, content, color, folderId: folderId || null, updatedAt: new Date().toISOString() }
      : note,
  );

  await docRef.update({ notes, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteNote(userId, tripId, noteId) {
  const docRef = await getOwnedTripDoc(userId, tripId);
  const doc = await docRef.get();

  const notes = (doc.data().notes || []).filter((note) => note.id !== noteId);

  await docRef.update({ notes, updatedAt: FieldValue.serverTimestamp() });
}

// Same "reorder by id, never trust rich client data" pattern as
// reorderItineraryItems.
export async function reorderNotes(userId, tripId, orderedIds) {
  const docRef = await getOwnedTripDoc(userId, tripId);
  const doc = await docRef.get();

  const currentNotes = doc.data().notes || [];
  const byId = new Map(currentNotes.map((note) => [note.id, note]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
  const missing = currentNotes.filter((note) => !orderedIds.includes(note.id));

  await docRef.update({ notes: [...reordered, ...missing], updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteUserTrip(userId, tripId) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().userId !== userId) {
    throw new Error("Trip not found.");
  }

  await docRef.delete();
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
}
