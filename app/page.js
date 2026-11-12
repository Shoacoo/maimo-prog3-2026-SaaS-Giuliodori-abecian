import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";

export const dynamic = "force-dynamic";

// La app no tiene portada: con sesion se entra directo a Mis viajes y sin
// sesion al login.
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard/trips" : "/login");
}
