"use client";

import { useState, useTransition } from "react";

// Generic 2-step confirm for destructive admin actions: first click arms it,
// a second click within the same render actually runs `action`. Clicking
// anywhere else (via onBlur) disarms it again.
export default function ConfirmButton({ action, label, confirmLabel = "Confirmar", pendingLabel = "...", className = "" }) {
  const [armed, setArmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!armed) {
      setArmed(true);
      return;
    }

    startTransition(async () => {
      await action();
      setArmed(false);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setArmed(false)}
      disabled={isPending}
      className={`${className} ${
        armed
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-red-50 text-red-600 hover:bg-red-100"
      } rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60`}
    >
      {isPending ? pendingLabel : armed ? confirmLabel : label}
    </button>
  );
}
