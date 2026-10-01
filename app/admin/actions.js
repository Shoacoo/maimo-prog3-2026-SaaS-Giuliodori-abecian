"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/firebase/session";
import { setUserRole, deleteUserCompletely } from "@/lib/users/users";
import { deleteTripAsAdmin } from "@/lib/trips/trips";
import { clearPlaceEvents } from "@/lib/analytics/placeEvents";

async function requireAdmin() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/login");
  }
  return admin;
}

export async function promoteUser(uid) {
  await requireAdmin();
  await setUserRole(uid, "admin");
  revalidatePath("/admin/usuarios");
}

export async function demoteUser(uid) {
  const admin = await requireAdmin();
  if (admin.uid === uid) {
    throw new Error("No podes quitarte el rol de admin a vos mismo.");
  }
  await setUserRole(uid, "user");
  revalidatePath("/admin/usuarios");
}

export async function deleteUserAccount(uid) {
  const admin = await requireAdmin();
  if (admin.uid === uid) {
    throw new Error("No podes borrar tu propia cuenta de admin.");
  }
  await deleteUserCompletely(uid);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/viajes");
  revalidatePath("/admin");
}

export async function deleteTripAsAdminAction(tripId) {
  await requireAdmin();
  await deleteTripAsAdmin(tripId);
  revalidatePath("/admin/viajes");
  revalidatePath("/admin");
}

export async function clearPlaceEventsAction() {
  await requireAdmin();
  await clearPlaceEvents();
  revalidatePath("/admin/lugares");
  revalidatePath("/admin");
}
