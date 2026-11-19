import { getDb } from "@/lib/firebase/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";
import { avatarUrlFor } from "@/lib/users/profile";

// Amistades entre usuarios. Un documento por par en `friendships`, con id
// "<uidMenor>_<uidMayor>" (asi no puede haber dos para el mismo par):
//   { users: [uidA, uidB], requester, status: "pending" | "accepted", createdAt, acceptedAt }
// Se agregan por email: el otro recibe la solicitud y la acepta o la rechaza.

const COLLECTION = "friendships";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_FRIENDS = 200;
const MAX_PENDING = 20;

function pairId(a, b) {
  return [a, b].sort().join("_");
}

async function profilesFor(uids) {
  const unique = [...new Set(uids)];
  if (!unique.length) return {};
  const [docs, tripCounts] = await Promise.all([
    getDb().getAll(...unique.map((uid) => getDb().collection("users").doc(uid))),
    Promise.all(
      unique.map((uid) =>
        getDb()
          .collection("trips")
          .where("userId", "==", uid)
          .count()
          .get()
          .then((result) => result.data().count)
          .catch(() => 0),
      ),
    ),
  ]);
  const tripsByUid = Object.fromEntries(unique.map((uid, index) => [uid, tripCounts[index]]));
  return Object.fromEntries(
    docs.map((doc) => {
      const data = doc.exists ? doc.data() : {};
      return [
        doc.id,
        {
          uid: doc.id,
          name: data.displayName || (data.email || "").split("@")[0] || "Usuario",
          email: data.email || "",
          avatarUrl: avatarUrlFor(doc.id, data),
          location: [data.homeCity, data.homeCountry].filter(Boolean).join(", "),
          tripCount: tripsByUid[doc.id] || 0,
        },
      ];
    }),
  );
}

export async function listFriendships(uid) {
  const snapshot = await getDb().collection(COLLECTION).where("users", "array-contains", uid).get();
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return { ...data, otherUid: data.users.find((user) => user !== uid) };
  });
  const profiles = await profilesFor(rows.map((row) => row.otherUid));
  const withProfile = (row) => ({ ...profiles[row.otherUid], since: row.acceptedAt || row.createdAt });

  return {
    friends: rows
      .filter((row) => row.status === "accepted")
      .map(withProfile)
      .sort((a, b) => a.name.localeCompare(b.name)),
    incoming: rows.filter((row) => row.status === "pending" && row.requester !== uid).map(withProfile),
    outgoing: rows.filter((row) => row.status === "pending" && row.requester === uid).map(withProfile),
  };
}

// Devuelve { status: "sent" | "accepted" } o tira un Error con un mensaje
// para mostrar. Si el otro ya le habia mandado una solicitud, se acepta.
export async function sendFriendRequest(uid, rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("Escribí un email válido.");

  let other;
  try {
    other = await getAdminAuth().getUserByEmail(email);
  } catch {
    throw new Error("No encontramos a nadie con ese email en Triphy.");
  }
  if (other.uid === uid) throw new Error("No podés agregarte a vos mismo.");

  const ref = getDb().collection(COLLECTION).doc(pairId(uid, other.uid));
  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data();
    if (data.status === "accepted") throw new Error("Ya son amigos.");
    if (data.requester === uid) throw new Error("Ya le mandaste una solicitud.");
    await ref.update({ status: "accepted", acceptedAt: new Date().toISOString() });
    return { status: "accepted" };
  }

  // Limites simples contra abusos: total de amistades y solicitudes pendientes.
  const mine = await getDb().collection(COLLECTION).where("users", "array-contains", uid).get();
  if (mine.size >= MAX_FRIENDS) throw new Error("Llegaste al máximo de amigos.");
  const pendingSent = mine.docs.filter((doc) => doc.data().status === "pending" && doc.data().requester === uid).length;
  if (pendingSent >= MAX_PENDING) throw new Error("Tenés muchas solicitudes sin responder. Esperá a que las acepten.");

  await ref.set({
    users: [uid, other.uid],
    requester: uid,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return { status: "sent" };
}

export async function acceptFriendRequest(uid, otherUid) {
  const ref = getDb().collection(COLLECTION).doc(pairId(uid, otherUid));
  const doc = await ref.get();
  if (!doc.exists || doc.data().status !== "pending" || doc.data().requester === uid) {
    throw new Error("La solicitud ya no existe.");
  }
  await ref.update({ status: "accepted", acceptedAt: new Date().toISOString() });
}

// Rechazar una solicitud, cancelar la propia o dejar de ser amigos.
export async function removeFriendship(uid, otherUid) {
  const ref = getDb().collection(COLLECTION).doc(pairId(uid, otherUid));
  const doc = await ref.get();
  if (!doc.exists || !doc.data().users.includes(uid)) throw new Error("No existe esa amistad.");
  await ref.delete();
}

// Al borrar una cuenta se borran sus amistades.
export async function removeAllFriendships(uid) {
  const snapshot = await getDb().collection(COLLECTION).where("users", "array-contains", uid).get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
}

// Solicitudes recibidas sin responder (para el aviso del menu lateral).
export async function countIncomingRequests(uid) {
  try {
    // Una sola condicion en la consulta (no necesita indice compuesto).
    const snapshot = await getDb().collection(COLLECTION).where("users", "array-contains", uid).get();
    return snapshot.docs.filter((doc) => doc.data().status === "pending" && doc.data().requester !== uid).length;
  } catch {
    return 0;
  }
}
