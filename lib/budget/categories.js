// Categorias y monedas del presupuesto del viaje. Se usa en el servidor
// (validacion) y en el navegador (pantallas), por eso no importa nada de
// Firebase.

export const EXPENSE_CATEGORIES = [
  { id: "alojamiento", label: "Alojamiento", emoji: "🏨", color: "#7386f5" },
  { id: "transporte", label: "Transporte", emoji: "🚆", color: "#1e3a8a" },
  { id: "comida", label: "Comida", emoji: "🍜", color: "#7CBE66" },
  { id: "actividades", label: "Actividades", emoji: "🎟️", color: "#9E5941" },
  { id: "compras", label: "Compras", emoji: "🛍️", color: "#E7C9A0" },
  { id: "otros", label: "Otros", emoji: "📦", color: "#9CA3AF" },
];

export const CATEGORY_BY_ID = Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category.id, category]));

export const CURRENCIES = [
  { code: "USD", label: "Dólar (US$)" },
  { code: "ARS", label: "Peso argentino ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "BRL", label: "Real (R$)" },
  { code: "CLP", label: "Peso chileno" },
  { code: "UYU", label: "Peso uruguayo" },
  { code: "MXN", label: "Peso mexicano" },
  { code: "GBP", label: "Libra (£)" },
  { code: "JPY", label: "Yen (¥)" },
];

export const CURRENCY_CODES = new Set(CURRENCIES.map((currency) => currency.code));
export const DEFAULT_CURRENCY = "USD";

// "US$ 3.000", "$ 15.500,50", "€ 40"
export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

// Prefijo corto de la moneda para el campo de monto ("US$", "$", "€").
export function currencySymbol(currency = DEFAULT_CURRENCY) {
  try {
    const parts = new Intl.NumberFormat("es-AR", { style: "currency", currency }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value || currency;
  } catch {
    return currency;
  }
}

// Categoria sugerida para un gasto a partir del tipo de lugar del itinerario
// ("Hotel", "Restaurante", ...: ver CATEGORY_LABELS en lib/places/nearby).
export function categoryForPlace(placeCategory) {
  const value = String(placeCategory || "").toLowerCase();
  if (value.includes("hotel")) return "alojamiento";
  if (value.includes("restaurante") || value.includes("bar") || value.includes("cafe")) return "comida";
  if (value.includes("tienda")) return "compras";
  return "actividades";
}
