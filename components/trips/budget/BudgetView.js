"use client";

import { useMemo, useState } from "react";
import { CATEGORY_BY_ID, DEFAULT_CURRENCY, EXPENSE_CATEGORIES, formatMoney } from "@/lib/budget/categories";
import { BudgetModal, ExpenseModal, shortDay } from "@/components/trips/budget/BudgetModals";
import { PinIcon, PrimaryButton, SecondaryButton } from "@/components/trips/memories/ui";

const rangeFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });

function sum(list) {
  return list.reduce((total, expense) => total + (Number(expense.amount) || 0), 0);
}

function Card({ children, className = "" }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2.5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Resumen del diseño 08: presupuesto (con barra), lo pagado y por persona.
function Summary({ budget, currency, expenses, travelers, onEditBudget }) {
  const total = sum(expenses);
  const paid = sum(expenses.filter((expense) => expense.paid));
  const estimated = total - paid;
  const paidCount = expenses.filter((expense) => expense.paid).length;
  const percent = budget?.amount ? Math.round((total / budget.amount) * 100) : 0;
  const over = budget?.amount ? total > budget.amount : false;

  return (
    <div className="@container">
      <div className="grid gap-4 @2xl:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-500">Presupuesto total</p>
            <button type="button" onClick={onEditBudget} className="inline-flex items-center gap-1 text-xs font-medium text-[#7386f5] hover:underline">
              <PencilIcon />
              {budget ? "Editar" : "Definir"}
            </button>
          </div>
          {budget ? (
            <>
              <p className="text-[30px] font-bold leading-tight text-gray-900">{formatMoney(budget.amount, currency)}</p>
              <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
                <div
                  className={`h-full rounded transition-all ${over ? "bg-red-500" : "bg-[#7386f5]"}`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <p className={`text-[13px] ${over ? "font-medium text-red-500" : "text-gray-500"}`}>
                {over
                  ? `Te pasaste por ${formatMoney(total - budget.amount, currency)} (${percent}%)`
                  : `${formatMoney(total, currency)} anotados (${percent}%) · quedan ${formatMoney(budget.amount - total, currency)}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-[30px] font-bold leading-tight text-gray-300">Sin definir</p>
              <p className="text-[13px] text-gray-500">Definí cuánto piensan gastar para ver cuánto les queda.</p>
            </>
          )}
        </Card>

        <Card>
          <p className="text-sm text-gray-500">Ya pagado</p>
          <p className="text-[30px] font-bold leading-tight text-gray-900">{formatMoney(paid, currency)}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
              {paidCount} {paidCount === 1 ? "pagado" : "pagados"}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
              {formatMoney(estimated, currency)} estimado
            </span>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-gray-500">Por persona</p>
          <p className="text-[30px] font-bold leading-tight text-gray-900">{formatMoney(Math.round(total / travelers), currency)}</p>
          <p className="text-[13px] text-gray-500">
            {travelers === 1 ? "Viajás solo/a" : `Total dividido entre ${travelers} viajeros`}
          </p>
        </Card>
      </div>
    </div>
  );
}

// "Por categoría": barra apilada y el total de cada categoría con su porcentaje.
function ByCategory({ expenses, currency }) {
  const total = sum(expenses);
  const rows = EXPENSE_CATEGORIES.map((category) => {
    const amount = sum(expenses.filter((expense) => expense.category === category.id));
    return { ...category, amount, percent: total ? Math.round((amount / total) * 100) : 0 };
  })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <p className="text-base font-semibold text-gray-900">Por categoría</p>
      {rows.length ? (
        <>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            {rows.map((row) => (
              <span key={row.id} title={`${row.label}: ${row.percent}%`} style={{ width: `${(row.amount / total) * 100}%`, backgroundColor: row.color }} />
            ))}
          </div>
          <ul className="mt-1 flex flex-col gap-2.5">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="min-w-0 flex-1 truncate text-gray-700">
                  {row.emoji} {row.label}
                </span>
                <span className="font-semibold text-gray-900">{formatMoney(row.amount, currency)}</span>
                <span className="w-10 text-right text-xs text-gray-400">{row.percent}%</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-gray-400">Cuando anotes gastos vas a ver cuánto va a cada categoría.</p>
      )}
    </Card>
  );
}

// "Por día": cuanto se gasto cada dia del viaje (barras horizontales).
function ByDay({ expenses, currency, dateList }) {
  const rows = dateList.map((date) => ({ date, amount: sum(expenses.filter((expense) => expense.date === date)) }));
  const undated = sum(expenses.filter((expense) => !expense.date));
  const max = Math.max(...rows.map((row) => row.amount), undated, 1);

  return (
    <Card>
      <p className="text-base font-semibold text-gray-900">Por día</p>
      {expenses.length ? (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
          {[...rows, ...(undated ? [{ date: null, amount: undated }] : [])].map((row) => (
            <li key={row.date || "sin-fecha"} className="flex items-center gap-3 text-[13px]">
              <span className="w-20 shrink-0 text-gray-500">{row.date ? shortDay(row.date) : "Sin fecha"}</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span className="block h-full rounded-full bg-[#7386f5]" style={{ width: `${(row.amount / max) * 100}%` }} />
              </span>
              <span className={`w-24 shrink-0 text-right font-medium ${row.amount ? "text-gray-900" : "text-gray-300"}`}>
                {formatMoney(row.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Acá vas a ver cuánto gastan cada día del viaje.</p>
      )}
    </Card>
  );
}

function ExpenseRow({ expense, currency, onEdit }) {
  const category = CATEGORY_BY_ID[expense.category] || CATEGORY_BY_ID.otros;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition hover:bg-gray-50"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: `${category.color}26` }}
        aria-hidden="true"
      >
        {category.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">{expense.title}</span>
        <span className="flex items-center gap-1 truncate text-xs text-gray-500">
          {category.label}
          {expense.activityName ? (
            <>
              <span>·</span>
              <PinIcon size={11} />
              <span className="truncate">{expense.activityName}</span>
            </>
          ) : null}
        </span>
      </span>
      <span
        className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${
          expense.paid ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"
        }`}
      >
        {expense.paid ? "Pagado" : "Estimado"}
      </span>
      <span className="w-24 shrink-0 text-right text-[15px] font-semibold text-gray-900">{formatMoney(expense.amount, currency)}</span>
      <span className="shrink-0 text-gray-300">
        <PencilIcon />
      </span>
    </button>
  );
}

// Presupuesto del viaje (diseño 08): cuanto piensan gastar, lo que van
// anotando (pagado o estimado, por actividad o suelto) y el resumen por
// categoria y por dia.
export default function BudgetView({ tripId, route, startDate, endDate, travelers, dateList, activities, initialBudget, initialExpenses }) {
  const [budget, setBudget] = useState(initialBudget);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [filter, setFilter] = useState("all");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editor, setEditor] = useState(null); // { expense } | null
  const currency = budget?.currency || DEFAULT_CURRENCY;

  const subtitle = [
    route,
    startDate && endDate
      ? `${rangeFormatter.format(new Date(`${startDate}T00:00:00`))} al ${rangeFormatter.format(new Date(`${endDate}T00:00:00`))}`
      : null,
    `${travelers} ${travelers === 1 ? "viajero" : "viajeros"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const visible = filter === "all" ? expenses : expenses.filter((expense) => expense.category === filter);
  const groups = useMemo(() => {
    const byDate = new Map();
    [...visible]
      .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.createdAt || "").localeCompare(b.createdAt || ""))
      .forEach((expense) => {
        const key = expense.date || "";
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push(expense);
      });
    return [...byDate.entries()];
  }, [visible]);
  const usedCategories = EXPENSE_CATEGORIES.filter((category) => expenses.some((expense) => expense.category === category.id));

  function upsert(saved) {
    setExpenses((current) =>
      current.some((item) => item.id === saved.id) ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved],
    );
  }

  const modals = (
    <>
      {budgetOpen ? <BudgetModal tripId={tripId} budget={budget} onClose={() => setBudgetOpen(false)} onSaved={setBudget} /> : null}
      {editor ? (
        <ExpenseModal
          tripId={tripId}
          tripName={route}
          expense={editor.expense}
          currency={currency}
          dateList={dateList}
          activities={activities}
          onClose={() => setEditor(null)}
          onSaved={upsert}
          onDeleted={(id) => setExpenses((current) => current.filter((item) => item.id !== id))}
        />
      ) : null}
    </>
  );

  const header = (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Presupuesto del viaje</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );

  // Estado vacio (diseño 08c): sin presupuesto ni gastos.
  if (!budget && !expenses.length) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-gray-300 px-6 py-14 text-center">
          <span className="text-4xl" aria-hidden="true">
            💸
          </span>
          <p className="text-lg font-semibold text-gray-900">Sin gastos :(</p>
          <p className="max-w-md text-sm text-gray-500">
            Definí cuánto piensan gastar y anotá lo que van gastando en cada actividad. Triphy te muestra cuánto les queda y en qué se
            va la plata.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <SecondaryButton onClick={() => setBudgetOpen(true)}>Definir presupuesto</SecondaryButton>
            <PrimaryButton onClick={() => setEditor({ expense: null })}>Agregar gasto +</PrimaryButton>
          </div>
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      <Summary budget={budget} currency={currency} expenses={expenses} travelers={travelers} onEditBudget={() => setBudgetOpen(true)} />

      <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-2">
          <ByCategory expenses={expenses} currency={currency} />
          <ByDay expenses={expenses} currency={currency} dateList={dateList} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-xl font-semibold text-gray-900">Gastos</h2>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
              filter === "all" ? "bg-[#7386f5] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {usedCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFilter(category.id)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                filter === category.id ? "bg-[#7386f5] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {category.emoji} {category.label}
            </button>
          ))}
          <PrimaryButton onClick={() => setEditor({ expense: null })} className="ml-2">
            Agregar gasto +
          </PrimaryButton>
        </div>

        {groups.length ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {groups.map(([date, items]) => (
              <div key={date || "sin-fecha"} className="border-b border-gray-100 py-2 last:border-b-0">
                <div className="flex items-center justify-between px-5 pb-1 pt-2 text-xs">
                  <span className="font-semibold text-gray-700">{date ? shortDay(date) : "Sin fecha"}</span>
                  <span className="text-gray-400">Total del día {formatMoney(sum(items), currency)}</span>
                </div>
                {items.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} currency={currency} onEdit={() => setEditor({ expense })} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
            {expenses.length ? "No hay gastos en esta categoría." : "Todavía no anotaste gastos. Tocá “Agregar gasto +”."}
          </p>
        )}
      </div>

      {modals}
    </div>
  );
}
