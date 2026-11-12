import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/firebase/session";
import heroImage from "@/public/login-hero.jpg";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1d4f] text-white">
      <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d4f] via-[#0b1d4f]/60 to-transparent" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <span className="flex items-center gap-2 text-lg font-bold">
          <Image src="/logo-mark.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          Triphy
        </span>
        <Link
          href={user ? "/dashboard/trips" : "/login"}
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20"
        >
          {user ? "Mis viajes" : "Ingresar"}
        </Link>
      </header>

      <section className="relative mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-6xl flex-col justify-end px-6 pb-20 sm:px-8">
        <span className="block h-1 w-10 rounded-full bg-[#7CBE66]" />
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">Tu viaje perfecto, sin esfuerzo</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
          Planifica destinos, arma tu itinerario dia por dia, guarda notas y mira en un globo todos los lugares que
          recorriste.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href={user ? "/dashboard/trips" : "/login"}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#7CBE66] px-6 text-sm font-semibold text-[#0b1d4f] transition hover:bg-[#8fd078]"
          >
            {user ? "Ir a mis viajes" : "Empezar a planificar"}
          </Link>
          {user ? (
            <Link
              href="/dashboard/mundo"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/40 px-6 text-sm font-semibold transition hover:bg-white/10"
            >
              Ver mi mundo
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
