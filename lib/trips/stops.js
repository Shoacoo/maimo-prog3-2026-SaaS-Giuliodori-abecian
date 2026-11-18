import { computeStopDateRanges, distributeDays, listTripDates } from "@/lib/trips/dates";
import { getFlagUrl } from "@/lib/countries/flags";

// Cada parada (ciudad) del viaje con su bandera, coordenadas y dias. Lo usan
// Recuerdos (agrupar fotos y bitacora) y Souvenirs (buscar tiendas cerca).
export function buildStops(trip) {
  const dateList = trip.startDate && trip.endDate ? listTripDates(trip.startDate, trip.endDate) : [];
  const ranges = dateList.length
    ? computeStopDateRanges(trip.startDate, distributeDays(dateList.length, trip.destinations.length))
    : [];
  return trip.destinations.map((destination, index) => {
    const range = ranges[index];
    return {
      id: destination.id,
      name: destination.name,
      flagUrl: getFlagUrl(destination.countryCode, destination.country),
      lat: Number(destination.lat),
      lng: Number(destination.lng),
      startDate: range?.startDate || null,
      endDate: range?.endDate || null,
      dates: range ? listTripDates(range.startDate, range.endDate) : [],
    };
  });
}
