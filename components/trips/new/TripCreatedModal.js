"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Avatar } from "@/components/trips/new/CompanionSearch";

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "23 – 30 de Septiembre 2027", "28 de Septiembre – 3 de Octubre 2027", ...
export function formatDateRange(start, end) {
  if (!start || !end) return "";
  const month = (date) => capitalize(new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date));

  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getDate()} de ${month(start)} ${start.getFullYear()} – ${end.getDate()} de ${month(end)} ${end.getFullYear()}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${start.getDate()} de ${month(start)} – ${end.getDate()} de ${month(end)} ${end.getFullYear()}`;
  }
  return `${start.getDate()} – ${end.getDate()} de ${month(end)} ${end.getFullYear()}`;
}

function firstName(person) {
  return (person.name || person.email).split(/[\s@]/)[0];
}

function joinNames(names) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

const NEXT_STEPS = [
  { icon: "🗓️", text: "Armá el itinerario día por día" },
  { icon: "📍", text: "Guardá lugares para visitar en cada parada" },
  { icon: "💰", text: "Definí el presupuesto del viaje" },
];

export default function TripCreatedModal({ tripId, name, destinations, companions, startDate, endDate }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const cover = destinations.find((city) => city.image)?.image;
  const route = destinations.map((city) => city.name).join(" → ");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-[560px] overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="relative h-[200px] w-full bg-gray-100">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={destinations[0]?.name || ""} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3.5 px-8 pb-7 pt-6">
          <h2 className="text-center text-2xl font-bold text-gray-900">¡Tu viaje a {name} está listo! 🎉</h2>
          <p className="text-center text-[15px] text-gray-500">
            {formatDateRange(startDate, endDate)} · {route}
          </p>

          {companions.length > 0 ? (
            <div className="flex w-full items-center gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5">
              <div className="flex shrink-0 gap-2.5">
                {companions.slice(0, 4).map((person) => (
                  <Avatar key={person.email} person={person} size={32} />
                ))}
              </div>
              <p className="min-w-0 flex-1 text-sm font-medium text-gray-700">
                Enviamos la invitación a {joinNames(companions.map(firstName))}
              </p>
            </div>
          ) : null}

          <div className="flex w-full flex-col gap-2">
            <p className="text-[11px] font-semibold text-gray-400">PRÓXIMOS PASOS</p>
            {NEXT_STEPS.map((step) => (
              <p key={step.text} className="flex items-center gap-2.5">
                <span className="text-[15px]">{step.icon}</span>
                <span className="text-sm text-gray-700">{step.text}</span>
              </p>
            ))}
          </div>

          <div className="flex w-full gap-3">
            <Link
              href="/dashboard/trips"
              className="flex flex-1 justify-center rounded-[10px] border border-gray-200 py-3 text-[15px] font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Ir a Mis viajes
            </Link>
            <Link
              href={`/dashboard/trips/${tripId}`}
              className="flex flex-1 justify-center rounded-[10px] bg-[#7386f5] py-3 text-[15px] font-semibold text-white transition hover:bg-[#5f70e0]"
            >
              Planificar viaje →
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
