"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { createUserTrip, deleteUserTrip } from "@/lib/trips/trips";
import { getCityById } from "@/lib/trips/cities";

function parseTripForm(formData) {
  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const ids = JSON.parse(formData.get("destinationIds") || "[]");
  const destinations = ids.map(getCityById).filter(Boolean);

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
