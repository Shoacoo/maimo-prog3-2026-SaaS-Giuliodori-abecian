"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { sendTripInvites } from "@/lib/email/tripInvite";
import {
  createUserTrip,
  deleteUserTrip,
  updateTripDestinationsOrder,
  addItineraryItem,
  removeItineraryItem,
  updateItineraryItem,
  reorderItineraryItems,
  moveItineraryItem,
  addNoteFolder,
  deleteNoteFolder,
  addNote,
  updateNote,
  deleteNote,
  reorderNotes,
  toggleTripFavorite,
  addTripCompanion,
  getUserTrip,
  removeMemoryPhoto,
  saveMemoryEntry,
  deleteMemoryEntry,
} from "@/lib/trips/trips";
import { deletePhotoFile } from "@/lib/memories/photoStore";
import { sanitizeEntry } from "@/lib/memories/validation";

const NOTE_COLOR_IDS = new Set(["yellow", "rose", "sky", "violet"]);

function sanitizeDestinations(list) {
  if (!Array.isArray(list)) {
    throw new Error("Los destinos enviados son invalidos.");
  }

  return list.map((item) => {
    const id = String(item.placeId || item.id || "").trim();
    const name = String(item.name || "").trim();
    const country = String(item.country || "").trim();
    const countryCode = String(item.countryCode || "").trim();
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    const image = item.image ? String(item.image) : null;

    if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Uno de los destinos no tiene datos validos.");
    }

    return { id, name, country, countryCode, lat, lng, image };
  });
}

function parseDestinations(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    throw new Error("Los destinos enviados son invalidos.");
  }

  return sanitizeDestinations(parsed);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// URL publica de la app para los links de los emails: NEXT_PUBLIC_APP_URL si
// esta definida, si no la del request actual (sirve en localhost y en Vercel).
async function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

async function inviteCompanions(user, trip, companions) {
  return sendTripInvites({
    trip,
    inviter: { email: user.email, name: user.name },
    companions,
    appUrl: await getAppUrl(),
  });
}

function parseCompanions(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set();
  return parsed
    .map((item) => ({
      uid: item.uid ? String(item.uid) : null,
      email: String(item.email || "").trim().toLowerCase(),
      name: String(item.name || "").trim(),
      photoURL: item.photoURL ? String(item.photoURL) : null,
      status: item.uid ? "added" : "invited",
    }))
    .filter((item) => EMAIL_RE.test(item.email) && !seen.has(item.email) && seen.add(item.email))
    .slice(0, 20);
}

function parseTripForm(formData) {
  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const destinations = parseDestinations(formData.get("destinations"));

  if (!name) {
    throw new Error("El nombre del viaje es obligatorio.");
  }

  if (destinations.length === 0) {
    throw new Error("Agrega al menos un destino.");
  }

  if (!startDate || !endDate) {
    throw new Error("Las fechas del viaje son obligatorias.");
  }

  if (endDate < startDate) {
    throw new Error("La fecha de fin no puede ser anterior a la de inicio.");
  }

  return { name, startDate, endDate, destinations, companions: parseCompanions(formData.get("companions")) };
}

export async function toggleFavoritePlace(tripId, place) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const clean = sanitizeItineraryPlace(place);
  const saved = await toggleTripFavorite(user.uid, tripId, {
    ...clean,
    city: place.city ? String(place.city) : null,
  });
  revalidatePath(`/dashboard/trips/${tripId}`, "layout");
  return { saved };
}

export async function addCompanionToTrip(tripId, person) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [companion] = parseCompanions(JSON.stringify([person]));
  if (!companion) {
    throw new Error("El email no es valido.");
  }
  const trip = await addTripCompanion(user.uid, tripId, companion);
  revalidatePath(`/dashboard/trips/${tripId}`);
  if (!trip) return { invites: { sent: [], failed: [] } };
  return { invites: await inviteCompanions(user, trip, [companion]) };
}

export async function createTrip(formData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // El formulario muestra el modal "viaje creado" (diseño 03e), asi que
  // devolvemos el id en vez de redirigir.
  const trip = parseTripForm(formData);
  const id = await createUserTrip(user.uid, trip);
  revalidatePath("/dashboard/trips");
  // Invitaciones por email a los compañeros (si falla el envio, el viaje igual queda creado).
  const invites = await inviteCompanions(user, trip, trip.companions);
  return { id, invites };
}

export async function deleteTrip(tripId) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await deleteUserTrip(user.uid, tripId);
  revalidatePath("/dashboard/trips");
}

export async function reorderTripStops(tripId, destinations) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await updateTripDestinationsOrder(user.uid, tripId, sanitizeDestinations(destinations));
  revalidatePath(`/dashboard/trips/${tripId}`);
}

function sanitizeItineraryPlace(place) {
  const placeId = String(place?.placeId || place?.id || "").trim();
  const name = String(place?.name || "").trim();
  const lat = Number(place?.lat);
  const lng = Number(place?.lng);

  if (!placeId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("El lugar seleccionado no tiene datos validos.");
  }

  return {
    placeId,
    name,
    lat,
    lng,
    image: place.image ? String(place.image) : null,
    category: place.category ? String(place.category) : null,
    description: place.description ? String(place.description) : null,
  };
}

