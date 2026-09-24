import { totalTripDays, distributeDays, computeStopDateRanges, daysUntil } from "@/lib/trips/dates";
import { getFlagUrl } from "@/lib/countries/flags";

export function getNextDestination(trip) {
  const days = totalTripDays(trip.startDate, trip.endDate);
  const dayCounts = distributeDays(days, trip.destinations.length);
  const stopRanges = computeStopDateRanges(trip.startDate, dayCounts);
  const today = new Date().toISOString().slice(0, 10);
  const nextIndex = stopRanges.findIndex((range) => range.endDate >= today);
  const nextStop = nextIndex >= 0 ? trip.destinations[nextIndex] : null;

  if (!nextStop) {
    return null;
  }

  return {
    index: nextIndex,
    name: nextStop.name,
    image: nextStop.image,
    flagUrl: getFlagUrl(nextStop.countryCode, nextStop.country),
    daysUntil: daysUntil(today, stopRanges[nextIndex].startDate),
  };
}
