import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/firebase/session";
import { readPhotoFile } from "@/lib/memories/photoStore";

// Sirve una foto de Recuerdos solo a su dueño (?size=thumb para la miniatura).
// El id es unico e inmutable, asi que el navegador puede cachearla.
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { photoId } = await params;
  const size = new URL(request.url).searchParams.get("size") === "thumb" ? "thumb" : "full";
  const file = await readPhotoFile(photoId, size);

  if (!file || file.userId !== user.uid) {
    return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  }

  return new Response(file.bytes, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
