"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import {
  createUserTrip,
  deleteUserTrip,
  updateTripDestinationsOrder,
  addItineraryItem,
  removeItineraryItem,
  reorderItineraryItems,
  addNoteFolder,
  deleteNoteFolder,
  addNote,
  updateNote,
  deleteNote,
  reorderNotes,
} from "@/lib/trips/trips";

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

  return { name, startDate, endDate, destinations };
}

export async function createTrip(formData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await createUserTrip(user.uid, parseTripForm(formData));
  revalidatePath("/dashboard/trips");
  redirect("/dashboard/trips");
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

export async function addPlaceToItinerary(tripId, date, place) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await addItineraryItem(user.uid, tripId, date, sanitizeItineraryPlace(place));
  revalidatePath(`/dashboard/trips/${tripId}/itinerario`);
  revalidatePath(`/dashboard/trips/${tripId}/lugares`);
}

export async function removePlaceFromItinerary(tripId, date, itemId) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await removeItineraryItem(user.uid, tripId, date, itemId);
  revalidatePath(`/dashboard/trips/${tripId}/itinerario`);
  revalidatePath(`/dashboard/trips/${tripId}/lugares`);
}

export async function reorderItineraryItemsAction(tripId, date, orderedIds) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await reorderItineraryItems(user.uid, tripId, date, orderedIds);
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
