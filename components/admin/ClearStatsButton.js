"use client";

import { clearPlaceEventsAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";

export default function ClearStatsButton() {
  return (
    <ConfirmButton
      action={clearPlaceEventsAction}
      label="Borrar historial de estadisticas"
      confirmLabel="Si, borrar todo"
      pendingLabel="Borrando..."
      className="shrink-0"
    />
  );
}
