import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";

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

async function deleteUserTrips(uid) {
  const snapshot = await getDb().collection("trips").where("userId", "==", uid).get();
  const batch = getDb().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  if (!snapshot.empty) {
    await batch.commit();
  }
}

export async function deleteUserCompletely(uid) {
  await deleteUserTrips(uid);
  await getDb().collection(COLLECTION).doc(uid).delete();
  await getAdminAuth().deleteUser(uid);
}
