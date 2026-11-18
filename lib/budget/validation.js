import { CATEGORY_BY_ID, CURRENCY_CODES, DEFAULT_CURRENCY, categoryForPlace } from "@/lib/budget/categories";
import { listTripDates } from "@/lib/trips/dates";

// Validacion en servidor del presupuesto y los gastos. Nunca se confia en el
// nombre de la actividad que manda el navegador: se toma del itinerario.

const MAX_AMOUNT = 1_000_000_000;

function cleanAmount(value) {
  const amount = Math.round(Number(String(value ?? "").replace(",", ".")) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new Error("Ingresá un monto válido.");
  }
  return amount;
}

function cleanText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

export function sanitizeBudget({ amount, currency }) {
  return {
    amount: cleanAmount(amount),
    currency: CURRENCY_CODES.has(currency) ? currency : DEFAULT_CURRENCY,
  };
}

// Busca una actividad del itinerario por id: devuelve el lugar y su dia.
export function findActivity(trip, activityId) {
  if (!activityId) return null;
  for (const [date, items] of Object.entries(trip.itinerary || {})) {
    const item = (items || []).find((entry) => entry.id === activityId);
    if (item) return { ...item, date };
  }
  return null;
}

function cleanDate(trip, date) {
  if (!date) return null;
  const dates = trip.startDate && trip.endDate ? listTripDates(trip.startDate, trip.endDate) : [];
  return dates.includes(date) ? date : null;
}

export function sanitizeExpense(trip, input) {
  const activity = findActivity(trip, input?.activityId ? String(input.activityId) : null);
  const title = cleanText(input?.title, 80) || activity?.name || "";
  if (!title) {
    throw new Error("Escribí una descripción del gasto.");
  }
  const category = CATEGORY_BY_ID[input?.category] ? input.category : activity ? categoryForPlace(activity.category) : "otros";
  return {
    title,
    amount: cleanAmount(input?.amount),
    category,
    date: cleanDate(trip, input?.date) || activity?.date || null,
    activityId: activity?.id || null,
    activityName: activity?.name || null,
    paid: Boolean(input?.paid),
  };
}
