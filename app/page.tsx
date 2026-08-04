"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PublicRepair } from "./_components/PublicMapView";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PublicMapView = dynamic(() => import("./_components/PublicMapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(160deg, #06152A 0%, #0D2344 50%, #12345B 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: "#2F80C9" }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ animationName: "spin", animationDuration: "1s", animationTimingFunction: "linear", animationIterationCount: "infinite" }} />
      </svg>
    </div>
  ),
});

function geomTypeLabel(type: string): string {
  if (type === "LineString" || type === "MultiLineString") return "Линия";
  if (type === "Polygon" || type === "MultiPolygon") return "Полигон";
  return "Точка";
}

export default function PublicLandingPage() {
  const [repairs, setRepairs]       = useState<PublicRepair[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [boundary, setBoundary]     = useState<any | null>(null);
  const [loaded, setLoaded]         = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch]         = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/v1/road-repair/public-repairs/`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setRepairs(Array.isArray(data) ? data : (data.results ?? [])))
        .catch(() => {}),
      fetch("/almaty.geo.json")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setBoundary(data); })
        .catch(() => {}),
    ]).finally(() => setLoaded(true));
  }, []);

  const withGeo = repairs.filter((r) => r.geometry);

  const filtered = useMemo(() => {
    const raw = search.trim().toLowerCase();
    if (!raw) return withGeo;

    // Normalize common Kazakh/Russian street abbreviations so "ул абай" matches "улица абая"
    const normalize = (s: string) =>
      s
        .replace(/\bул\b\.?/g, "улица")
        .replace(/\bпр\b\.?/g, "проспект")
        .replace(/\bпр-т\b\.?/g, "проспект")
        .replace(/\bпр-кт\b\.?/g, "проспект")
        .replace(/\bпер\b\.?/g, "переулок")
        .replace(/\bмкр\b\.?/g, "микрорайон")
        .replace(/\bд\b\.?/g, "дом")
        .replace(/[-–—,./()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const q = normalize(raw);

    const haystack = (r: PublicRepair) =>
      normalize(
        [r.title, r.address, r.road_section, r.district, r.organization_name, r.contractor_name]
          .filter(Boolean)
          .join(" ")
      );

    // All query tokens must appear somewhere in the haystack
    const tokens = q.split(/\s+/).filter(Boolean);
    return withGeo.filter((r) => {
      const hay = haystack(r);
      return tokens.every((t) => hay.includes(t));
    });
  }, [withGeo, search]);

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .rw-sidebar-item:hover { background: rgba(255,255,255,0.06) !important; }
        .rw-sidebar-item.active { background: rgba(2,122,72,0.15) !important; border-left-color: #027A48 !important; }
        .rw-search:focus { outline: none; border-color: rgba(47,128,201,0.7) !important; background: rgba(255,255,255,0.07) !important; }
        .rw-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .rw-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .rw-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>

        {/* ── Full-screen map ──────────────────────────────────── */}
        <div style={{ position: "absolute", inset: 0 }}>
          <PublicMapView
            key={loaded ? "loaded" : "loading"}
            repairs={repairs}
            boundary={boundary}
            selectedId={selectedId}
          />
        </div>

        {/* ── Top header ───────────────────────────────────────── */}
        <header
          style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 800,
            height: 64, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 24px",
            background: "linear-gradient(135deg, rgba(6,21,42,0.96) 0%, rgba(13,35,68,0.94) 100%)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
            <Image src="/remontnye_raboty_logo.svg" alt="Ремонтные работы" width={700} height={200} style={{ height: 36, width: "auto" }} priority unoptimized />
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.2)" }} />
            <Image src="/logo_sc.png" alt="SC" width={400} height={120} style={{ height: 36, width: "auto" }} priority unoptimized />
          </div>

          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 1, pointerEvents: "none" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0, lineHeight: 1.2 }}>Карта ремонтных работ</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0", letterSpacing: "0.04em" }}>г. Алматы</p>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 18px", borderRadius: 8, background: "linear-gradient(135deg, #2F80C9, #1a5fa0)", color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", textDecoration: "none", boxShadow: "0 4px 16px rgba(47,128,201,0.4)", transition: "box-shadow .2s, transform .15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(47,128,201,0.65)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(47,128,201,0.4)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              Войти
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          </div>
        </header>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside
          style={{
            position: "absolute",
            top: 64,
            right: 0,
            bottom: 48,
            zIndex: 799,
            width: sidebarOpen ? 320 : 0,
            overflow: "hidden",
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(180deg, rgba(6,21,42,0.97) 0%, rgba(10,28,58,0.96) 100%)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ width: 320, display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Header */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Активные ремонты
                </span>
                <span style={{ background: "#027A48", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>
                  {loaded ? withGeo.length : "…"}
                </span>
              </div>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  className="rw-search"
                  type="text"
                  placeholder="Улица, адрес, район, подрядчик…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "8px 10px 8px 32px",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 12,
                    transition: "border-color .15s, background .15s",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0, lineHeight: 1 }}
                    aria-label="Очистить поиск"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              {search && (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  {filtered.length} из {withGeo.length} объектов
                </p>
              )}
            </div>

            {/* List */}
            <div className="rw-sidebar-scroll" style={{ flex: 1, overflowY: "auto" }}>
              {!loaded ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Загрузка…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                    {search ? "Ничего не найдено" : "Нет активных объектов"}
                  </p>
                </div>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    className={`rw-sidebar-item${selectedId === r.id ? " active" : ""}`}
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      borderLeft: "3px solid transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "background .15s, border-left-color .15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#027A48", flexShrink: 0, marginTop: 4, boxShadow: "0 0 0 2px rgba(2,122,72,0.25)" }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.88)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.title}
                        </p>
                        {r.address && (
                          <p style={{ margin: "0 0 5px", fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.address}
                          </p>
                        )}
                        {r.geometry && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#027A48", background: "rgba(2,122,72,0.15)", padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>
                            {geomTypeLabel(r.geometry.type)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── Sidebar toggle button ─────────────────────────────── */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          title={sidebarOpen ? "Скрыть список" : "Показать список"}
          style={{
            position: "absolute",
            top: "50%",
            right: sidebarOpen ? 320 : 0,
            transform: "translateY(-50%)",
            zIndex: 800,
            width: 28,
            height: 52,
            background: "rgba(6,21,42,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRight: "none",
            borderRadius: "6px 0 0 6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "right 0.25s cubic-bezier(0.4,0,0.2,1)",
            color: "rgba(255,255,255,0.5)",
          }}
          aria-label={sidebarOpen ? "Скрыть панель" : "Открыть панель"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            {sidebarOpen
              ? <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            }
          </svg>
        </button>

        {/* ── Bottom strip ─────────────────────────────────────── */}
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 800,
            height: 48, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 24px",
            background: "linear-gradient(135deg, rgba(6,21,42,0.94) 0%, rgba(13,35,68,0.92) 100%)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#027A48", display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite", boxShadow: "0 0 0 3px rgba(2,122,72,0.25)" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
              {loaded ? withGeo.length : "—"} активных{" "}
              <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
                {withGeo.length === 1 ? "объект" : withGeo.length >= 2 && withGeo.length <= 4 ? "объекта" : "объектов"}
              </span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="20" height="6" viewBox="0 0 20 6" fill="none"><rect y="1" width="20" height="4" rx="2" fill="#027A48" fillOpacity="0.85" /></svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Активный ремонт</span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Управление строительства города Алматы</span>
        </div>

      </div>
    </>
  );
}
