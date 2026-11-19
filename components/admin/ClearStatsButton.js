"use client";

import { clearPlaceEventsAction } from "@/app/admin/actions";
import SecureActionButton from "@/components/admin/SecureActionButton";
import { CONFIRM_WORD } from "@/lib/admin/confirm";

export default function ClearStatsButton() {
  return (
    <SecureActionButton
      label="Borrar historial"
      icon="eraser"
      tone="danger"
      title="¿Borrar el historial de estadísticas?"
      description="Se eliminan todas las búsquedas y lugares registrados. Los gráficos de lugares quedan vacíos."
      consequences={["No afecta los viajes ni los itinerarios de los usuarios.", "Esta acción no se puede deshacer."]}
      requireText={CONFIRM_WORD}
      confirmLabel="Borrar historial"
      action={clearPlaceEventsAction}
    />
  );
}
