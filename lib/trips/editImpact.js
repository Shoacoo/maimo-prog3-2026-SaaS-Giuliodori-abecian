import { listTripDates } from "@/lib/trips/dates";

// Reglas para editar un viaje sin perder datos en silencio. Las usa el modal
// (para avisar antes de guardar) y el servidor (para aplicarlas), asi los dos
// calculan exactamente lo mismo.

// Como se reubica cada fecha vieja cuando cambian las fechas del viaje:
// - Si el viaje dura lo mismo, todo se corre en bloque (dia 1 -> nuevo dia 1).
// - Si cambia la duracion, los dias que siguen dentro del rango quedan igual y
//   los que quedan afuera pasan al primer o al ultimo dia del viaje.
export function buildDateMapper(oldStart, oldEnd, newStart, newEnd) {
  const oldDates = oldStart && oldEnd ? listTripDates(oldStart, oldEnd) : [];
  const newDates = newStart && newEnd ? listTripDates(newStart, newEnd) : [];
  const sameLength = oldDates.length > 0 && oldDates.length === newDates.length;
  const shifted = sameLength && oldStart !== newStart;

  function map(date) {
    if (!date || !newDates.length) return date;
    if (sameLength) {
      const index = oldDates.indexOf(date);
      if (index !== -1) return newDates[index];
    }
    if (date < newDates[0]) return newDates[0];
    if (date > newDates[newDates.length - 1]) return newDates[newDates.length - 1];
    return date;
  }

  return { map, shifted, newDates };
}

// Que pasaria con los datos del viaje si se guardan estos cambios.
export function editImpact(trip, { startDate, endDate, destinationIds }) {
  const { map, shifted } = buildDateMapper(trip.startDate, trip.endDate, startDate, endDate);

  let movedActivities = 0;
  // El itinerario puede venir completo ({ fecha: [actividades] }) o resumido
  // ({ fecha: cantidad }), que es lo que recibe el modal.
  for (const [date, items] of Object.entries(trip.itinerary || {})) {
    const count = Array.isArray(items) ? items.length : Number(items) || 0;
    if (count && !shifted && map(date) !== date) movedActivities += count;
  }

  const kept = new Set(destinationIds);
  const removedCities = (trip.destinations || [])
    .filter((destination) => !kept.has(destination.id))
    .map((destination) => {
      const photos = (trip.memoryPhotos || []).filter((photo) => photo.cityId === destination.id).length;
      const entries = (trip.memoryEntries || []).filter((entry) => entry.cityId === destination.id).length;
      return { id: destination.id, name: destination.name, photos, entries };
    });

  return {
    shifted,
    movedActivities,
    removedCities,
    // Una ciudad con fotos o entradas de Recuerdos no se puede quitar: esas
    // fotos quedarian sin ciudad. Primero hay que moverlas o borrarlas.
    blockedCities: removedCities.filter((city) => city.photos || city.entries),
  };
}

// Datos minimos del viaje que necesita el modal (sin mandar el viaje entero
// al navegador): itinerario resumido por cantidad y las ciudades de Recuerdos.
export function editableTrip(trip) {
  return {
    id: trip.id,
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    destinations: trip.destinations,
    itinerary: Object.fromEntries(
      Object.entries(trip.itinerary || {}).map(([date, items]) => [date, items?.length || 0]),
    ),
    memoryPhotos: (trip.memoryPhotos || []).map((photo) => ({ cityId: photo.cityId })),
    memoryEntries: (trip.memoryEntries || []).map((entry) => ({ cityId: entry.cityId })),
  };
}
