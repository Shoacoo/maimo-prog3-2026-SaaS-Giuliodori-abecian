import { NextResponse } from "next/server";
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/firebase/session";
import { getAdminAuth } from "@/lib/firebase/admin";
import { ensureUserDoc } from "@/lib/users/users";

export async function POST(request) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: "Missing Firebase ID token." }, { status: 400 });
  }

  try {
    const [sessionCookie, decoded] = await Promise.all([
      createSessionCookie(idToken),
      getAdminAuth().verifyIdToken(idToken),
    ]);

    await ensureUserDoc({
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
      photoURL: decoded.picture,
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not create a server session." },
      { status: 401 },
    );
  }
}
