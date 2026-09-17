"use client";

import { useEffect, useRef, useState } from "react";
import PlaceSheet from "@/components/map/PlaceSheet";

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAX_FIT_ZOOM = 12;
const ACCENT_COLOR = "#7386f5";
// Nearby places stay hidden until the user zooms in this far - at lower
// zoom they'd sit right on top of each other, so instead of clustering
// them into a bubble we simply reveal them once they're far enough apart
// on screen to read individually. Sightseeing spots (highlight = true)
// appear sooner, at a wider zoom, so they're the first thing to catch the
// eye while everyday places (food, hotels, shops) wait until a closer zoom.
const POI_MIN_ZOOM_HIGHLIGHT = 13;
const POI_MIN_ZOOM = 15;

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M10 10h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UtensilsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M7 3v7a2 2 0 0 0 2 2v9M7 3v7M7 10v9M17 3c-1.5 0-3 1.5-3 4v3a2 2 0 0 0 2 2v7M17 3v18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M6 8h12l1 12H5L6 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3 7 10h2l-4 6h5v5h4v-5h5l-4-6h2L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FILTER_GROUPS = [
  { id: "hoteles", label: "Hoteles", color: "#0ea5e9", Icon: BedIcon },
  { id: "comida", label: "Comida y bebida", color: "#f97316", Icon: UtensilsIcon },
  { id: "atracciones", label: "Atracciones", color: "#a855f7", Icon: StarIcon },
  { id: "tiendas", label: "Tiendas", color: "#ec4899", Icon: BagIcon },
  { id: "parques", label: "Parques", color: "#22c55e", Icon: TreeIcon },
];

let librariesPromise = null;

function loadLibraries() {
  if (!librariesPromise) {
    librariesPromise = import("@googlemaps/js-api-loader").then(async ({ setOptions, importLibrary }) => {
      setOptions({ key: API_KEY, v: "weekly" });
      const [mapsLib, routesLib] = await Promise.all([importLibrary("maps"), importLibrary("routes")]);
      return { ...mapsLib, ...routesLib };
    });
  }

  return librariesPromise;
}

function renderMarkers(map, markers, markersRef) {
  markersRef.current.forEach((marker) => marker.setMap(null));
  markersRef.current = markers.map(
    (marker, index) =>
      new window.google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.label,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: ACCENT_COLOR,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontSize: "13px",
          fontWeight: "700",
        },
      }),
  );

  if (markers.length === 1) {
    // fitBounds on a single point has no reliable effect (some versions leave
    // zoom unchanged, others jump to max) - set the view directly instead.
    map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
    map.setZoom(MAX_FIT_ZOOM);
    return;
  }

  if (markers.length > 1) {
    const bounds = new window.google.maps.LatLngBounds();
    markers.forEach((marker) => bounds.extend({ lat: marker.lat, lng: marker.lng }));
    window.google.maps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom() > MAX_FIT_ZOOM) {
        map.setZoom(MAX_FIT_ZOOM);
      }
    });
    map.fitBounds(bounds, 48);
  }
}

function drawAnimatedPolyline(map, path, geodesic, routeRef) {
  const dash = {
    path: "M 0,-1 0,1",
    strokeOpacity: 1,
    scale: 3,
  };

  const REPEAT_PX = 14;

  const polyline = new window.google.maps.Polyline({
    path,
    geodesic,
    strokeOpacity: 0,
    strokeColor: ACCENT_COLOR,
    strokeWeight: 4,
    icons: [{ icon: dash, offset: "0px", repeat: `${REPEAT_PX}px` }],
    map,
  });
  routeRef.current.polyline = polyline;

  // Offset and repeat both in pixels (screen space) so the dashes move at a
  // constant on-screen speed regardless of zoom level or path length -
  // mixing "%" offset with a "px" repeat made the speed vary with zoom.
  let offsetPx = 0;
  routeRef.current.animation = setInterval(() => {
    offsetPx = (offsetPx + 0.5) % REPEAT_PX;
    const icons = polyline.get("icons");
    icons[0].offset = `${offsetPx}px`;
    polyline.set("icons", icons);
  }, 40);
}

function updatePoiVisibility(map, poiRef, activeGroupsRef) {
  const zoom = map.getZoom();
  poiRef.current.markers.forEach((marker) => {
    const minZoom = marker.get("minZoom") ?? POI_MIN_ZOOM;
    const group = marker.get("group");
    const visible = zoom >= minZoom && activeGroupsRef.current.has(group);
    marker.setMap(visible ? map : null);
  });
}

