import { cookies } from "next/headers";
import { getAdminAuth } from "./admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "./constants";
import { getUserRole } from "@/lib/users/users";

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE };

export async function createSessionCookie(idToken) {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE * 1000,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    return await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

// Role lives in Firestore (lib/users/users.js), not in the session cookie, so
// promotions/demotions made from the admin panel take effect immediately
// without forcing the user to log in again.
export async function getCurrentAdminUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const role = await getUserRole(user.uid);
  return role === "admin" ? { ...user, role } : null;
}
