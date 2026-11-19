import { getDb } from "@/lib/firebase/firestore";

// Registro de acciones sensibles del panel de admin (quien, que y cuando).
// Se muestra en el resumen del panel como "Actividad reciente".
const COLLECTION = "adminLog";

export async function logAdminAction({ admin, action, targetType, targetId, targetLabel }) {
  try {
    await getDb()
      .collection(COLLECTION)
      .add({
        adminUid: admin.uid,
        adminEmail: admin.email || null,
        action,
        targetType,
        targetId: targetId || null,
        targetLabel: targetLabel || null,
        createdAt: new Date().toISOString(),
      });
  } catch {
    // Si falla el registro, la accion ya se hizo: no se corta por esto.
  }
}

export async function listRecentAdminActions(limit = 8) {
  try {
    const snapshot = await getDb().collection(COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch {
    return [];
  }
}
