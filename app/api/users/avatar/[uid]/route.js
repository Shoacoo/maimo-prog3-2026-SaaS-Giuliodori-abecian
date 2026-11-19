import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/firebase/session";
import { readAvatar } from "@/lib/users/profile";

const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// Foto de perfil subida por el usuario (guardada en Firestore). La URL lleva
// ?v=<version>, asi que cada version se puede cachear para siempre.
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { uid } = await params;
  if (!UID_RE.test(uid)) {
    return NextResponse.json({ error: "Usuario inválido." }, { status: 400 });
  }

  const avatar = await readAvatar(uid);
  if (!avatar) {
    return NextResponse.json({ error: "Sin foto." }, { status: 404 });
  }

  return new Response(avatar.bytes, {
    headers: {
      "Content-Type": avatar.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
