"use client";

import { useEffect, useRef } from "react";

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAX_FIT_ZOOM = 12;

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

let mapsLibraryPromise = null;

function loadMapsLibrary() {
  if (!mapsLibraryPromise) {
    mapsLibraryPromise = import("@googlemaps/js-api-loader").then(({ setOptions, importLibrary }) => {
      setOptions({ key: API_KEY, v: "weekly" });
      return importLibrary("maps");
    });
  }

  return mapsLibraryPromise;
}

function renderMarkers(map, markers, markersRef) {
  markersRef.current.forEach((marker) => marker.setMap(null));
  markersRef.current = markers.map(
    (marker) =>
      new window.google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.label,
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

export default function GoogleMap({ markers = [], center, zoom = 4, className = "", rounded = true }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markersData = useRef(markers);
  markersData.current = markers;

  useEffect(() => {
    if (!API_KEY || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    loadMapsLibrary().then(({ Map }) => {
      if (cancelled || !containerRef.current) {
        return;
      }

      const initialCenter = center || markersData.current[0] || DEFAULT_CENTER;
      mapRef.current = new Map(containerRef.current, {
        center: { lat: initialCenter.lat, lng: initialCenter.lng },
        zoom,
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
      });

      renderMarkers(mapRef.current, markersData.current, markersRef);
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    renderMarkers(mapRef.current, markers, markersRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

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

  return <div ref={containerRef} className={`overflow-hidden ${rounded ? "rounded-2xl" : ""} ${className}`} />;
}
