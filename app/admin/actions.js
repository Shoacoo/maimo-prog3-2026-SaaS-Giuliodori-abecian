"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdminUser } from "@/lib/firebase/session";
import { getDb } from "@/lib/firebase/firestore";
import { setUserRole, deleteUserCompletely, countAdmins, getUserSummary } from "@/lib/users/users";
import { deleteTripAsAdmin } from "@/lib/trips/trips";
import { clearPlaceEvents } from "@/lib/analytics/placeEvents";
import { logAdminAction } from "@/lib/admin/adminLog";
import { CONFIRM_WORD } from "@/lib/admin/confirm";

// Acciones sensibles del panel de admin. Cada una:
// - verifica en el servidor que quien la ejecuta es admin (la sesion se valida
//   contra Firebase, incluida la revocacion; no alcanza con el layout),
// - valida los ids recibidos,
// - exige el texto de confirmacion que el modal le pidio escribir al admin,
// - queda registrada en adminLog.
// Devuelven { error } en vez de tirar excepciones, para mostrarlo en el modal.

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function same(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

async function requireAdmin() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    throw new Error("Tu sesión de administrador no es válida. Volvé a iniciar sesión.");
  }
  return admin;
}

async function run(fn) {
  try {
    return (await fn()) || { ok: true };
  } catch (error) {
    return { error: error.message || "No se pudo completar la acción." };
  }
}

function validId(id, kind) {
  const value = String(id || "");
  if (!ID_RE.test(value)) throw new Error(`El ${kind} no es válido.`);
  return value;
}

export async function promoteUser(uid, confirmation) {
  return run(async () => {
    const admin = await requireAdmin();
    const target = await getUserSummary(validId(uid, "usuario"));
    if (!target) throw new Error("El usuario no existe.");
    if (target.role === "admin") throw new Error("Ese usuario ya es admin.");
    if (!same(confirmation, target.email)) throw new Error("El email de confirmación no coincide.");

    await setUserRole(target.uid, "admin");
    await logAdminAction({ admin, action: "promote", targetType: "user", targetId: target.uid, targetLabel: target.email });
    revalidatePath("/admin", "layout");
  });
}

export async function demoteUser(uid, confirmation) {
  return run(async () => {
    const admin = await requireAdmin();
    const target = await getUserSummary(validId(uid, "usuario"));
    if (!target) throw new Error("El usuario no existe.");
    if (target.uid === admin.uid) throw new Error("No podés quitarte el rol de admin a vos mismo.");
    if (target.role !== "admin") throw new Error("Ese usuario no es admin.");
    if ((await countAdmins()) <= 1) throw new Error("Tiene que quedar al menos un admin.");
    if (!same(confirmation, CONFIRM_WORD)) throw new Error(`Escribí ${CONFIRM_WORD} para confirmar.`);

    await setUserRole(target.uid, "user");
    await logAdminAction({ admin, action: "demote", targetType: "user", targetId: target.uid, targetLabel: target.email });
    revalidatePath("/admin", "layout");
  });
}

export async function deleteUserAccount(uid, confirmation) {
  return run(async () => {
    const admin = await requireAdmin();
    const target = await getUserSummary(validId(uid, "usuario"));
    if (!target) throw new Error("El usuario no existe.");
    if (target.uid === admin.uid) throw new Error("No podés borrar tu propia cuenta de admin.");
    if (target.role === "admin" && (await countAdmins()) <= 1) throw new Error("Tiene que quedar al menos un admin.");
    if (!same(confirmation, target.email)) throw new Error("El email de confirmación no coincide.");

    await deleteUserCompletely(target.uid);
    await logAdminAction({ admin, action: "delete-user", targetType: "user", targetId: target.uid, targetLabel: target.email });
    revalidatePath("/admin", "layout");
  });
}

export async function deleteTripAsAdminAction(tripId, confirmation) {
  return run(async () => {
    const admin = await requireAdmin();
    const id = validId(tripId, "viaje");
    const doc = await getDb().collection("trips").doc(id).get();
    if (!doc.exists) throw new Error("El viaje no existe.");
    const name = doc.data().name || "";
    if (!same(confirmation, name || CONFIRM_WORD)) throw new Error("El nombre de confirmación no coincide.");

    await deleteTripAsAdmin(id);
    await logAdminAction({ admin, action: "delete-trip", targetType: "trip", targetId: id, targetLabel: name });
    revalidatePath("/admin", "layout");
  });
}

export async function clearPlaceEventsAction(confirmation) {
  return run(async () => {
    const admin = await requireAdmin();
    if (!same(confirmation, CONFIRM_WORD)) throw new Error(`Escribí ${CONFIRM_WORD} para confirmar.`);

    await clearPlaceEvents();
    await logAdminAction({ admin, action: "clear-stats", targetType: "stats", targetLabel: "Estadísticas de lugares" });
    revalidatePath("/admin", "layout");
  });
}
