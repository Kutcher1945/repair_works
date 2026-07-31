"use client";

import { useEffect, useRef } from "react";

export type PublicRepair = {
  id: number;
  title: string;
  description: string;
  address: string;
  road_section: string;
  organization_name: string;
  district: string | null;
  contractor_name: string;
  contractor_phone: string;
  has_traffic_restriction: boolean;
  traffic_restriction_description: string | null;
  planned_start_date: string | null;
  approved_at: string | null;
  photos: { url: string; phase: string }[];
  geometry: { type: string; coordinates: unknown } | null;
};

interface Props {
  repairs: PublicRepair[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boundary: any | null;
  selectedId: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────


function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function segmentLength(coords: number[][]): number {
  let t = 0;
  for (let i = 1; i < coords.length; i++)
    t += haversine(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  return t;
}

function formatLength(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} км` : `${Math.round(m)} м`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const mon = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  return `${parseInt(d)} ${mon[parseInt(m) - 1]} ${y} г.`;
}

function lineMetrics(geom: { type: string; coordinates: unknown }): {
  length: number;
  endpoints: Array<[number, number]>;
} {
  const endpoints: Array<[number, number]> = [];
  let length = 0;
  if (geom.type === "LineString") {
    const c = geom.coordinates as number[][];
    length = segmentLength(c);
    if (c.length >= 2) {
      endpoints.push([c[0][1], c[0][0]]);
      endpoints.push([c[c.length - 1][1], c[c.length - 1][0]]);
    }
  } else if (geom.type === "MultiLineString") {
    for (const seg of geom.coordinates as number[][][]) {
      length += segmentLength(seg);
      if (seg.length >= 1) {
        endpoints.push([seg[0][1], seg[0][0]]);
        endpoints.push([seg[seg.length - 1][1], seg[seg.length - 1][0]]);
      }
    }
  }
  return { length, endpoints };
}

const DISTRICT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#f97316", "#84cc16",
];

// ── SVG icon helpers ────────────────────────────────────────────────────────

const ic = (body: string, color = "#667085") =>
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;margin-top:2px;color:${color}">${body}</svg>`;

const ICONS = {
  org:     ic('<path d="M3 21h18M6 21V7l9-4v18M13 21V13h4v8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>'),
  wrench:  ic('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>'),
  phone:   ic('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13 19.79 19.79 0 0 1 3 4.25 2 2 0 0 1 5 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>'),
  cal:     ic('<rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.75"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.75"/>'),
  check:   ic('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>', "#027A48"),
  ruler:   ic('<line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="8.5" y1="15.5" x2="11" y2="13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="13" y1="11" x2="15.5" y2="8.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>'),
  warn:    ic('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>', "#D97706"),
};

// ── Popup builder ───────────────────────────────────────────────────────────

const CROSS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <line x1="9" y1="1" x2="9" y2="17" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="1" y1="9" x2="17" y2="9" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

function buildPopup(r: PublicRepair, lengthLabel: string): string {
  const row = (icon: string, label: string, value: string) =>
    `<div style="display:flex;gap:8px;align-items:flex-start;margin-top:7px">
      ${icon}
      <div>
        <div style="font-size:10px;color:#98A2B3;text-transform:uppercase;letter-spacing:.06em;font-weight:700;line-height:1.2">${label}</div>
        <div style="font-size:12px;color:#344054;line-height:1.45;margin-top:1px">${value}</div>
      </div>
    </div>`;

  const div = `<div style="height:1px;background:#F2F4F7;margin:10px 0 3px"></div>`;

  const badges =
    `<span style="background:#E6F6EF;color:#027A48;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:600">Активный ремонт</span>` +
    (r.has_traffic_restriction
      ? ` <span style="background:#FEF3F2;color:#D92D20;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:600">Ограничение движения</span>`
      : "");

  const locationLine = [r.district, r.address].filter(Boolean).join(", ");

  let html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:240px;max-width:300px">`;
  html += `<div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:4px">${badges}</div>`;
  html += `<p style="font-size:13px;font-weight:700;color:#1D2939;margin:0 0 3px;line-height:1.35">${r.title}</p>`;
  if (locationLine) html += `<p style="font-size:12px;color:#667085;margin:0">${locationLine}</p>`;
  if (r.road_section) html += `<p style="font-size:12px;color:#98A2B3;margin:3px 0 0">${r.road_section}</p>`;
  if (r.description)  html += `<p style="font-size:12px;color:#475467;margin:5px 0 0;line-height:1.5">${r.description}</p>`;

  // Photo strip
  if (r.photos && r.photos.length > 0) {
    const phaseLabel: Record<string, string> = { before: "До", during: "В процессе", after: "После" };
    if (r.photos.length === 1) {
      const ph = r.photos[0];
      html += `<div style="margin-top:8px;border-radius:6px;overflow:hidden;position:relative">
        <img src="${ph.url}" alt="" style="width:100%;height:140px;object-fit:cover;display:block" onerror="this.parentElement.style.display='none'" loading="lazy" />
        ${ph.phase ? `<span style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.52);color:#fff;font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px">${phaseLabel[ph.phase] ?? ph.phase}</span>` : ""}
      </div>`;
    } else {
      html += `<div style="display:flex;gap:4px;margin-top:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none">`;
      for (const ph of r.photos) {
        html += `<div style="position:relative;flex-shrink:0">
          <img src="${ph.url}" alt="" style="width:90px;height:68px;object-fit:cover;border-radius:5px;display:block" onerror="this.parentElement.style.display='none'" loading="lazy" />
          ${ph.phase ? `<span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,.52);color:#fff;font-size:9px;font-weight:600;padding:1px 5px;border-radius:99px">${phaseLabel[ph.phase] ?? ph.phase}</span>` : ""}
        </div>`;
      }
      html += `</div>`;
    }
  }

  const hasOrgBlock = r.organization_name || r.contractor_name || r.contractor_phone;
  const hasDatesBlock = r.planned_start_date || r.approved_at || lengthLabel;
  const hasRestriction = r.has_traffic_restriction && r.traffic_restriction_description;

  if (hasOrgBlock) {
    html += div;
    if (r.organization_name) html += row(ICONS.org,    "Заказчик",   r.organization_name);
    if (r.contractor_name)   html += row(ICONS.wrench, "Подрядчик",  r.contractor_name);
    if (r.contractor_phone)  html += row(ICONS.phone,  "Телефон",    r.contractor_phone);
  }

  if (hasDatesBlock) {
    html += div;
    if (r.planned_start_date) html += row(ICONS.cal,   "Дата начала",   fmtDate(r.planned_start_date));
    if (r.approved_at)        html += row(ICONS.check, "Согласовано",   fmtDate(r.approved_at));
    if (lengthLabel)          html += row(ICONS.ruler, "Протяжённость", lengthLabel);
  }

  if (hasRestriction) {
    html += div;
    html += row(ICONS.warn, "Ограничение движения", r.traffic_restriction_description!);
  }

  html += `</div>`;
  return html;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function PublicMapView({ repairs, boundary, selectedId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<unknown>(null);
  const layersRef    = useRef<Map<number, unknown>>(new Map());

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
        crs: L.default.CRS.EPSG3395,
      });
      mapRef.current = map;

      L.default.tileLayer(
        "https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU",
        { maxZoom: 19 }
      ).addTo(map);

      // District polygons — same endpoint as air-quality project
      fetch("https://admin.smartalmaty.kz/api/v1/address/districts/")
        .then((r) => r.json())
        .then((geojson: { features?: GeoJSON.Feature[] }) => {
          if (cancelled) return;
          const features = (geojson.features ?? []).filter(
            (f) => f.geometry && String((f.properties as Record<string, unknown>)?.name_ru ?? "").includes("район")
          );
          let ci = 0;
          for (const f of features) {
            const color = DISTRICT_COLORS[ci++ % DISTRICT_COLORS.length];
            L.default
              .geoJSON(f, {
                style: () => ({
                  color,
                  weight: 1.5,
                  opacity: 0.65,
                  fillColor: color,
                  fillOpacity: 0.05,
                  interactive: false,
                }),
              })
              .addTo(map);
          }
        })
        .catch(() => {});

      if (boundary) {
        L.default.geoJSON(boundary, {
          style: () => ({ color: "#12345B", weight: 2, opacity: 0.7, fill: false, interactive: false }),
        }).addTo(map);
      }

      const crossIcon = L.default.divIcon({
        className: "",
        html: CROSS_SVG,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      repairs.forEach((r) => {
        if (!r.geometry) return;
        const isLine = r.geometry.type === "LineString" || r.geometry.type === "MultiLineString";
        let lengthLabel = "";
        let endpoints: Array<[number, number]> = [];

        if (isLine) {
          const { length, endpoints: ep } = lineMetrics(r.geometry as { type: string; coordinates: unknown });
          if (length > 0) lengthLabel = formatLength(length);
          endpoints = ep;
        }

        const popupHtml = buildPopup(r, lengthLabel);

        try {
          const layer = L.default.geoJSON(
            { type: "Feature", geometry: r.geometry, properties: {} } as GeoJSON.Feature,
            {
              style: () => ({
                color: "#D92D20",
                weight: isLine ? 5 : 2,
                opacity: 0.9,
                fillColor: "#D92D20",
                fillOpacity: 0.18,
              }),
              pointToLayer: (_feat, latlng) =>
                L.default.circleMarker(latlng, {
                  radius: 9, fillColor: "#D92D20", color: "#fff",
                  weight: 2, opacity: 1, fillOpacity: 0.95,
                }),
            }
          )
            .bindPopup(popupHtml, { closeButton: false, className: "rw-public-popup", maxWidth: 320 })
            .addTo(map);

          layersRef.current.set(r.id, layer);

          for (const pt of endpoints) {
            L.default.marker(pt, { icon: crossIcon, interactive: false }).addTo(map);
          }
        } catch {}
      });
    });

    return () => {
      cancelled = true;
      layersRef.current.clear();
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId == null || !mapRef.current) return;

    const map = mapRef.current as {
      fitBounds: (bounds: unknown, opts?: unknown) => void;
    };

    const layer = layersRef.current.get(selectedId) as
      | {
          openPopup: () => void;
          getLayers?: () => Array<{ openPopup: () => void }>;
          getBounds: () => unknown;
        }
      | undefined;

    if (!layer) return;

    // fitBounds shows the full geometry correctly regardless of vertex density.
    // Works for LineString, Polygon, and Point (circleMarker has getBounds too).
    try {
      map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 16, animate: true });
    } catch {}

    setTimeout(() => {
      try {
        if (typeof layer.openPopup === "function") layer.openPopup();
        else layer.getLayers?.()[0]?.openPopup();
      } catch {}
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <>
      <style>{`
        .rw-public-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          border: 1px solid #E9EEF4;
          padding: 0;
        }
        .rw-public-popup .leaflet-popup-content { margin: 14px 16px; }
        .rw-public-popup .leaflet-popup-tip-container { display: none; }
        .rw-district-tip {
          background: rgba(255,255,255,0.92);
          border: 1px solid #D9E0E8 !important;
          border-radius: 6px !important;
          padding: 3px 8px !important;
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #344054;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
        }
        .rw-district-tip::before { display: none; }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
