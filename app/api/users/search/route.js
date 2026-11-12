import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/firebase/session";
import { searchUsers } from "@/lib/users/users";

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const users = await searchUsers(searchParams.get("q"), user.uid);
  return NextResponse.json({ users });
}
