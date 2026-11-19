"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AdminIcon from "@/components/admin/icons";

const NAV_ITEMS = [
  { label: "Resumen", href: "/admin", icon: "dashboard" },
  { label: "Usuarios", href: "/admin/usuarios", icon: "users" },
  { label: "Viajes", href: "/admin/viajes", icon: "plane" },
  { label: "Lugares", href: "/admin/lugares", icon: "pin" },
];

export default function AdminSidebar({ adminLabel, logoutAction }) {
  const pathname = usePathname();

  return (
    <>
      {/* Celular: barra superior con las secciones como iconos. */}
      <header className="sticky top-0 z-30 flex items-center gap-1 overflow-x-auto bg-[#0b1d4f] px-3 py-2 text-white md:hidden">
        <span className="mr-2 rounded-full bg-[#7386f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Admin</span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium ${
              pathname === item.href ? "bg-[#7386f5]" : "text-white/70"
            }`}
          >
            <AdminIcon name={item.icon} size={16} />
            {item.label}
          </Link>
        ))}
        <Link href="/dashboard/trips" aria-label="Volver a mi dashboard" className="ml-auto shrink-0 rounded-lg p-2 text-white/70">
          <AdminIcon name="back" size={16} />
        </Link>
      </header>

    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#0b1d4f] text-gray-100 md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Image src="/logo-mark.png" alt="" width={20} height={20} className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold">Triphy</span>
        <span className="rounded-full bg-[#7386f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Panel</p>
        <ul className="grid gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-[#7386f5] text-white shadow-md shadow-black/20" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <AdminIcon name={item.icon} size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <Link
          href="/dashboard/trips"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <AdminIcon name="back" size={18} />
          Volver a mi dashboard
        </Link>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7386f5] text-xs font-bold uppercase text-white">
            {(adminLabel || "?").slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-white/70">{adminLabel}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <AdminIcon name="logout" size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
    </>
  );
}
