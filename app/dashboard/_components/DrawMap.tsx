"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

export type DrawnGeometry =
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "Point"; coordinates: [number, number] };

type Props = {
  value: DrawnGeometry | null;
  onChange: (g: DrawnGeometry | null) => void;
  disabled?: boolean;
};

import L from "leaflet";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* Tells Leaflet the container resized so tiles repaint */
function MapSizeInvalidator({ trigger }: { trigger: boolean }) {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(id);
  }, [map, trigger]);
  return null;
}

function GeomanControls({ value, onChange, disabled }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map         = useMap() as LeafletMap & { pm: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef    = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (!map.pm) return;
    map.pm.addControls({ position: "topleft", drawCircle: false, drawCircleMarker: false, drawText: false, drawRectangle: false, rotateMode: false, cutPolygon: false });
    map.pm.setLang("ru");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onCreate = (e: any) => {
      if (layerRef.current && layerRef.current !== e.layer) { try { map.removeLayer(layerRef.current); } catch {} }
      layerRef.current = e.layer;
      onChangeRef.current((e.layer.toGeoJSON() as GeoJSON.Feature).geometry as DrawnGeometry);
      map.pm.disableDraw();
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onEdit = (e: any) => { onChangeRef.current((e.layer.toGeoJSON() as GeoJSON.Feature).geometry as DrawnGeometry); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onRemove = (e: any) => { if (e.layer === layerRef.current) { layerRef.current = null; onChangeRef.current(null); } };

    map.on("pm:create", onCreate);
    map.on("pm:edit", onEdit);
    map.on("pm:remove", onRemove);

    return () => {
      try { map.off("pm:create", onCreate); map.off("pm:edit", onEdit); map.off("pm:remove", onRemove); if (map.pm) map.pm.removeControls(); } catch {}
      if (layerRef.current) { try { map.removeLayer(layerRef.current); } catch {} layerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (value === null) {
      if (layerRef.current) { try { map.removeLayer(layerRef.current); } catch {} layerRef.current = null; }
      return;
    }
    if (layerRef.current) return;
    const layer = L.geoJSON({ type: "Feature", geometry: value, properties: {} } as GeoJSON.Feature);
    layer.addTo(map);
    layerRef.current = layer;
    try { map.fitBounds((layer as L.GeoJSON).getBounds().pad(0.25)); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, value]);

  useEffect(() => {
    if (!map.pm || !disabled) return;
    try { map.pm.disableDraw(); map.pm.disableGlobalEditMode(); } catch {}
  }, [map, disabled]);

  return null;
}

const ALMATY: [number, number] = [43.238, 76.945];

export default function DrawMap({ value, onChange, disabled }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  /* Escape to exit fullscreen */
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fullscreen]);

  const containerStyle = fullscreen
    ? { position: "fixed" as const, inset: 0, zIndex: 9990, borderRadius: 0, height: "100dvh" }
    : { position: "relative" as const, height: 340, borderRadius: 8 };

  return (
    <div
      className="w-full overflow-hidden border border-[#D9E0E8]"
      style={containerStyle}
    >
      <MapContainer center={ALMATY} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl>
        <TileLayer
          attribution='&copy; <a href="https://yandex.com/maps" target="_blank">Яндекс</a>'
          url="https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU"
        />
        <GeomanControls value={value} onChange={onChange} disabled={disabled ?? false} />
        <MapSizeInvalidator trigger={fullscreen} />
      </MapContainer>

      {/* Fullscreen toggle button */}
      <button
        type="button"
        onClick={() => setFullscreen((f) => !f)}
        title={fullscreen ? "Выйти из полного экрана (Esc)" : "Развернуть карту"}
        className="absolute top-2 right-2 z-[9999] w-8 h-8 rounded-[6px] flex items-center justify-center text-[#344054] transition-colors"
        style={{
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(217,224,232,0.8)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        {fullscreen ? (
          /* Compress icon */
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          /* Expand icon */
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Hint */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[9999] px-3 py-1.5 rounded-full text-[11px] text-[#344054] pointer-events-none whitespace-nowrap"
        style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(217,224,232,0.8)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {value
          ? "Фигура сохранена — нажмите кнопку редактирования для изменения"
          : fullscreen
            ? "Нарисуйте фигуру · Esc для выхода"
            : "Нарисуйте линию или полигон с помощью кнопок слева"}
      </div>
    </div>
  );
}
