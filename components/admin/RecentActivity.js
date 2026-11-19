import AdminIcon from "@/components/admin/icons";

const ACTIONS = {
  promote: { text: "hizo admin a", icon: "shield", color: "#7386F5" },
  demote: { text: "le quitó el rol de admin a", icon: "shieldOff", color: "#F5A524" },
  "delete-user": { text: "borró la cuenta de", icon: "trash", color: "#e34948" },
  "delete-trip": { text: "borró el viaje", icon: "trash", color: "#e34948" },
  "clear-stats": { text: "borró el historial de", icon: "eraser", color: "#9E5941" },
};

function timeAgo(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

// Ultimas acciones sensibles del panel (coleccion adminLog).
export default function RecentActivity({ items }) {
  if (!items.length) {
    return (
      <div className="px-5 py-10 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <AdminIcon name="clock" size={20} />
        </span>
        <p className="mt-3 text-sm text-gray-400">Todavía no hay acciones registradas.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-50">
      {items.map((item) => {
        const meta = ACTIONS[item.action] || { text: item.action, icon: "list", color: "#898781" };
        return (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
            >
              <AdminIcon name={meta.icon} size={15} />
            </span>
            <p className="min-w-0 flex-1 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{item.adminEmail || "Un admin"}</span> {meta.text}{" "}
              <span className="font-medium text-gray-900">{item.targetLabel || "—"}</span>
              <span className="mt-0.5 block text-xs text-gray-400">{timeAgo(item.createdAt)}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