export async function addPlaceToItinerary(tripId, date, place, time = null) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const saved = await addItineraryItem(user.uid, tripId, date, {
    ...sanitizeItineraryPlace(place),
    time: sanitizeItineraryTime(time),
  });
  revalidatePath(`/dashboard/trips/${tripId}`, "layout");
  return { id: saved.id };
}

export async function removePlaceFromItinerary(tripId, date, itemId) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await removeItineraryItem(user.uid, tripId, date, itemId);
  revalidatePath(`/dashboard/trips/${tripId}`, "layout");
}

function sanitizeItineraryTime(time) {
  return typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

export async function updateItineraryItemAction(tripId, date, itemId, { time, note, description }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const updates = {
    time: sanitizeItineraryTime(time),
    note: String(note || "").trim().slice(0, 280) || null,
  };
  if (description !== undefined) {
    updates.description = String(description || "").trim().slice(0, 500) || null;
  }
  await updateItineraryItem(user.uid, tripId, date, itemId, updates);
  revalidatePath(`/dashboard/trips/${tripId}/itinerario`);
}

export async function reorderItineraryItemsAction(tripId, date, orderedIds) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await reorderItineraryItems(user.uid, tripId, date, orderedIds);
  revalidatePath(`/dashboard/trips/${tripId}/itinerario`);
}

export async function moveItineraryItemAction(tripId, fromDate, toDate, fromOrderedIds, toOrderedIds) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await moveItineraryItem(user.uid, tripId, fromDate, toDate, fromOrderedIds, toOrderedIds);
  revalidatePath(`/dashboard/trips/${tripId}/itinerario`);
}

function sanitizeNoteColor(color) {
  return NOTE_COLOR_IDS.has(color) ? color : "yellow";
}

export async function createNoteFolder(tripId, { name, color }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw new Error("El nombre de la carpeta es obligatorio.");
  }

  const folder = await addNoteFolder(user.uid, tripId, { name: cleanName, color: sanitizeNoteColor(color) });
  revalidatePath(`/dashboard/trips/${tripId}/notas`);
  return folder;
}

export async function deleteNoteFolderAction(tripId, folderId) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await deleteNoteFolder(user.uid, tripId, folderId);
  revalidatePath(`/dashboard/trips/${tripId}/notas`);
}

export async function createNote(tripId, { folderId, title, content, color }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) {
    throw new Error("El titulo de la nota es obligatorio.");
  }

  const note = await addNote(user.uid, tripId, {
    folderId: folderId || null,
    title: cleanTitle,
    content: String(content || "").trim(),
    color: sanitizeNoteColor(color),
  });
  revalidatePath(`/dashboard/trips/${tripId}/notas`);
  return note;
}

export async function updateNoteAction(tripId, noteId, { folderId, title, content, color }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) {
    throw new Error("El titulo de la nota es obligatorio.");
  }

  await updateNote(user.uid, tripId, noteId, {
    folderId: folderId || null,
    title: cleanTitle,
    content: String(content || "").trim(),
    color: sanitizeNoteColor(color),
  });
  revalidatePath(`/dashboard/trips/${tripId}/notas`);
}

export async function deleteNoteAction(tripId, noteId) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await deleteNote(user.uid, tripId, noteId);
  revalidatePath(`/dashboard/trips/${tripId}/notas`);
}

export async function reorderNotesAction(tripId, orderedIds) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await reorderNotes(user.uid, tripId, orderedIds);
  revalidatePath(`/dashboard/trips/${tripId}/notas`);
}

// --- Recuerdos ---
// Las fotos se suben por un Route Handler (app/api/trips/[id]/memories/photos)
// para poder mostrar el progreso de cada archivo; borrar fotos y la bitacora
// van por Server Actions como el resto del viaje.

async function requireOwnedTrip(tripId) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const trip = await getUserTrip(user.uid, tripId);
  if (!trip) {
    throw new Error("Viaje no encontrado.");
  }
  return { user, trip };
}

export async function deleteMemoryPhotoAction(tripId, photoId) {
  const { user } = await requireOwnedTrip(tripId);
  const removed = await removeMemoryPhoto(user.uid, tripId, String(photoId));
  if (removed) {
    await deletePhotoFile(String(photoId));
  }
  revalidatePath(`/dashboard/trips/${tripId}/recuerdos`);
}

export async function saveMemoryEntryAction(tripId, entry) {
  const { user, trip } = await requireOwnedTrip(tripId);
  const clean = sanitizeEntry(trip, entry || {});
  const saved = await saveMemoryEntry(user.uid, tripId, { ...clean, id: entry?.id ? String(entry.id) : undefined });
  revalidatePath(`/dashboard/trips/${tripId}/recuerdos`);
  return saved;
}

export async function deleteMemoryEntryAction(tripId, entryId) {
  const { user } = await requireOwnedTrip(tripId);
  await deleteMemoryEntry(user.uid, tripId, String(entryId));
  revalidatePath(`/dashboard/trips/${tripId}/recuerdos`);
}
