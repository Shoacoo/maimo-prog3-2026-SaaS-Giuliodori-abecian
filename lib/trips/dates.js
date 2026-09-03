function toUTCDays(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function totalTripDays(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toUTCDays(endDate) - toUTCDays(startDate)) / msPerDay) + 1;
}

export function distributeDays(totalDays, stopCount) {
  if (stopCount <= 0) {
    return [];
  }

  const base = Math.floor(totalDays / stopCount);
  const remainder = totalDays % stopCount;

  return Array.from({ length: stopCount }, (_, index) =>
    index >= stopCount - remainder ? base + 1 : base,
  );
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dayFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric" });
  const monthYearFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${dayFormatter.format(start)} - ${dayFormatter.format(end)} de ${capitalize(monthYearFormatter.format(end))}`;
  }

  const fullFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });
  return `${fullFormatter.format(start)} - ${fullFormatter.format(end)}`;
}
