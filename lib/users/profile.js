import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";

// Perfil del usuario (pantalla "Mi perfil").
//
// La foto propia no va a Cloud Storage (el proyecto no lo tiene): se guarda
// como data URL JPEG chica (~256 px, < 100 KB) en la coleccion `avatars`, un
// documento por usuario, y se sirve por /api/users/avatar/[uid]. Asi el
// documento `users` (que se lee entero en las busquedas) sigue siendo liviano.
// Si no subio una foto propia se usa la de su cuenta de Google (photoURL).

const USERS = "users";
const AVATARS = "avatars";
export const MAX_AVATAR_BYTES = 100 * 1024;
const DATA_URL_RE = /^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/=]+)$/;

export const CURRENCY_OPTIONS = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "MXN"];

// URL de la foto a mostrar para un documento de `users`.
export function avatarUrlFor(uid, data) {
  if (data?.avatarVersion) return `/api/users/avatar/${uid}?v=${data.avatarVersion}`;
  return data?.photoURL || null;
}

// Datos minimos para el menu lateral: nombre, foto y rol (una sola lectura).
export async function getSidebarProfile(uid) {
  const doc = await getDb().collection(USERS).doc(uid).get();
  const data = doc.exists ? doc.data() : {};
  return {
    displayName: data.displayName || null,
    avatarUrl: avatarUrlFor(uid, data),
    role: data.role === "admin" ? "admin" : "user",
  };
}

export async function getMyProfile(uid) {
  const [doc, authUser] = await Promise.all([
    getDb().collection(USERS).doc(uid).get(),
    getAdminAuth().getUser(uid),
  ]);
  const data = doc.exists ? doc.data() : {};
  const providers = authUser.providerData.map((provider) => provider.providerId);

  return {
    uid,
    email: authUser.email || data.email || "",
    displayName: data.displayName || authUser.displayName || "",
    bio: data.bio || "",
    homeCity: data.homeCity || "",
    homeCountry: data.homeCountry || "",
    currency: CURRENCY_OPTIONS.includes(data.currency) ? data.currency : "ARS",
    avatarUrl: avatarUrlFor(uid, data),
    hasCustomAvatar: Boolean(data.avatarVersion),
    googlePhoto: data.photoURL || null,
    role: data.role === "admin" ? "admin" : "user",
    memberSince: authUser.metadata.creationTime || null,
    lastLogin: authUser.metadata.lastSignInTime || null,
    hasPassword: providers.includes("password"),
    hasGoogle: providers.includes("google.com"),
  };
}

export async function updateMyProfile(uid, { displayName, bio, homeCity, homeCountry, currency }) {
  await getDb()
    .collection(USERS)
    .doc(uid)
    .set(
      {
        displayName,
        bio,
        homeCity,
        homeCountry,
        currency,
        // El login no vuelve a pisar el nombre con el de Google.
        profileEdited: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  await getAdminAuth().updateUser(uid, { displayName: displayName || null });
}

export function parseAvatarDataUrl(dataUrl) {
  const match = DATA_URL_RE.exec(String(dataUrl || ""));
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_AVATAR_BYTES) return null;
  return { contentType: `image/${match[1]}`, bytes };
}

export async function saveAvatar(uid, dataUrl) {
  const version = Date.now();
  await getDb().collection(AVATARS).doc(uid).set({ dataUrl, updatedAt: new Date(version).toISOString() });
  await getDb().collection(USERS).doc(uid).set({ avatarVersion: version }, { merge: true });
  return avatarUrlFor(uid, { avatarVersion: version });
}

export async function removeAvatar(uid) {
  await getDb().collection(AVATARS).doc(uid).delete();
  await getDb().collection(USERS).doc(uid).set({ avatarVersion: FieldValue.delete() }, { merge: true });
}

export async function readAvatar(uid) {
  const doc = await getDb().collection(AVATARS).doc(uid).get();
  return doc.exists ? parseAvatarDataUrl(doc.data().dataUrl) : null;
}
