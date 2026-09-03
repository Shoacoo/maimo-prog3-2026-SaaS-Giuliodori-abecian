"use client";

import { useEffect, useRef } from "react";

const DEFAULT_CENTER = { lng: -58.3816, lat: -34.6037 };
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapboxMap({ markers = [], center, zoom = 4, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    import("mapbox-gl").then((mapboxglModule) => {
      if (cancelled || !containerRef.current) {
        return;
      }

      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const initialCenter = center || markers[0] || DEFAULT_CENTER;

      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [initialCenter.lng, initialCenter.lat],
        zoom,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    import("mapbox-gl").then((mapboxglModule) => {
      const mapboxgl = mapboxglModule.default;
      const map = mapRef.current;
      if (!map) {
        return;
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = markers.map((markerData) =>
        new mapboxgl.Marker({ color: "#7386f5" })
          .setLngLat([markerData.lng, markerData.lat])
          .setPopup(markerData.label ? new mapboxgl.Popup({ offset: 16 }).setText(markerData.label) : undefined)
          .addTo(map),
      );

      if (markers.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        markers.forEach((markerData) => bounds.extend([markerData.lng, markerData.lat]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 9, duration: 400 });
      }
    });
  }, [markers]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`grid place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center text-xs text-gray-400 ${className}`}
      >
        <span className="px-4">
          Mapa no disponible.
          <br />
          Configura NEXT_PUBLIC_MAPBOX_TOKEN.
        </span>
      </div>
    );
  }

  return <div ref={containerRef} className={`overflow-hidden rounded-2xl ${className}`} />;
}
