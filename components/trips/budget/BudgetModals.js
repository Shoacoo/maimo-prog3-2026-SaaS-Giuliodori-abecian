"use client";

import { useState } from "react";
import { deleteExpenseAction, saveExpenseAction, setBudgetAction } from "@/app/dashboard/trips/actions";
import { CURRENCIES, EXPENSE_CATEGORIES, categoryForPlace, currencySymbol } from "@/lib/budget/categories";
import {
  CalendarIcon,
  Field,
  GhostButton,
  ModalHeader,
  ModalShell,
  PinIcon,
  PrimaryButton,
  Select,
  TrashIcon,
  inputClass,
} from "@/components/trips/memories/ui";

const dayFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });

// "Sáb 25 sep"
export function shortDay(date) {
  if (!date) return "";
  const text = dayFormatter.format(new Date(`${date}T00:00:00`)).replace(/\./g, "").replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ErrorBox({ children }) {
  if (!children) return null;
  return <p className="rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-500">{children}</p>;
}

function AmountInput({ value, onChange, currency, autoFocus, disabled }) {
  return (
    <span className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-sm text-gray-400">{currencySymbol(currency)}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ""))}
        inputMode="decimal"
        placeholder="0"
        autoFocus={autoFocus}
        disabled={disabled}
        className={`${inputClass} pl-12`}
      />
    </span>
  );
}

// "Definir presupuesto": cuanto piensan gastar en todo el viaje y en que moneda.
export function BudgetModal({ tripId, budget, onClose, onSaved }) {
  const [amount, setAmount] = useState(budget?.amount ? String(budget.amount) : "");
  const [currency, setCurrency] = useState(budget?.currency || "USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      onSaved(await setBudgetAction(tripId, { amount, currency }));
      onClose();
    } catch {
      setError("Ingresá un monto válido, mayor a cero.");
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} locked={busy} width="max-w-[480px]" label="Presupuesto del viaje">
      <div className="flex flex-col gap-5">
        <ModalHeader
          title={budget ? "Editar presupuesto" : "Definir presupuesto"}
          subtitle="¿Cuánto piensan gastar en todo el viaje?"
          onClose={onClose}
          locked={busy}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Presupuesto total">
            <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus disabled={busy} />
          </Field>
          <Field label="Moneda">
            <Select value={currency} onChange={setCurrency} disabled={busy}>
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-gray-500">Los gastos que anotes se van a mostrar en esta moneda.</p>
        <ErrorBox>{error}</ErrorBox>
        <div className="flex justify-end gap-3">
          <GhostButton onClick={onClose} disabled={busy}>
            Cancelar
          </GhostButton>
          <PrimaryButton onClick={handleSave} disabled={busy || !amount}>
            {busy ? "Guardando…" : "Guardar presupuesto"}
          </PrimaryButton>
        </div>
      </div>
    </ModalShell>
  );
}

// "Agregar gasto" (diseño 08b): descripcion, monto, fecha, categoria, la
// actividad del itinerario (opcional) y si ya esta pagado o es un estimado.
export function ExpenseModal({ tripId, tripName, expense, currency, dateList, activities, onClose, onSaved, onDeleted }) {
  const editing = Boolean(expense);
  const [title, setTitle] = useState(expense?.title || "");
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : "");
  const [date, setDate] = useState(expense?.date || "");
  const [category, setCategory] = useState(expense?.category || "actividades");
  const [activityId, setActivityId] = useState(expense?.activityId || "");
  const [paid, setPaid] = useState(expense ? Boolean(expense.paid) : false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  // Al elegir una actividad se completan el dia, la categoria y (si esta vacia) la descripcion.
  function chooseActivity(nextId) {
    setActivityId(nextId);
    const activity = activities.find((item) => item.id === nextId);
    if (!activity) return;
    setDate(activity.date);
    setCategory(categoryForPlace(activity.category));
    if (!title.trim()) setTitle(activity.name);
  }

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      const saved = await saveExpenseAction(tripId, {
        id: expense?.id,
        title,
        amount,
        date,
        category,
        activityId: activityId || null,
        paid,
      });
      onSaved(saved);
      onClose();
    } catch {
      setError(!title.trim() ? "Escribí una descripción del gasto." : "Revisá el monto: tiene que ser mayor a cero.");
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteExpenseAction(tripId, expense.id);
      onDeleted(expense.id);
      onClose();
    } catch {
      setError("No pudimos borrar el gasto.");
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} locked={busy} width="max-w-[600px]" label={editing ? "Editar gasto" : "Agregar gasto"}>
      <div className="flex flex-col gap-5">
        <ModalHeader
          title={editing ? "Editar gasto" : "Agregar gasto"}
          subtitle={`${tripName} · se suma al presupuesto del viaje`}
          onClose={onClose}
          locked={busy}
        />

        <Field label="Descripción">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            disabled={busy}
            autoFocus={!editing}
            placeholder="Ej: Entradas al museo"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Monto">
            <AmountInput value={amount} onChange={setAmount} currency={currency} disabled={busy} />
          </Field>
          <Field label="Fecha">
            <Select value={date} onChange={setDate} disabled={busy} icon={<CalendarIcon />}>
              <option value="">Sin fecha</option>
              {dateList.map((day) => (
                <option key={day} value={day}>
                  {shortDay(day)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-gray-900">Categoría</p>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                disabled={busy}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
                  category === option.id
                    ? "border-[#7386f5] bg-[#7386f5]/10 text-[#7386f5]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Actividad del itinerario" hint="(opcional)">
          <Select value={activityId} onChange={chooseActivity} disabled={busy || !activities.length} icon={<PinIcon size={15} />}>
            <option value="">{activities.length ? "Ninguna" : "Todavía no hay actividades en el itinerario"}</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name} · {shortDay(activity.date)}
              </option>
            ))}
          </Select>
        </Field>

        <ErrorBox>{error}</ErrorBox>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={paid}
                onChange={(event) => setPaid(event.target.checked)}
                disabled={busy}
                className="h-4 w-4 accent-[#7386f5]"
              />
              Ya está pagado
            </label>
            {editing ? (
              confirmDelete ? (
                <span className="flex items-center gap-2 text-[13px]">
                  <span className="text-gray-600">¿Borrar este gasto?</span>
                  <button type="button" onClick={handleDelete} disabled={busy} className="font-semibold text-red-500 hover:underline">
                    Sí, borrar
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className="text-gray-500 hover:underline">
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-left text-[13px] font-medium text-red-500 hover:underline"
                >
                  <TrashIcon size={14} />
                  Borrar gasto
                </button>
              )
            ) : null}
          </div>
          <div className="flex gap-3">
            <GhostButton onClick={onClose} disabled={busy}>
              Cancelar
            </GhostButton>
            <PrimaryButton onClick={handleSave} disabled={busy || !amount || !title.trim()}>
              {busy ? "Guardando…" : "Guardar gasto"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
