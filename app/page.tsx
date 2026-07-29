"use client";

import { useEffect, useState } from "react";
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

export default function PublicLandingPage() {
  const [repairs, setRepairs] = useState<PublicRepair[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/road-repair/public-repairs/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRepairs(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const withGeo = repairs.filter((r) => r.geometry);

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>

        {/* ── Full-screen map ──────────────────────────────────────── */}
        <div style={{ position: "absolute", inset: 0 }}>
          <PublicMapView key={loaded ? "loaded" : "loading"} repairs={repairs} />
        </div>

        {/* ── Top header overlay ───────────────────────────────────── */}
        <header
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 800,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "linear-gradient(135deg, rgba(6,21,42,0.96) 0%, rgba(13,35,68,0.94) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Grid texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              pointerEvents: "none",
            }}
          />

          {/* Logos */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
            <Image
              src="/remontnye_raboty_logo.svg"
              alt="Ремонтные работы"
              width={700}
              height={200}
              style={{ height: 36, width: "auto" }}
              priority
              unoptimized
            />
            <div
              style={{
                width: 1,
                height: 28,
                background: "rgba(255,255,255,0.2)",
              }}
            />
            <Image
              src="/logo_sc.png"
              alt="SC"
              width={400}
              height={120}
              style={{ height: 36, width: "auto" }}
              priority
              unoptimized
            />
          </div>

          {/* Center title */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Карта ремонтных работ
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                margin: "2px 0 0",
                letterSpacing: "0.04em",
              }}
            >
              г. Алматы
            </p>
          </div>

          {/* Login button */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 38,
                padding: "0 18px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #2F80C9, #1a5fa0)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.03em",
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(47,128,201,0.4)",
                transition: "box-shadow .2s, transform .15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(47,128,201,0.65)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(47,128,201,0.4)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
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

        {/* ── Bottom info strip ────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 800,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "linear-gradient(135deg, rgba(6,21,42,0.94) 0%, rgba(13,35,68,0.92) 100%)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Active count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#027A48",
                display: "inline-block",
                animation: "pulse-dot 2s ease-in-out infinite",
                boxShadow: "0 0 0 3px rgba(2,122,72,0.25)",
              }}
            />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
              {loaded ? withGeo.length : "—"} активных{" "}
              <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
                {withGeo.length === 1 ? "объект" : withGeo.length >= 2 && withGeo.length <= 4 ? "объекта" : "объектов"}
              </span>
            </span>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="6" viewBox="0 0 20 6" fill="none">
                <rect y="1" width="20" height="4" rx="2" fill="#027A48" fillOpacity="0.85" />
              </svg>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Активный ремонт</span>
            </div>
          </div>

          {/* Right: attribution hint */}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            Управление строительства города Алматы
          </span>
        </div>

      </div>
    </>
  );
}
