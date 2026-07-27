"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapRepairRequest = {
  id: number;
  title: string;
  status: string;
  address: string;
  road_section?: string | null;
  organization_name?: string | null;
  planned_start_date: string;
  planned_end_date: string;
  days_remaining?: number | null;
  days_overdue?: number | null;
  is_overdue?: boolean;
  photos?: Array<{ phase: string; image: string }>;
  geometry?: {
    type: "LineString" | "Polygon" | "Point";
    coordinates: unknown;
  } | null;
};

const STATUS_COLOR: Record<string, string> = {
  draft:          "#667085",
  pending_review: "#B76E00",
  needs_revision: "#D92D20",
  active:         "#027A48",
  completed:      "#12345B",
  cancelled:      "#98A2B3",
};

const STATUS_BG: Record<string, string> = {
  draft:          "#F2F4F7",
  pending_review: "#FFF7E6",
  needs_revision: "#FFF2F2",
  active:         "#E6F6EF",
  completed:      "#DCECF8",
  cancelled:      "#F2F4F7",
};

const STATUS_LABELS: Record<string, string> = {
  draft:          "Черновик",
  pending_review: "На проверке",
  needs_revision: "На доработке",
  active:         "Активный ремонт",
  completed:      "Завершён",
  cancelled:      "Аннулирован",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function popupHtml(req: MapRepairRequest) {
  const color = STATUS_COLOR[req.status] ?? "#667085";
  const bg    = STATUS_BG[req.status]    ?? "#F2F4F7";
  const label = STATUS_LABELS[req.status] ?? req.status;

  const photo = req.photos?.find((p) => p.phase === "before") ?? req.photos?.[0];

  let daysHtml = "";
  if (req.is_overdue && req.days_overdue && req.days_overdue > 0) {
    daysHtml = `<p style="font-size:11px;color:#D92D20;margin:0 0 5px">🔴 Просрочено: ${req.days_overdue} дн.</p>`;
  } else if (req.days_remaining != null && req.days_remaining > 0) {
    daysHtml = `<p style="font-size:11px;color:#667085;margin:0 0 5px">⏰ Осталось: ${req.days_remaining} дн.</p>`;
  } else if (req.days_remaining === 0) {
    daysHtml = `<p style="font-size:11px;color:#D92D20;margin:0 0 5px">🔴 Срок истекает сегодня</p>`;
  }

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-width:250px;max-width:300px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="background:${bg};color:${color};padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600">${label}</span>
        <span style="font-size:11px;color:#98A2B3;margin-left:auto">#${req.id}</span>
      </div>
      <p style="font-size:14px;font-weight:700;color:#1D2939;margin:0 0 10px;line-height:1.3">${req.title}</p>
      ${req.organization_name ? `<p style="font-size:11px;color:#667085;margin:0 0 5px">🏢 ${req.organization_name}</p>` : ""}
      ${req.address ? `<p style="font-size:11px;color:#667085;margin:0 0 5px">📍 ${req.address}</p>` : ""}
      ${req.road_section ? `<p style="font-size:11px;color:#98A2B3;margin:0 0 5px;padding-left:16px">↔ ${req.road_section}</p>` : ""}
      <p style="font-size:11px;color:#98A2B3;margin:0 0 5px">📅 ${fmtDate(req.planned_start_date)} — ${fmtDate(req.planned_end_date)}</p>
      ${daysHtml}
      ${photo ? `
        <div style="margin:10px 0 10px;border-radius:7px;overflow:hidden;height:110px;background:#F2F4F7">
          <img src="${photo.image}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display='none'"/>
        </div>
      ` : ""}
      <a href="/dashboard/repairs/${req.id}" style="display:flex;align-items:center;justify-content:center;gap:4px;background:#12345B;color:#fff;padding:7px 0;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;margin-top:${photo ? "0" : "10px"}">Открыть заявку →</a>
    </div>
  `;
}

function RepairLayers({ requests }: { requests: MapRepairRequest[] }) {
  const map = useMap();
  const lgRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!lgRef.current) lgRef.current = L.layerGroup().addTo(map);
    const lg = lgRef.current;
    lg.clearLayers();

    const allBounds: L.LatLngBounds[] = [];

    for (const req of requests) {
      if (!req.geometry) continue;
      const color = STATUS_COLOR[req.status] ?? "#667085";

      try {
        const gj = L.geoJSON(
          { type: "Feature", geometry: req.geometry, properties: {} } as GeoJSON.Feature,
          {
            style: () => ({
              color,
              weight: req.geometry?.type === "LineString" ? 5 : 2,
              opacity: 0.9,
              fillColor: color,
              fillOpacity: 0.18,
            }),
            pointToLayer: (_, latlng) =>
              L.circleMarker(latlng, {
                radius: 9,
                fillColor: color,
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.95,
              }),
          }
        );
        gj.bindPopup(popupHtml(req), { maxWidth: 320 });
        gj.addTo(lg);
        try { allBounds.push(gj.getBounds()); } catch {}
      } catch {}
    }

    if (allBounds.length > 0) {
      try {
        const combined = allBounds.reduce((acc, b) => acc.extend(b));
        map.fitBounds(combined.pad(0.15), { maxZoom: 15, animate: true });
      } catch {}
    }

    return () => { lg.clearLayers(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, requests]);

  return null;
}

const ALMATY: [number, number] = [43.238, 76.945];

export default function RepairMap({ requests }: { requests: MapRepairRequest[] }) {
  return (
    <MapContainer
      center={ALMATY}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://yandex.com/maps" target="_blank">Яндекс</a>'
        url="https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU"
      />
      <RepairLayers requests={requests} />
    </MapContainer>
  );
}
