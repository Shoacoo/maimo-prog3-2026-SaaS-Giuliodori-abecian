// Migracion unica para viajes compartidos: completa memberIds e invitedEmails
// en los viajes creados antes de esta funcion.
//
//   node scripts/migrar-miembros.mjs           -> solo muestra lo que cambiaria
//   node scripts/migrar-miembros.mjs --apply   -> aplica los cambios
//
// Por cada viaje: los compañeros con cuenta en Triphy (se buscan por email en
// Firebase Auth) pasan a memberIds y pueden ver y editar el viaje; los que no
// tienen cuenta quedan en invitedEmails hasta que se registren.
// Se puede correr mas de una vez: lo que ya esta migrado no se toca.
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
require("@next/env").loadEnvConfig(root);

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const APPLY = process.argv.includes("--apply");
const env = process.env;
initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();
const auth = getAuth();
const mask = (email) => email.replace(/^(.{3}).*(@.*)$/, "$1***$2");

const snapshot = await db.collection("trips").get();
let changed = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  const companions = [];
  for (const companion of data.companions || []) {
    const email = String(companion.email || "").toLowerCase();
    let uid = companion.uid || null;
    if (!uid && email) {
      try {
        uid = (await auth.getUserByEmail(email)).uid;
      } catch {
        // sin cuenta: queda como invitacion pendiente
      }
    }
    companions.push({ ...companion, email, uid, status: uid ? "added" : "invited" });
  }

  const others = companions.filter((companion) => companion.uid !== data.userId);
  const memberIds = [...new Set([data.userId, ...others.filter((c) => c.uid).map((c) => c.uid)])];
  const invitedEmails = others.filter((c) => !c.uid).map((c) => c.email);

  const unchanged =
    JSON.stringify(data.memberIds || null) === JSON.stringify(memberIds) &&
    JSON.stringify(data.invitedEmails || null) === JSON.stringify(invitedEmails);
  if (unchanged) continue;

  changed += 1;
  const withAccount = others.filter((c) => c.uid).map((c) => mask(c.email)).join(", ") || "-";
  const pending = invitedEmails.map(mask).join(", ") || "-";
  console.log(`${doc.id} "${data.name}": compañeros con acceso: ${withAccount} · pendientes: ${pending}`);
  if (APPLY) {
    await doc.ref.update({ companions: others, memberIds, invitedEmails });
  }
}

console.log(`\n${snapshot.size} viajes · ${changed} ${APPLY ? "actualizados" : "para actualizar (no se cambió nada; usá --apply)"}`);
