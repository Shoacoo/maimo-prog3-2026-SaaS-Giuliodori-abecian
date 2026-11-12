function Stat({ value, label }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xl font-bold leading-tight text-gray-900">{value}</span>
      <span className="truncate text-xs text-gray-500">{label}</span>
    </div>
  );
}

// La tarjeta usa container queries (@container): segun el ancho que le queda
// al lado del mapa, los numeros van en 2x2 o en una sola fila, sin pisarse.
export default function PlanningCard({ progress, favoritesCount }) {
  return (
    <div className="@container flex w-full flex-col gap-4 rounded-2xl bg-white px-5.5 pb-5.5 pt-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold leading-snug text-gray-900">Progreso de planificación</p>
        <p className="shrink-0 text-base font-bold text-[#7386f5]">{progress.percent}%</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-[5px] bg-gray-100">
        <div className="h-full rounded-[5px] bg-lime-400" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 @sm:grid-cols-4">
        <Stat value={`${progress.activities}/${progress.target}`} label="Actividades" />
        <Stat value={progress.days} label={progress.days === 1 ? "Día" : "Días"} />
        <Stat value={progress.stopCount} label={progress.stopCount === 1 ? "Ciudad" : "Ciudades"} />
        <Stat value={favoritesCount} label={favoritesCount === 1 ? "Favorito" : "Favoritos"} />
      </div>
    </div>
  );
}
