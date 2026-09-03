export const CITIES = [
  { id: "madrid", name: "Madrid", country: "España", image: "/Madrid.png", lat: 40.4168, lng: -3.7038 },
  { id: "venecia", name: "Venecia", country: "Italia", image: "/Venecia.png", lat: 45.4408, lng: 12.3155 },
  { id: "paris", name: "Paris", country: "Francia", image: "/Paris.png", lat: 48.8566, lng: 2.3522 },
  { id: "tokyo", name: "Tokyo", country: "Japón", image: "/Tokyo.png", lat: 35.6762, lng: 139.6503 },
  { id: "kyoto", name: "Kyoto", country: "Japón", image: "/Kyoto.png", lat: 35.0116, lng: 135.7681 },
  { id: "osaka", name: "Osaka", country: "Japón", image: "/Osaka.png", lat: 34.6937, lng: 135.5023 },
];

export function searchCities(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }

  return CITIES.filter(
    (city) => city.name.toLowerCase().includes(q) || city.country.toLowerCase().includes(q),
  );
}

export function getCityById(id) {
  return CITIES.find((city) => city.id === id) || null;
}
