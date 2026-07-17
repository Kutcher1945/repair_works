"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "../../lib/auth";
import type { User } from "../../lib/auth";
import type { MapRepairRequest } from "../_components/RepairMap";

const RepairMap = dynamic(() => import("../_components/RepairMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#F7F9FC] text-[#2F80C9]">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="animate-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </div>
  ),
});

const STATUS_LABELS: Record<string, string> = {
  draft:          "Черновик",
  pending_review: "На проверке",
  needs_revision: "На доработке",
  active:         "Активный ремонт",
  completed:      "Завершён",
  cancelled:      "Аннулирован",
};

const STATUS_DOT: Record<string, string> = {
  draft:          "#667085",
  pending_review: "#B76E00",
  needs_revision: "#D92D20",
  active:         "#027A48",
  completed:      "#12345B",
  cancelled:      "#D0D5DD",
};

type ApiResponse = { results?: MapRepairRequest[] } | MapRepairRequest[];

function toArr(r: ApiResponse): MapRepairRequest[] {
  return Array.isArray(r) ? r : (r.results ?? []);
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin text-[#2F80C9]">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function MapPage() {
  const [all,     setAll]     = useState<MapRepairRequest[]>([]);
  const [me,      setMe]      = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [fStatus, setFStatus] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<ApiResponse>("/api/v1/road-repair/requests/?page_size=1000"),
      apiFetch<User>("/api/v1/common/auth/me/"),
    ])
      .then(([rd, user]) => {
        setAll(toArr(rd).filter((r) => !(r as { is_deleted?: boolean }).is_deleted));
        setMe(user);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => all.filter((r) => !fStatus || r.status === fStatus),
    [all, fStatus]
  );

  const withGeo    = filtered.filter((r) => r.geometry);
  const withoutGeo = filtered.filter((r) => !r.geometry);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of all) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }, [all]);

  const isAdmin = me?.role === "admin";

  return (
    <div className="flex flex-col gap-3" style={{ height: "calc(100dvh - 56px - 48px)" }}>

      {/* ── Filter / stats bar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap flex-shrink-0">

        {/* Role badge */}
        <div className={[
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
          isAdmin
            ? "bg-[#DCECF8] text-[#12345B]"
            : "bg-[#E6F6EF] text-[#027A48]",
        ].join(" ")}>
          <span className={[
            "w-1.5 h-1.5 rounded-full",
            isAdmin ? "bg-[#12345B]" : "bg-[#027A48]",
          ].join(" ")} />
          {loading
            ? "Загрузка…"
            : isAdmin
              ? `Все организации · ${all.length} заявок`
              : `Ваша организация · ${all.length} заявок`}
        </div>

        {/* Status filter */}
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
          className="h-9 pl-3 pr-8 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27%3E%3Cpath d=%27M6 9l6 6 6-6%27 stroke=%27%2398A2B3%27 stroke-width=%272.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center]"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l} {statusCounts[v] ? `(${statusCounts[v]})` : ""}</option>
          ))}
        </select>

        {/* On-map count */}
        {!loading && (
          <span className="text-xs text-[#667085]">
            На карте: <span className="font-semibold text-[#1D2939]">{withGeo.length}</span>
            {withoutGeo.length > 0 && (
              <span className="ml-2 text-[#98A2B3]">· без геометрии: {withoutGeo.length}</span>
            )}
          </span>
        )}

        {loading && <SpinnerIcon />}
      </div>

      {/* ── Map area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-3">

        {/* Map */}
        <div className="flex-1 min-w-0 rounded-[10px] overflow-hidden border border-[#D9E0E8] relative">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-[#D92D20] bg-[#FFF2F2] border border-[#D92D20]/30 rounded-[8px] px-5 py-4">{error}</p>
            </div>
          ) : (
            <RepairMap requests={withGeo} />
          )}

          {/* Legend overlay */}
          <div
            className="absolute bottom-5 left-4 z-[400] bg-white/95 backdrop-blur-sm rounded-[8px] border border-[#D9E0E8] px-3 py-2.5 shadow-sm"
            style={{ pointerEvents: "none" }}
          >
            <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-2">Статусы</p>
            <div className="space-y-1.5">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                statusCounts[status] ? (
                  <div key={status} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: STATUS_DOT[status] }}
                    />
                    <span className="text-[11px] text-[#344054]">{label}</span>
                    <span className="text-[10px] text-[#98A2B3] ml-auto pl-2">{statusCounts[status]}</span>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        </div>

        {/* Side panel — requests without geometry */}
        {withoutGeo.length > 0 && (
          <div className="w-72 flex-shrink-0 flex flex-col bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F2F4F7]">
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide">
                Без геометрии · {withoutGeo.length}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F7F9FC]">
              {withoutGeo.map((req) => (
                <a
                  key={req.id}
                  href={`/dashboard/repairs/${req.id}`}
                  className="flex flex-col px-4 py-3 hover:bg-[#F7F9FC] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: STATUS_DOT[req.status] }}
                    />
                    <span className="text-[10px] font-semibold" style={{ color: STATUS_DOT[req.status] }}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                    <span className="text-[10px] text-[#C4CBD8] ml-auto">#{req.id}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#1D2939] line-clamp-1">{req.title}</p>
                  {req.address && (
                    <p className="text-[11px] text-[#98A2B3] mt-0.5 line-clamp-1">{req.address}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
