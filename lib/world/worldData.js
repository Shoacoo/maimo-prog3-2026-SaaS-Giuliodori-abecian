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

// Estado de un pais o ciudad en el globo segun sus viajes. Si hay un viaje
// en curso se muestra "explorando" (aunque antes ya se haya visitado), si no
// "visitado" cuando algun viaje ya termino, y si no "planificado".
const PLACE_STATUS_RANK = { planned: 1, visited: 2, exploring: 3 };
const PLACE_STATUS_BY_TRIP = { planificado: "planned", realizado: "visited", "en-curso": "exploring" };

function strongerStatus(current, tripStatusValue) {
  const next = PLACE_STATUS_BY_TRIP[tripStatusValue] || "planned";
  return !current || PLACE_STATUS_RANK[next] > PLACE_STATUS_RANK[current] ? next : current;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
}

export function buildWorldData(trips, today = new Date().toISOString().slice(0, 10)) {
  const cities = new Map();
  const countries = new Map();
  const arcs = [];
  const tripList = [];

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

    // Resumen para el listado por estado: al elegir un viaje el globo gira
    // hasta el pais de su primera parada.
    const first = stops[0];
    const firstCountryCode = first ? resolveCountryCode(first.countryCode, first.country) : "";
    const tripCountries = [];
    stops.forEach((destination) => {
      const code = resolveCountryCode(destination.countryCode, destination.country) || "";
      const name = destination.country || code;
      if (name && !tripCountries.some((item) => item.name === name)) tripCountries.push({ code, name });
    });
    const firstCountryStops = stops.filter(
      (destination) => (resolveCountryCode(destination.countryCode, destination.country) || "") === firstCountryCode,
    );
    tripList.push({
      ...tripSummary,
      image: stops.find((destination) => destination.image)?.image || null,
      cities: stops.map((destination) => destination.name),
      countries: tripCountries,
      activities: Object.values(trip.itinerary || {}).reduce((sum, items) => sum + (items?.length || 0), 0),
      focus: first
        ? {
            countryCode: firstCountryCode,
            lat: average(firstCountryStops.map((destination) => Number(destination.lat))),
            lng: average(firstCountryStops.map((destination) => Number(destination.lng))),
          }
        : null,
    });

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

      // Fotos de Recuerdos sacadas en esta ciudad (para la ficha de la ciudad).
      const cityPhotos = (trip.memoryPhotos || []).filter((photo) => photo.cityId === destination.id);
      if (cityPhotos.length) {
        city.photoCount = (city.photoCount || 0) + cityPhotos.length;
        city.photos = [...(city.photos || []), ...cityPhotos.map((photo) => ({ id: photo.id, thumbUrl: photo.thumbUrl, tripId: trip.id }))].slice(0, 6);
        city.memoriesTripId = city.memoriesTripId || trip.id;
      }

      if (countryCode) {
        const country = countries.get(countryCode) || { code: countryCode, name: destination.country || countryCode, status: null };
        country.status = strongerStatus(country.status, status);
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
    status: city.trips.reduce((current, trip) => strongerStatus(current, trip.status), null),
  }));
  const countryList = [...countries.values()];

  return {
    cities: cityList,
    countries: countryList,
    arcs,
    trips: tripList.sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || ""))),
    stats: {
      trips: trips.length,
      cities: cityList.length,
      countries: countries.size,
      // Un viaje en curso todavia no cuenta como pais visitado.
      visitedCountries: countryList.filter((country) => country.status === "visited").length,
      exploringCountries: countryList.filter((country) => country.status === "exploring").length,
    },
  };
}
