"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { createUserTrip, deleteUserTrip, updateTripDestinationsOrder } from "@/lib/trips/trips";

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
