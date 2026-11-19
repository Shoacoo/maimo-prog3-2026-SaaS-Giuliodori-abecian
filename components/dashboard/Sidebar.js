"use client";

import { useState } from "react";
import Link from "next/link";
import UserAvatar from "@/components/profile/UserAvatar";
import Image from "next/image";
import { useTripPill } from "@/components/dashboard/TripPillProvider";

const NAV_SECTIONS = [
  {
    id: "resumen",
    label: "Resumen",
    children: [
      { label: "Mis viajes", href: "/dashboard/trips" },
      { label: "Mi mundo", href: "/dashboard/mundo" },
      { label: "Lugares para visitar", href: (tripId) => `/dashboard/trips/${tripId}/lugares`, requiresTrip: true },
      { label: "Notas", href: (tripId) => `/dashboard/trips/${tripId}/notas`, requiresTrip: true },
    ],
  },
  {
    id: "itinerario",
    label: "Itinerario",
    children: [
      { label: "Calendario", href: (tripId) => `/dashboard/trips/${tripId}/itinerario`, requiresTrip: true },
      { label: "Itinerario", href: (tripId) => `/dashboard/trips/${tripId}/itinerario`, requiresTrip: true },
    ],
  },
  {
    id: "presupuesto",
    label: "Presupuesto",
    children: [{ label: "Gastos", href: (tripId) => `/dashboard/trips/${tripId}/gastos`, requiresTrip: true }],
  },
  {
    id: "recuerdos",
    label: "Recuerdos",
    children: [
      { label: "Fotos y bitácora", href: (tripId) => `/dashboard/trips/${tripId}/recuerdos`, requiresTrip: true },
      { label: "Souvenirs", href: (tripId) => `/dashboard/trips/${tripId}/souvenirs`, requiresTrip: true },
    ],
  },
];

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar({ userLabel, avatarUrl, friendRequests = 0, logoutAction, isAdmin }) {
  const [isOpen, setIsOpen] = useState(true);
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(NAV_SECTIONS.map((section) => [section.id, true])),
  );
  const tripPill = useTripPill();

  function toggleSection(id) {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-gray-100 bg-white transition-[width] duration-200 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-4">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-label="Abrir o cerrar el menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
        >
          <HamburgerIcon />
        </button>
        {isOpen ? (
          <Link
            href="/dashboard/trips"
            className="flex min-w-0 items-center gap-2 truncate text-lg font-bold text-gray-900 transition hover:text-[#7386f5]"
          >
            <Image src="/logo-mark.png" alt="" width={24} height={24} className="h-6 w-6 shrink-0" priority />
            Triphy
          </Link>
        ) : null}
      </div>

      {isOpen ? (
        <>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  {section.label}
                  <ChevronIcon open={openSections[section.id]} />
                </button>
                {openSections[section.id] ? (
                  <ul className="mt-1 grid gap-1 pl-4">
                    {section.children.map((child, childIndex) => {
                      const isTripSlot = section.id === "resumen" && childIndex === 0 && Boolean(tripPill);

                      if (isTripSlot) {
                        return (
                          <li key={`${section.id}-${childIndex}-trip-pill`}>
                            <Link
                              href={`/dashboard/trips/${tripPill.id}`}
                              className="inline-flex h-8 max-w-full items-center truncate rounded-full bg-[#7386f5] px-3 text-sm font-semibold text-white transition hover:bg-[#5f70e0]"
                            >
                              {tripPill.name}
                            </Link>
                          </li>
                        );
                      }

                      const locked = child.requiresTrip && !tripPill;
                      const href = typeof child.href === "function" ? child.href(tripPill?.id) : child.href;

                      return (
                        <li key={`${section.id}-${childIndex}-${child.label}`}>
                          {locked ? (
                            <span
                              aria-disabled="true"
                              className="block cursor-not-allowed rounded-lg px-2 py-1.5 text-sm text-gray-300"
                            >
                              {child.label}
                            </span>
                          ) : (
                            <Link
                              href={href}
                              className="block rounded-lg px-2 py-1.5 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
                            >
                              {child.label}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ))}
          </nav>

          {isAdmin ? (
            <div className="border-t border-gray-100 px-3 py-3">
              <Link
                href="/admin"
                className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Panel de administrador
              </Link>
            </div>
          ) : null}

          <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-3">
            {/* Foto y nombre: llevan a "Mi perfil". */}
            <Link
              href="/dashboard/perfil"
              title="Mi perfil"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 transition hover:bg-gray-50"
            >
              <span className="relative">
                <UserAvatar src={avatarUrl} name={userLabel} size={38} className="ring-[#7386f5]/20" />
                {friendRequests ? (
                  <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#F5A524] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {friendRequests}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-gray-900">{userLabel}</span>
                <span className="block text-xs text-[#7386f5]">
                  {friendRequests
                    ? `${friendRequests} ${friendRequests === 1 ? "solicitud de amistad" : "solicitudes de amistad"}`
                    : "Ver mi perfil"}
                </span>
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs font-medium text-gray-400 underline underline-offset-2 transition hover:text-gray-700"
              >
                Salir
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="mt-auto flex justify-center border-t border-gray-100 py-3">
          <Link href="/dashboard/perfil" title="Mi perfil" aria-label="Mi perfil">
            <UserAvatar src={avatarUrl} name={userLabel} size={36} />
          </Link>
        </div>
      )}
    </aside>
  );
}