async function fetchNearbyPlaces(marker) {
  try {
    const response = await fetch(`/api/places/nearby?lat=${marker.lat}&lng=${marker.lng}`);
    const data = await response.json();
    return data.places || [];
  } catch {
    return [];
  }
}

async function renderNearbyPlaces(map, markers, poiRef, activeGroupsRef, onSelectPlace) {
  poiRef.current.markers.forEach((marker) => marker.setMap(null));
  poiRef.current.markers = [];

  const requestId = (poiRef.current.requestId || 0) + 1;
  poiRef.current.requestId = requestId;

  if (markers.length === 0) {
    return;
  }

  const results = await Promise.all(markers.map((marker) => fetchNearbyPlaces(marker)));

  if (poiRef.current.requestId !== requestId) {
    return;
  }

  const seen = new Set();
  const places = results.flat().filter((place) => {
    if (seen.has(place.id)) {
      return false;
    }
    seen.add(place.id);
    return true;
  });

  const zoom = map.getZoom();

  poiRef.current.markers = places.map((place) => {
    const minZoom = place.highlight ? POI_MIN_ZOOM_HIGHLIGHT : POI_MIN_ZOOM;
    const iconSize = place.iconSize || 30;

    const marker = new window.google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map: zoom >= minZoom && activeGroupsRef.current.has(place.group) ? map : null,
      title: place.name,
      zIndex: place.highlight ? 10 : 1,
      icon: place.icon
        ? { url: place.icon, scaledSize: new window.google.maps.Size(iconSize, iconSize) }
        : undefined,
    });
    marker.set("minZoom", minZoom);
    marker.set("group", place.group);

    marker.addListener("click", () => onSelectPlace(place));

    return marker;
  });
}

async function renderRoute(map, markers, routeRef, DirectionsService) {
  routeRef.current.polyline?.setMap(null);
  routeRef.current.polyline = null;
  if (routeRef.current.animation) {
    clearInterval(routeRef.current.animation);
    routeRef.current.animation = null;
  }

  const requestId = (routeRef.current.requestId || 0) + 1;
  routeRef.current.requestId = requestId;

  if (markers.length < 2) {
    return;
  }

  const [origin, ...rest] = markers;
  const destination = rest[rest.length - 1];
  const waypoints = rest.slice(0, -1).map((stop) => ({ location: { lat: stop.lat, lng: stop.lng }, stopover: true }));

  try {
    const directionsService = new DirectionsService();
    const result = await directionsService.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      waypoints,
      optimizeWaypoints: false,
      travelMode: window.google.maps.TravelMode.DRIVING,
    });

    if (routeRef.current.requestId !== requestId) {
      return;
    }

    drawAnimatedPolyline(map, result.routes[0].overview_path, false, routeRef);
  } catch {
    // No hay ruta por carretera entre las paradas (ej. cruza un oceano) - mostramos
    // una linea recta geodesica como respaldo en vez de no mostrar nada.
    if (routeRef.current.requestId !== requestId) {
      return;
    }

    drawAnimatedPolyline(
      map,
      markers.map((marker) => ({ lat: marker.lat, lng: marker.lng })),
      true,
      routeRef,
    );
  }
}

function nextDestinationLabel(daysUntil) {
  if (daysUntil > 1) {
    return `En ${daysUntil} dias`;
  }
  if (daysUntil === 1) {
    return "Mañana";
  }
  if (daysUntil === 0) {
    return "Hoy";
  }
  return "En curso";
}

