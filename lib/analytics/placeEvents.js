import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/firestore";

const COLLECTION = "placeEvents";
// Firestore has no native group-by - at this project's scale, reading the
// window of events and aggregating in memory is simpler and cheap enough.
const MAX_EVENTS_READ = 5000;

// Fire-and-forget: a failed analytics write must never break the user-facing
// action that triggered it (viewing a place, adding it to an itinerary).
export async function logPlaceEvent({ type, placeId, placeName, category, cityName, userId, tripId }) {
  if (!placeId || !placeName) {
    return;
  }

  try {
    await getDb()
      .collection(COLLECTION)
      .add({
        type,
        placeId,
        placeName,
        category: category || null,
        cityName: cityName || null,
        userId: userId || null,
        tripId: tripId || null,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("logPlaceEvent failed", error);
  }
}

function sinceTimestamp(sinceDays) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - sinceDays);
  return Timestamp.fromDate(cutoff);
}

async function fetchRecentEvents(sinceDays) {
  const snapshot = await getDb()
    .collection(COLLECTION)
    .where("createdAt", ">=", sinceTimestamp(sinceDays))
    .orderBy("createdAt", "desc")
    .limit(MAX_EVENTS_READ)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

export async function getTopPlaces(limitN = 10, sinceDays = 30) {
  const events = await fetchRecentEvents(sinceDays);
  const byPlace = new Map();

  for (const event of events) {
    const existing = byPlace.get(event.placeId);
    if (existing) {
      existing.count += 1;
    } else {
      byPlace.set(event.placeId, { placeId: event.placeId, name: event.placeName, category: event.category, count: 1 });
    }
  }

  return [...byPlace.values()].sort((a, b) => b.count - a.count).slice(0, limitN);
}

export async function getTopCategories(sinceDays = 30) {
  const events = await fetchRecentEvents(sinceDays);
  const byCategory = new Map();

  for (const event of events) {
    const key = event.category || "Otros";
    byCategory.set(key, (byCategory.get(key) || 0) + 1);
  }

  return [...byCategory.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getEventsPerDay(sinceDays = 30) {
  const events = await fetchRecentEvents(sinceDays);
  const byDay = new Map();

  for (const event of events) {
    const date = event.createdAt?.toDate?.();
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }

  const days = [];
  for (let i = sinceDays - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    days.push({ date: key, count: byDay.get(key) || 0 });
  }

  return days;
}

export async function getPlaceStatsTable(sinceDays = 90) {
  const events = await fetchRecentEvents(sinceDays);
  const byPlace = new Map();

  for (const event of events) {
    const existing = byPlace.get(event.placeId);
    const createdAt = event.createdAt?.toDate?.() || null;

    if (existing) {
      if (event.type === "view") existing.views += 1;
      if (event.type === "itinerary_add") existing.itineraryAdds += 1;
      if (createdAt && (!existing.lastSeen || createdAt > existing.lastSeen)) {
        existing.lastSeen = createdAt;
      }
    } else {
      byPlace.set(event.placeId, {
        placeId: event.placeId,
        name: event.placeName,
        category: event.category || "Otros",
        views: event.type === "view" ? 1 : 0,
        itineraryAdds: event.type === "itinerary_add" ? 1 : 0,
        lastSeen: createdAt,
      });
    }
  }

  return [...byPlace.values()].sort((a, b) => b.views + b.itineraryAdds - (a.views + a.itineraryAdds));
}

export async function countPlaceEvents() {
  const snapshot = await getDb().collection(COLLECTION).count().get();
  return snapshot.data().count;
}

export async function clearPlaceEvents() {
  const db = getDb();
  const collectionRef = db.collection(COLLECTION);

  // Firestore has no "delete all" - page through in batches until empty.
  let snapshot = await collectionRef.limit(400).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    snapshot = await collectionRef.limit(400).get();
  }
}
