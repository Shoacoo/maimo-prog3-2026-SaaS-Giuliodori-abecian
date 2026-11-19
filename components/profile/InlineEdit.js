"use client";

import { useEffect, useRef, useState } from "react";

export function PencilIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

const fieldClass =
  "w-full rounded-lg border border-[#7386f5] bg-white px-2.5 py-1.5 text-gray-900 outline-none ring-2 ring-[#7386f5]/15";

// Texto del perfil que se edita en el lugar, como en una red social: al pasar
// el mouse aparece un lapiz; al tocar se convierte en campo. Enter (o el
// tilde) guarda y Esc (o la cruz) cancela.
//
// `renderView(value)` dibuja el texto; `fields` describe uno o mas campos que
// se editan juntos (por ejemplo ciudad + pais).
export default function InlineEdit({
  value,
  fields,
  onSave,
  renderView,
  placeholder,
  label,
  className = "",
  multiline = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const firstRef = useRef(null);

  useEffect(() => {
    if (editing) firstRef.current?.focus();
  }, [editing]);

  function start() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function commit() {
    setEditing(false);
    const changed = fields.some((field) => (draft[field.key] || "") !== (value[field.key] || ""));
    if (changed) onSave(draft);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && !(multiline && event.shiftKey)) {
      event.preventDefault();
      commit();
    }
  }

  if (editing) {
    return (
      <div className={`flex items-start gap-1.5 ${className}`}>
        <div className={`grid flex-1 gap-1.5 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {fields.map((field, index) => {
            const common = {
              ref: index === 0 ? firstRef : undefined,
              value: draft[field.key] || "",
              onChange: (event) => setDraft((current) => ({ ...current, [field.key]: event.target.value })),
              onKeyDown,
              "aria-label": field.label,
              placeholder: field.placeholder,
              maxLength: field.maxLength,
              className: `${fieldClass} ${field.className || ""}`,
            };
            if (field.options) {
              return (
                <select key={field.key} {...common}>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              );
            }
            return multiline ? <textarea key={field.key} rows={3} {...common} className={`${common.className} resize-none`} /> : <input key={field.key} {...common} />;
          })}
          {multiline && fields[0].maxLength ? (
            <span className="text-right text-[11px] text-gray-400">
              {(draft[fields[0].key] || "").length}/{fields[0].maxLength} · Enter para guardar, Shift+Enter para otra línea
            </span>
          ) : null}
        </div>
        <button type="button" onClick={commit} aria-label="Guardar" className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7386f5] text-white transition hover:bg-[#5f70e0]">
          <CheckIcon />
        </button>
        <button type="button" onClick={cancel} aria-label="Cancelar" className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200">
          <CloseIcon />
        </button>
      </div>
    );
  }

  const empty = fields.every((field) => !value[field.key]);
  return (
    <button
      type="button"
      onClick={start}
      title={`Editar ${label}`}
      className={`group inline-flex max-w-full items-start gap-1.5 rounded-lg px-1 -mx-1 text-left transition hover:bg-gray-50 ${className}`}
    >
      <span className="min-w-0">{empty ? <span className="italic text-gray-400">{placeholder}</span> : renderView(value)}</span>
      {/* El lapiz siempre se ve (tenue) para que se note que se puede editar. */}
      <span className="mt-1 shrink-0 text-gray-300 transition group-hover:text-[#7386f5] group-focus-visible:text-[#7386f5]">
        <PencilIcon />
      </span>
    </button>
  );
}
