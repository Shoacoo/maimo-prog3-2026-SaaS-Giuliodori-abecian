"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import UserAvatar from "@/components/profile/UserAvatar";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#7386f5] focus:bg-white focus:ring-1 focus:ring-[#7386f5]";

// Ventana "Editar perfil": todos los datos juntos (como en una red social),
// ademas de la edicion en el lugar.
export default function EditProfileModal({ data, avatarUrl, email, currencies, currencyLabels, onSave, onPickPhoto, onClose }) {
  const [draft, setDraft] = useState(data);
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update(field) {
    return (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    if (draft.displayName.trim().length < 2) {
      setError("El nombre tiene que tener al menos 2 letras.");
      return;
    }
    onSave({ ...draft, displayName: draft.displayName.trim() });
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/40 px-4 py-6" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="edit-profile-title" className="text-lg font-semibold text-gray-900">
            Editar perfil
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <UserAvatar src={avatarUrl} name={draft.displayName || email} size={64} />
            <button type="button" onClick={onPickPhoto} className="text-sm font-semibold text-[#5f70e0] hover:underline">
              Cambiar foto
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Nombre</span>
            <input ref={firstRef} value={draft.displayName} onChange={update("displayName")} maxLength={60} className={`mt-1.5 ${inputClass}`} />
          </label>

          <label className="block">
            <span className="flex justify-between text-sm font-medium text-gray-700">
              Sobre vos <span className="text-xs font-normal text-gray-400">{draft.bio.length}/280</span>
            </span>
            <textarea
              value={draft.bio}
              onChange={update("bio")}
              maxLength={280}
              rows={3}
              placeholder="Qué tipo de viajes te gustan, a dónde querés ir…"
              className={`mt-1.5 ${inputClass} h-auto resize-none py-2.5`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Ciudad</span>
              <input value={draft.homeCity} onChange={update("homeCity")} maxLength={60} placeholder="Buenos Aires" className={`mt-1.5 ${inputClass}`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">País</span>
              <input value={draft.homeCountry} onChange={update("homeCountry")} maxLength={60} placeholder="Argentina" className={`mt-1.5 ${inputClass}`} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Moneda preferida</span>
            <select value={draft.currency} onChange={update("currency")} className={`mt-1.5 ${inputClass}`}>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {currencyLabels[code] || code} ({code})
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-gray-400">El email ({email}) no se puede cambiar desde acá.</p>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-full px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button type="submit" className="h-10 rounded-full bg-[#7386f5] px-5 text-sm font-semibold text-white transition hover:bg-[#5f70e0]">
            Guardar
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
