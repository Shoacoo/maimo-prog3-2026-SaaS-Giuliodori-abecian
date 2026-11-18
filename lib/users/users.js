import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";
import { removeUserFromTrips } from "@/lib/trips/trips";

const COLLECTION = "users";

// Fallback in case ADMIN_BOOTSTRAP_EMAIL isn't set in the environment - the
// project owner's account always becomes admin on its first login.
const DEFAULT_ADMIN_EMAIL = "joacoabecian@gmail.com";

function bootstrapAdminEmail() {
  return process.env.ADMIN_BOOTSTRAP_EMAIL || DEFAULT_ADMIN_EMAIL;
}

// Called on every login/signup (see app/api/session/login/route.js). Creates
// the Firestore profile on first sight; on later logins it only refreshes
// display info - it never overwrites an already-set `role`, so
// promotions/demotions made from the admin panel survive the user's next
// login. Some accounts (this project's own - a pre-existing `users` doc from
// an earlier, unrelated iteration) already have a doc with no `role` field at
// all; those get backfilled once here instead of being left without one.
export async function ensureUserDoc({ uid, email, displayName, photoURL }) {
  const docRef = getDb().collection(COLLECTION).doc(uid);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      email: email || null,
      displayName: displayName || null,
      photoURL: photoURL || null,
      role: email && email === bootstrapAdminEmail() ? "admin" : "user",
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const update = {
    email: email || null,
    displayName: displayName || null,
    photoURL: photoURL || null,
    lastLoginAt: FieldValue.serverTimestamp(),
  };

  if (doc.data().role !== "admin" && doc.data().role !== "user") {
    update.role = email && email === bootstrapAdminEmail() ? "admin" : "user";
  }

  await docRef.update(update);
}

export async function getUserRole(uid) {
  if (!uid) {
    return "user";
  }

  const doc = await getDb().collection(COLLECTION).doc(uid).get();
  return doc.exists && doc.data().role === "admin" ? "admin" : "user";
}

export async function listUsersWithRoles() {
  const [authList, roleDocs, tripDocs] = await Promise.all([
    getAdminAuth().listUsers(1000),
    getDb().collection(COLLECTION).get(),
    getDb().collection("trips").get(),
  ]);

  const roleByUid = new Map(roleDocs.docs.map((doc) => [doc.id, doc.data()]));
  const tripCountByUid = new Map();
  tripDocs.docs.forEach((doc) => {
    const userId = doc.data().userId;
    tripCountByUid.set(userId, (tripCountByUid.get(userId) || 0) + 1);
  });

  return authList.users
    .map((user) => {
      const profile = roleByUid.get(user.uid);
      return {
        uid: user.uid,
        email: user.email || "(sin email)",
        displayName: user.displayName || profile?.displayName || null,
        role: profile?.role === "admin" ? "admin" : "user",
        disabled: user.disabled,
        createdAt: user.metadata.creationTime || null,
        lastLoginAt: user.metadata.lastSignInTime || null,
        tripCount: tripCountByUid.get(user.uid) || 0,
      };
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function setUserRole(uid, role) {
  if (role !== "admin" && role !== "user") {
    throw new Error("Rol invalido.");
  }

  await getDb().collection(COLLECTION).doc(uid).set({ role }, { merge: true });
}

// Perfil publico (nombre, email, foto) de varios usuarios, por uid. Se usa para
// mostrar el dueño de un viaje compartido.
export async function getUserProfiles(uids) {
  const unique = [...new Set((uids || []).filter(Boolean))];
  if (!unique.length) return {};
  const refs = unique.map((uid) => getDb().collection(COLLECTION).doc(uid));
  const docs = await getDb().getAll(...refs);
  return Object.fromEntries(
    docs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const data = doc.data();
        return [doc.id, { uid: doc.id, email: data.email || "", name: data.displayName || (data.email || "").split("@")[0], photoURL: data.photoURL || null }];
      }),
  );
}

// Busca en Firebase Auth si el email invitado ya tiene cuenta. Lo resuelve el
// servidor: no se confia en el uid que manda el navegador.
export async function resolveCompanion({ email, name }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  try {
    const account = await getAdminAuth().getUserByEmail(cleanEmail);
    return {
      uid: account.uid,
      email: cleanEmail,
      name: account.displayName || name || "",
      photoURL: account.photoURL || null,
      status: "added",
    };
  } catch {
    return { uid: null, email: cleanEmail, name: name || "", photoURL: null, status: "invited" };
  }
}

export async function deleteUserCompletely(uid) {
  // Sus viajes (con sus fotos) se borran; de los compartidos solo se lo saca.
  await removeUserFromTrips(uid);
  await getDb().collection(COLLECTION).doc(uid).delete();
  await getAdminAuth().deleteUser(uid);
}

// Busca usuarios registrados por nombre o email (para agregar compañeros a un
// viaje). La coleccion es chica, asi que filtramos en memoria.
export async function searchUsers(query, excludeUid) {
  const needle = String(query || "").trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }

  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs
    .filter((doc) => doc.id !== excludeUid)
    .map((doc) => ({ uid: doc.id, ...doc.data() }))
    .filter(
      (user) =>
        (user.email || "").toLowerCase().includes(needle) ||
        (user.displayName || "").toLowerCase().includes(needle),
    )
    .slice(0, 5)
    .map((user) => ({
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || (user.email || "").split("@")[0],
      photoURL: user.photoURL || null,
    }));
}
