"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Resumen", href: "/admin" },
  { label: "Usuarios", href: "/admin/usuarios" },
  { label: "Viajes", href: "/admin/viajes" },
  { label: "Lugares", href: "/admin/lugares" },
];

export default function AdminSidebar({ adminLabel, logoutAction }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-gray-950 text-gray-100">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Image src="/logo-mark.png" alt="" width={20} height={20} className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold">Triphy Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="grid gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-[#7386f5] text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
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
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          ← Volver a mi dashboard
        </Link>
        <div className="mt-3 flex items-center justify-between px-3">
          <span className="truncate text-xs text-gray-400">{adminLabel}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-xs font-medium text-gray-400 underline underline-offset-2 transition hover:text-white">
              Salir
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
