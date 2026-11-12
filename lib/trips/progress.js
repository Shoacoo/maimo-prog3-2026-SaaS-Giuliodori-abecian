import { totalTripDays, distributeDays, computeStopDateRanges, listTripDates } from "@/lib/trips/dates";

// Progreso de planificacion (diseño 04): la meta es una actividad por dia mas
// una por parada, y cada parada aporta sus dias + 1 a esa meta. Las
// actividades cuentan para la parada que "es dueña" de esa fecha.
export function planningProgress(trip) {
  const days = trip.startDate && trip.endDate ? totalTripDays(trip.startDate, trip.endDate) : 0;
  const stopCount = trip.destinations.length;
  const dayCounts = distributeDays(days, stopCount);
  const ranges = days ? computeStopDateRanges(trip.startDate, dayCounts) : [];
  const itinerary = trip.itinerary || {};

  const stops = trip.destinations.map((destination, index) => {
    const dates = ranges[index] ? listTripDates(ranges[index].startDate, ranges[index].endDate) : [];
    const done = dates.reduce((sum, date) => sum + (itinerary[date]?.length || 0), 0);
    return { id: destination.id, done, target: (dayCounts[index] || 0) + 1 };
  });

  const activities = Object.values(itinerary).reduce((sum, items) => sum + (items?.length || 0), 0);
  const target = days + stopCount;

  return {
    days,
    stopCount,
    activities,
    target,
    percent: target ? Math.min(100, Math.round((activities / target) * 100)) : 0,
    stops,
  };
}

export function itineraryPlaceIds(trip) {
  return new Set(
    Object.values(trip.itinerary || {})
      .flat()
      .map((item) => item?.placeId)
      .filter(Boolean),
  );
}

// Datos que necesitan los controles "Agregar al itinerario" de cualquier
// pantalla del viaje: ciudad de cada dia, que lugares hay en cada dia y los
// favoritos guardados.
export function buildTripPlan(trip) {
  const dateList = trip.startDate && trip.endDate ? listTripDates(trip.startDate, trip.endDate) : [];
  const dayCounts = distributeDays(dateList.length, trip.destinations.length);
  const ranges = dateList.length ? computeStopDateRanges(trip.startDate, dayCounts) : [];
  const cityByDate = {};
  ranges.forEach((range, index) => {
    listTripDates(range.startDate, range.endDate).forEach((date) => {
      cityByDate[date] = trip.destinations[index]?.name || null;
    });
  });

  const itinerary = Object.fromEntries(
    Object.entries(trip.itinerary || {}).map(([date, items]) => [
      date,
      (items || []).map((item) => ({ id: item.id, placeId: item.placeId })),
    ]),
  );

  return {
    tripId: trip.id,
    dateList,
    cityByDate,
    itinerary,
    favoriteIds: (trip.favorites || []).map((place) => place.placeId),
  };
}
