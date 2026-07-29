"use client";

import { useEffect, useRef } from "react";

export type PublicRepair = {
  id: number;
  title: string;
  address: string;
  geometry: { type: string; coordinates: unknown } | null;
};

interface Props {
  repairs: PublicRepair[];
}

export default function PublicMapView({ repairs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const el = containerRef.current as HTMLElement & { _leaflet_id?: number };
      if (el._leaflet_id) return;

      import("leaflet/dist/leaflet.css");

      const map = L.default.map(containerRef.current, {
        center: [43.238, 76.945],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      mapRef.current = map;

      L.default.tileLayer(
        "https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU",
        { maxZoom: 19 }
      ).addTo(map);

      // Active repairs — render actual geometry shape (line / polygon / point)
      repairs.forEach((r) => {
        if (!r.geometry) return;

        const popupHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:200px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="background:#E6F6EF;color:#027A48;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600">Активный ремонт</span>
            </div>
            <p style="font-size:13px;font-weight:600;color:#1D2939;margin:0 0 4px">${r.title}</p>
            <p style="font-size:12px;color:#667085;margin:0">${r.address || "—"}</p>
          </div>
        `;

        try {
          L.default.geoJSON(
            { type: "Feature", geometry: r.geometry, properties: {} } as GeoJSON.Feature,
            {
              style: () => ({
                color: "#027A48",
                weight: r.geometry?.type === "LineString" ? 5 : 2,
                opacity: 0.9,
                fillColor: "#027A48",
                fillOpacity: 0.18,
              }),
              pointToLayer: (_feat, latlng) =>
                L.default.circleMarker(latlng, {
                  radius: 9,
                  fillColor: "#027A48",
                  color: "#fff",
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.95,
                }),
            }
          )
            .bindPopup(popupHtml, { closeButton: false, className: "rw-public-popup" })
            .addTo(map);
        } catch {}
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        .rw-public-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          border: 1px solid #E9EEF4;
          padding: 0;
        }
        .rw-public-popup .leaflet-popup-content { margin: 14px 16px; }
        .rw-public-popup .leaflet-popup-tip-container { display: none; }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
