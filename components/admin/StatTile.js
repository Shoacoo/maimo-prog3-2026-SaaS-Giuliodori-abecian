import AdminIcon from "@/components/admin/icons";

// Tarjeta de metrica del resumen: icono en un circulo del color de la metrica,
// numero grande y una linea de contexto opcional.
export default function StatTile({ label, value, hint, icon = "chart", color = "#7386F5" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <AdminIcon name={icon} size={20} />
        </span>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}
