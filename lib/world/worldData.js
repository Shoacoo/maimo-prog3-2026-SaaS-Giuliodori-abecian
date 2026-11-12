import { resolveCountryCode } from "@/lib/countries/flags";

// Agrupa los destinos de todos los viajes del usuario en ciudades, paises y
// rutas para dibujarlos en el globo. Corre en el servidor y devuelve datos
// planos (serializables) para el Client Component.
function cityKey(destination) {
  return `${destination.name.toLowerCase()}|${Number(destination.lat).toFixed(2)}|${Number(destination.lng).toFixed(2)}`;
}

function tripStatus(trip, today) {
  if (!trip.startDate || !trip.endDate) return "planificado";
  if (trip.endDate < today) return "realizado";
  if (trip.startDate <= today) return "en-curso";
  return "planificado";
}

export function buildWorldData(trips, today = new Date().toISOString().slice(0, 10)) {
  const cities = new Map();
  const countries = new Map();
  const arcs = [];

  for (const trip of trips) {
    const status = tripStatus(trip, today);
    const tripSummary = {
      id: trip.id,
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status,
    };

    const stops = trip.destinations.filter(
      (destination) => destination?.name && Number.isFinite(Number(destination.lat)) && Number.isFinite(Number(destination.lng)),
    );

    stops.forEach((destination, index) => {
      const key = cityKey(destination);
      const countryCode = resolveCountryCode(destination.countryCode, destination.country);

      if (!cities.has(key)) {
        cities.set(key, {
          key,
          name: destination.name,
          country: destination.country || "",
          countryCode: countryCode || "",
          lat: Number(destination.lat),
          lng: Number(destination.lng),
          image: destination.image || null,
          trips: [],
        });
      }

      const city = cities.get(key);
      if (!city.image && destination.image) city.image = destination.image;
      if (!city.trips.some((item) => item.id === trip.id)) city.trips.push(tripSummary);

      if (countryCode) {
        const country = countries.get(countryCode) || { code: countryCode, name: destination.country || countryCode, visited: false };
        if (status !== "planificado") country.visited = true;
        countries.set(countryCode, country);
      }

      const next = stops[index + 1];
      if (next) {
        arcs.push({
          tripId: trip.id,
          tripName: trip.name,
          status,
          startLat: Number(destination.lat),
          startLng: Number(destination.lng),
          endLat: Number(next.lat),
          endLng: Number(next.lng),
        });
      }
    });
  }

  const cityList = [...cities.values()].map((city) => ({
    ...city,
    visited: city.trips.some((trip) => trip.status !== "planificado"),
  }));

  return {
    cities: cityList,
    countries: [...countries.values()],
    arcs,
    stats: {
      trips: trips.length,
      cities: cityList.length,
      countries: countries.size,
      visitedCountries: [...countries.values()].filter((country) => country.visited).length,
    },
  };
}
