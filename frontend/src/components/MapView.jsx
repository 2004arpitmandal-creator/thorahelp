import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Override default Leaflet marker icon paths (broken under CRA)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeSignalIcon(type) {
  const color = type === "medical" ? "#DC2626" : type === "roadside" ? "#F59E0B" : "#2563EB";
  return L.divIcon({
    className: "th-signal-icon",
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:${color}33;animation:th-pulse-ring 1.8s ease-out infinite;"></div>
        <div style="position:absolute;inset:8px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 4px 8px rgba(0,0,0,0.25);"></div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: "th-user-icon",
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:#2563EB33;"></div>
        <div style="position:absolute;inset:6px;border-radius:9999px;background:#2563EB;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function MapView({
  center = [20.5937, 78.9629],
  userLocation = null,
  signals = [],
  onSignalClick,
  className = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ userMarker: null, signalLayers: [] });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: userLocation || center,
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    if (layersRef.current.userMarker) {
      layersRef.current.userMarker.setLatLng(userLocation);
    } else {
      layersRef.current.userMarker = L.marker(userLocation, { icon: makeUserIcon() })
        .addTo(map)
        .bindTooltip("You", { permanent: false, direction: "top" });
      map.setView(userLocation, 16);
    }
  }, [userLocation]);

  // signal layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.signalLayers.forEach((g) => map.removeLayer(g));
    layersRef.current.signalLayers = [];

    signals.forEach((s) => {
      const color = s.type === "medical" ? "#DC2626" : s.type === "roadside" ? "#F59E0B" : "#2563EB";
      const group = L.layerGroup();
      L.circle([s.lat, s.lng], {
        radius: s.radius || 100,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.12,
      }).addTo(group);
      const m = L.marker([s.lat, s.lng], { icon: makeSignalIcon(s.type) })
        .addTo(group)
        .bindTooltip(`${s.title || "Help"} · ${Math.round(s.radius || 100)}m`, { direction: "top" });
      if (onSignalClick) m.on("click", () => onSignalClick(s));
      group.addTo(map);
      layersRef.current.signalLayers.push(group);
    });
  }, [signals, onSignalClick]);

  return (
    <div
      ref={containerRef}
      data-testid="map-view"
      className={`w-full h-full rounded-2xl overflow-hidden border border-slate-200 ${className}`}
    />
  );
}
