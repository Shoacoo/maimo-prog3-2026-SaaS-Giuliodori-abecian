function Stat({ value, label }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function PlanningCard({ progress, favoritesCount }) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-2xl bg-white px-5.5 pb-5.5 pt-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-base font-semibold text-gray-900">Progreso de planificación</p>
        <p className="text-base font-bold text-[#7386f5]">{progress.percent}%</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-[5px] bg-gray-100">
        <div className="h-full rounded-[5px] bg-lime-400" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="flex items-start justify-between">
        <Stat value={`${progress.activities}/${progress.target}`} label="Actividades" />
        <Stat value={progress.days} label={progress.days === 1 ? "día" : "días"} />
        <Stat value={progress.stopCount} label={progress.stopCount === 1 ? "ciudad" : "ciudades"} />
        <Stat value={favoritesCount} label="favoritos" />
      </div>
    </div>
  );
}
