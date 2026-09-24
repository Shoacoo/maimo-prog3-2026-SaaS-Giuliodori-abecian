import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/firestore";

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

export async function deleteUserTrip(userId, tripId) {
  const docRef = getDb().collection(COLLECTION).doc(tripId);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().userId !== userId) {
    throw new Error("Trip not found.");
  }

  await docRef.delete();
}
