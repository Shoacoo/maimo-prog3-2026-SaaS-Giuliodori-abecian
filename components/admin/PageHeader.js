import AdminIcon from "@/components/admin/icons";

// Encabezado de cada seccion del panel: icono, titulo, descripcion y acciones.
export default function PageHeader({ icon, title, description, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7386f5] text-white shadow-md shadow-[#7386f5]/30">
          <AdminIcon name={icon} size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description ? <p className="mt-0.5 text-sm text-gray-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

// Tarjeta blanca con titulo para tablas y bloques del panel.
export function SectionCard({ icon, title, subtitle, action, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <span className="text-[#7386f5]">
                <AdminIcon name={icon} size={18} />
              </span>
            ) : null}
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
              {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
            </div>
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyRow({ colSpan, icon = "search", text }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <AdminIcon name={icon} size={20} />
        </span>
        <p className="mt-3 text-sm text-gray-400">{text}</p>
      </td>
    </tr>
  );
}
