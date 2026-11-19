"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/firebase/session";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/constants";
import { countAdmins, deleteUserCompletely, getUserSummary } from "@/lib/users/users";
import {
  CURRENCY_OPTIONS,
  parseAvatarDataUrl,
  removeAvatar,
  saveAvatar,
  updateMyProfile,
} from "@/lib/users/profile";
import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "@/lib/users/friends";

// Acciones de "Mi perfil". Cada una verifica la sesion en el servidor (contra
// Firebase, incluida la revocacion) y solo toca la cuenta de quien la usa.
// Devuelven { error } para mostrarlo en la pantalla.

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tu sesión venció. Volvé a iniciar sesión.");
  return user;
}

function clean(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function run(fn) {
  try {
    return (await fn()) || { ok: true };
  } catch (error) {
    return { error: error.message || "No se pudo guardar." };
  }
}

function refresh() {
  revalidatePath("/dashboard", "layout");
}

export async function saveProfile(input) {
  return run(async () => {
    const user = await requireUser();
    const displayName = clean(input?.displayName, 60);
    if (displayName.length < 2) throw new Error("El nombre tiene que tener al menos 2 letras.");
    const currency = CURRENCY_OPTIONS.includes(input?.currency) ? input.currency : "ARS";

    await updateMyProfile(user.uid, {
      displayName,
      bio: String(input?.bio || "").trim().slice(0, 280),
      homeCity: clean(input?.homeCity, 60),
      homeCountry: clean(input?.homeCountry, 60),
      currency,
    });
    refresh();
  });
}

export async function uploadAvatar(dataUrl) {
  return run(async () => {
    const user = await requireUser();
    if (!parseAvatarDataUrl(dataUrl)) {
      throw new Error("La foto no es válida o pesa demasiado (máximo 100 KB después de achicarla).");
    }
    const avatarUrl = await saveAvatar(user.uid, dataUrl);
    refresh();
    return { ok: true, avatarUrl };
  });
}

export async function deleteAvatar() {
  return run(async () => {
    const user = await requireUser();
    await removeAvatar(user.uid);
    refresh();
  });
}

export async function deleteMyAccount(confirmation) {
  const result = await run(async () => {
    const user = await requireUser();
    const me = await getUserSummary(user.uid);
    if (!me) throw new Error("No encontramos tu cuenta.");
    if (String(confirmation || "").trim().toLowerCase() !== String(me.email || "").toLowerCase()) {
      throw new Error("El email de confirmación no coincide.");
    }
    if (me.role === "admin" && (await countAdmins()) <= 1) {
      throw new Error("Sos el único admin: antes de borrar tu cuenta, hacé admin a otra persona.");
    }

    await deleteUserCompletely(user.uid);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  });
  return result;
}

const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function validUid(value) {
  const uid = String(value || "");
  if (!UID_RE.test(uid)) throw new Error("Usuario inválido.");
  return uid;
}

export async function addFriend(email) {
  return run(async () => {
    const user = await requireUser();
    const result = await sendFriendRequest(user.uid, email);
    refresh();
    return { ok: true, status: result.status };
  });
}

export async function acceptFriend(otherUid) {
  return run(async () => {
    const user = await requireUser();
    await acceptFriendRequest(user.uid, validUid(otherUid));
    refresh();
  });
}

// Rechazar, cancelar una solicitud enviada o dejar de ser amigos.
export async function removeFriend(otherUid) {
  return run(async () => {
    const user = await requireUser();
    await removeFriendship(user.uid, validUid(otherUid));
    refresh();
  });
}
