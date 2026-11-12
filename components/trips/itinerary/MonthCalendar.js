"use client";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function isoOf(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Vista mensual del calendario (diseño 05d): dias del viaje con su ciudad y
// un punto por actividad; los dias sin actividades se marcan "sin plan".
export default function MonthCalendar({ month, dateList, itinerary, cityByDate, selectedDate, onSelect }) {
  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(year, monthIndex - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const tripDays = new Set(dateList);
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-1 text-center text-[11px] font-medium text-gray-400">
            {day}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} className="h-16 rounded-lg bg-gray-50/60" />;
          const iso = isoOf(year, monthIndex - 1, day);
          const inTrip = tripDays.has(iso);
          const selected = iso === selectedDate;
          const count = itinerary[iso]?.length || 0;

          if (!inTrip) {
            return (
              <span key={iso} className="h-16 rounded-lg bg-gray-50 p-1.5 text-[11px] text-gray-400">
                {day}
              </span>
            );
          }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`flex h-16 flex-col items-start rounded-lg p-1.5 text-left transition ${
                selected ? "bg-[#7386f5] text-white" : "bg-[#7386f5]/10 text-gray-700 hover:bg-[#7386f5]/20"
              }`}
            >
              <span className={`text-[11px] font-semibold ${selected ? "text-white" : "text-[#7386f5]"}`}>{day}</span>
              {cityByDate[iso] ? (
                <span className={`w-full truncate text-[10px] ${selected ? "text-white/90" : "text-gray-700"}`}>
                  {cityByDate[iso].name}
                </span>
              ) : null}
              {count > 0 ? (
                <span className="mt-auto flex gap-0.5">
                  {Array.from({ length: Math.min(count, 5) }, (_, dot) => (
                    <span key={dot} className={`h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-[#7386f5]"}`} />
                  ))}
                </span>
              ) : (
                <span className={`mt-auto text-[9px] ${selected ? "text-white/80" : "text-red-500"}`}>sin plan</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7386f5]" /> Días del viaje
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Días sin actividades
        </span>
      </div>
    </div>
  );
}
