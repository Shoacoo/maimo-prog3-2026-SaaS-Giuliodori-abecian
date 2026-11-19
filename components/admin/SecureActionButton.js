"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import AdminIcon from "@/components/admin/icons";

const TONES = {
  danger: {
    button: "bg-red-50 text-red-600 hover:bg-red-100",
    icon: "bg-red-50 text-red-600",
    confirm: "bg-red-600 hover:bg-red-700",
  },
  primary: {
    button: "bg-[#7386f5]/10 text-[#5f70e0] hover:bg-[#7386f5]/20",
    icon: "bg-[#7386f5]/12 text-[#5f70e0]",
    confirm: "bg-[#7386f5] hover:bg-[#5f70e0]",
  },
  neutral: {
    button: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    icon: "bg-amber-50 text-amber-600",
    confirm: "bg-gray-900 hover:bg-black",
  },
};

// Boton de accion sensible del panel de admin. Al tocarlo abre un modal de
// confirmacion que explica la consecuencia y, si `requireText` esta definido,
// pide escribir ese texto (un email, el nombre del viaje o CONFIRMAR) para
// habilitar el boton final. El servidor vuelve a validar ese mismo texto.
export default function SecureActionButton({
  label,
  icon,
  tone = "neutral",
  title,
  description,
  consequences = [],
  requireText = null,
  requireHint = null,
  confirmLabel = "Confirmar",
  action,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef(null);
  const styles = TONES[tone] || TONES.neutral;

  const matches = !requireText || typed.trim().toLowerCase() === String(requireText).trim().toLowerCase();

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape" && !pending) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setOpen(false);
    setTyped("");
    setError("");
  }

  function confirm(event) {
    event.preventDefault();
    if (!matches || pending) return;
    setError("");
    startTransition(async () => {
      const result = await action(typed.trim()).catch(() => ({ error: "No se pudo completar la acción." }));
      if (result?.error) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition ${styles.button} ${
          compact ? "h-8 w-8 justify-center" : "h-8 px-3"
        }`}
      >
        {icon ? <AdminIcon name={icon} size={14} /> : null}
        {compact ? null : label}
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 px-4" onClick={() => !pending && close()}>
              <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="secure-action-title"
                onSubmit={confirm}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex gap-4 px-6 pt-6">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
                    <AdminIcon name={tone === "danger" ? "alert" : icon || "shield"} size={20} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="secure-action-title" className="text-lg font-semibold text-gray-900">
                      {title}
                    </h2>
                    {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
                  </div>
                </div>

                {consequences.length ? (
                  <ul className="mx-6 mt-4 grid gap-1.5 rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-700">
                    {consequences.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {requireText ? (
                  <label className="mx-6 mt-4 block">
                    <span className="block text-[13px] text-gray-600">
                      {requireHint || "Para confirmar, escribí"}{" "}
                      <span className="select-all rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-gray-900">
                        {requireText}
                      </span>
                    </span>
                    <input
                      ref={inputRef}
                      value={typed}
                      onChange={(event) => setTyped(event.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-[#7386f5] focus:bg-white focus:ring-1 focus:ring-[#7386f5]"
                    />
                  </label>
                ) : null}

                {error ? <p className="mx-6 mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p> : null}

                <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="h-10 rounded-full px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!matches || pending}
                    className={`h-10 rounded-full px-5 text-sm font-semibold text-white transition disabled:opacity-40 ${styles.confirm}`}
                  >
                    {pending ? "Procesando..." : confirmLabel}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
