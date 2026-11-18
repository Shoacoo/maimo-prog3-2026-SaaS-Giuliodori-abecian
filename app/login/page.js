import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/firebase/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ingresar | Triphy" };

// Solo se aceptan destinos internos del dashboard (evita redirecciones abiertas).
function safeNext(next) {
  return typeof next === "string" && next.startsWith("/dashboard") ? next : "/dashboard/trips";
}

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (user) {
    // Ya tiene sesion (por ejemplo, abrio el link de una invitacion): directo al destino.
    redirect(safeNext(next));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#7386f5] px-4 py-10 sm:px-6">
      <LoginForm />
    </main>
  );
}