export default function GoogleMap({
  markers = [],
  center,
  zoom = 4,
  className = "",
  rounded = true,
  showNearbyPlaces = false,
  nextDestination = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef({ polyline: null, animation: null, requestId: 0 });
  const poiRef = useRef({ markers: [], requestId: 0 });
  const directionsServiceRef = useRef(null);
  const markersData = useRef(markers);
  markersData.current = markers;

  const [activeGroups, setActiveGroups] = useState(() => new Set(FILTER_GROUPS.map((group) => group.id)));
  const activeGroupsRef = useRef(activeGroups);
  // eslint-disable-next-line react-hooks/refs
  activeGroupsRef.current = activeGroups;

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  function handleSelectPlace(place) {
    setSelectedPlace(place);
    setActiveTab("overview");
  }

  function toggleGroup(id) {
    setActiveGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleNextDestinationClick() {
    const map = mapRef.current;
    const marker = markersRef.current[nextDestination?.index];
    if (!map || !marker) {
      return;
    }

    map.panTo(marker.getPosition());
    map.setZoom(Math.max(map.getZoom(), 14));
    marker.setAnimation(window.google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1400);
  }

  useEffect(() => {
    if (!API_KEY || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    loadLibraries().then(({ Map, DirectionsService }) => {
      if (cancelled || !containerRef.current) {
        return;
      }

      directionsServiceRef.current = DirectionsService;

      const initialCenter = center || markersData.current[0] || DEFAULT_CENTER;
      mapRef.current = new Map(containerRef.current, {
        center: { lat: initialCenter.lat, lng: initialCenter.lng },
        zoom,
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
      });

      renderMarkers(mapRef.current, markersData.current, markersRef);
      renderRoute(mapRef.current, markersData.current, routeRef, DirectionsService);
      if (showNearbyPlaces) {
        renderNearbyPlaces(mapRef.current, markersData.current, poiRef, activeGroupsRef, handleSelectPlace);
        mapRef.current.addListener("zoom_changed", () => updatePoiVisibility(mapRef.current, poiRef, activeGroupsRef));
      }
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      routeRef.current.polyline?.setMap(null);
      routeRef.current.polyline = null;
      if (routeRef.current.animation) {
        clearInterval(routeRef.current.animation);
        routeRef.current.animation = null;
      }
      poiRef.current.markers.forEach((marker) => marker.setMap(null));
      poiRef.current.markers = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !directionsServiceRef.current) {
      return;
    }

    renderMarkers(mapRef.current, markers, markersRef);
    renderRoute(mapRef.current, markers, routeRef, directionsServiceRef.current);
    if (showNearbyPlaces) {
      renderNearbyPlaces(mapRef.current, markers, poiRef, activeGroupsRef, handleSelectPlace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  useEffect(() => {
    if (mapRef.current) {
      updatePoiVisibility(mapRef.current, poiRef, activeGroupsRef);
    }
  }, [activeGroups]);

  useEffect(() => {
    if (!selectedPlace) {
      return undefined;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailsLoading(true);
    setPlaceDetails(null);

    fetch(`/api/places/poi-details?placeId=${encodeURIComponent(selectedPlace.id)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setPlaceDetails(data.error ? null : data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlace]);

  if (!API_KEY) {
    return (
      <div
        className={`grid place-items-center border border-dashed border-gray-300 bg-gray-50 text-center text-xs text-gray-400 ${rounded ? "rounded-2xl" : ""} ${className}`}
      >
        <span className="px-4">
          Mapa no disponible.
          <br />
          Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className={`h-full w-full overflow-hidden ${rounded ? "rounded-2xl" : ""}`} />

      {nextDestination ? (
        <button
          type="button"
          onClick={handleNextDestinationClick}
          className="absolute left-3 top-3 flex max-w-[75%] items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-xl transition hover:shadow-2xl"
        >
          {nextDestination.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nextDestination.image} alt={nextDestination.name} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : null}
          <span className="min-w-0">
            <span className="block text-[11px] font-medium text-gray-400">Tu proximo destino</span>
            <span className="flex min-w-0 items-center gap-1.5">
              {nextDestination.flagUrl ? (
                <span className="h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={nextDestination.flagUrl} alt="" className="h-full w-full object-cover" />
                </span>
              ) : null}
              <span className="truncate text-sm font-bold text-gray-900">{nextDestination.name}</span>
            </span>
            <span className="block text-xs font-medium text-[#7386f5]">
              {nextDestinationLabel(nextDestination.daysUntil)}
            </span>
          </span>
          <ChevronRightIcon />
        </button>
      ) : null}

      {showNearbyPlaces ? (
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {FILTER_GROUPS.map((group) => {
            const active = activeGroups.has(group.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-pressed={active}
                aria-label={group.label}
                title={group.label}
                className="flex h-10 w-10 items-center justify-center rounded-full shadow-xl transition"
                style={{
                  backgroundColor: active ? group.color : "#ffffff",
                  color: active ? "#ffffff" : "#9ca3af",
                }}
              >
                <group.Icon />
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedPlace ? (
        <PlaceSheet
          place={selectedPlace}
          details={placeDetails}
          loading={detailsLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setSelectedPlace(null)}
        />
      ) : null}
    </div>
  );
}
