"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { MeshPhongMaterial } from "three";

// Paleta del Figma de Triphy.
const OCEAN = "#143DA6";
const LAND = "#E7D6C2";
const VISITED = "#7CBE66";
// Planificado: el celeste del logo de Triphy.
const PLANNED = "#7386F5";
// Ciudad elegida: oscura, para que se vea sobre cualquier color de país.
const SELECTED = "#111827";
// Viaje en curso: dorado, para diferenciarlo de lo ya visitado (verde).
const EXPLORING = "#F5A524";

const STATUS_SUFFIX = { exploring: " · explorando ahora", visited: " · visitado", planned: " · planificado" };

export default function WorldGlobe({ cities, countries, arcs, selectedCity, onSelectCity }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [geo, setGeo] = useState([]);
  const [hoverCountry, setHoverCountry] = useState(null);

  const countryStatus = useMemo(() => {
    const map = new Map();
    countries.forEach((country) => map.set(country.code, country.status || "planned"));
    return map;
  }, [countries]);

  const globeMaterial = useMemo(() => new MeshPhongMaterial({ color: OCEAN, shininess: 8 }), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/countries.geojson")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setGeo(data.features);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Rotacion suave mientras no hay una ciudad elegida.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !size.width) return;
    const controls = globe.controls();
    controls.autoRotate = !selectedCity;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
  }, [selectedCity, size.width]);

  // Al elegir una ciudad, la camara vuela hasta ahi.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !selectedCity) return;
    globe.pointOfView({ lat: selectedCity.lat, lng: selectedCity.lng, altitude: 1.4 }, 1200);
  }, [selectedCity]);

  // Vista inicial: centrada en la primera ciudad del usuario, si hay.
  function handleReady() {
    const globe = globeRef.current;
    if (!globe) return;
    const first = cities[0];
    globe.pointOfView(first ? { lat: first.lat, lng: first.lng, altitude: 2.2 } : { altitude: 2.4 }, 0);
  }

  function polygonColor(feature) {
    const status = countryStatus.get(feature.properties.iso);
    if (status === "exploring") return EXPLORING;
    if (status === "visited") return VISITED;
    if (status === "planned") return PLANNED;
    return feature === hoverCountry ? "#F3E9DD" : LAND;
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.width > 0 ? (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor="#9cc0ff"
          atmosphereAltitude={0.18}
          onGlobeReady={handleReady}
          polygonsData={geo}
          polygonCapColor={polygonColor}
          polygonSideColor={() => "rgba(20, 61, 166, 0.25)"}
          polygonStrokeColor={() => "rgba(20, 61, 166, 0.35)"}
          polygonAltitude={(feature) => (countryStatus.has(feature.properties.iso) ? 0.012 : 0.006)}
          polygonsTransitionDuration={200}
          polygonLabel={(feature) => {
            const status = countryStatus.get(feature.properties.iso);
            const suffix = STATUS_SUFFIX[status] || "";
            return `<div style="padding:4px 8px;border-radius:8px;background:#fff;color:#1f2937;font:500 12px Rubik,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2)">${countryName(feature)}${suffix}</div>`;
          }}
          onPolygonHover={setHoverCountry}
          onPolygonClick={(feature) => {
            const city = cities.find((item) => item.countryCode === feature.properties.iso);
            if (city) onSelectCity(city);
          }}
          arcsData={arcs}
          arcColor={(arc) =>
            arc.status === "planificado"
              ? ["#ffffff", PLANNED]
              : arc.status === "en-curso"
                ? ["#ffffff", EXPLORING]
                : ["#ffffff", VISITED]
          }
          arcStroke={0.5}
          arcAltitudeAutoScale={0.4}
          arcDashLength={0.5}
          arcDashGap={0.15}
          arcDashAnimateTime={3500}
          arcLabel={(arc) => arc.tripName}
          pointsData={cities}
          pointLat="lat"
          pointLng="lng"
          pointColor={(city) => (city.key === selectedCity?.key ? SELECTED : city.status === "exploring" ? EXPLORING : "#ffffff")}
          pointAltitude={(city) => (city.key === selectedCity?.key ? 0.08 : 0.03)}
          pointRadius={(city) => (city.key === selectedCity?.key ? 0.85 : 0.6)}
          pointsMerge={false}
          pointLabel={(city) => `<div style="padding:4px 8px;border-radius:8px;background:#fff;color:#1f2937;font:600 12px Rubik,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2)">${escapeHtml(city.name)}${city.status === "exploring" ? " · explorando ahora" : ""}</div>`}
          onPointClick={onSelectCity}
          labelsData={cities}
          labelLat="lat"
          labelLng="lng"
          labelText="name"
          labelSize={0.9}
          labelDotRadius={0.35}
          labelColor={(city) => (city.status === "exploring" ? EXPLORING : "#ffffff")}
          labelAltitude={0.012}
          labelResolution={2}
          onLabelClick={onSelectCity}
        />
      ) : null}
    </div>
  );
}

const regionNames = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames(["es"], { type: "region" }) : null;

function countryName(feature) {
  const { iso, name } = feature.properties;
  try {
    if (regionNames && /^[A-Z]{2}$/.test(iso)) return escapeHtml(regionNames.of(iso));
  } catch {}
  return escapeHtml(name);
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
