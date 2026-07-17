"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/auth";
import { useAuth } from "../context/auth-context";

/* ── New road_repair request type ───────────────────────────────── */
type RepairRequest = {
  id: number;
  title: string;
  address: string;
  status: string;
  planned_start_date: string;
  planned_end_date: string;
  is_overdue: boolean;
  days_remaining: number | null;
  days_overdue: number | null;
  created_at: string;
};

/* ── Helpers ─────────────────────────────────────────────────────── */
const REQUEST_STATUS_LABELS: Record<string, string> = {
  draft:          "Черновик",
  pending_review: "На проверке",
  needs_revision: "На доработке",
  active:         "Активный",
  completed:      "Завершён",
  cancelled:      "Аннулирован",
};
const REQUEST_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:          { bg: "#F2F4F7", text: "#667085" },
  pending_review: { bg: "#FFF7E6", text: "#B76E00" },
  needs_revision: { bg: "#FFF2F2", text: "#D92D20" },
  active:         { bg: "#E6F6EF", text: "#027A48" },
  completed:      { bg: "#DCECF8", text: "#12345B" },
  cancelled:      { bg: "#F2F4F7", text: "#98A2B3" },
};

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ── Sub-components ──────────────────────────────────────────────── */
function StatCard({
  label, value, sub, color, isLoading,
}: {
  label: string; value: string | number; sub?: string;
  color: "navy" | "blue" | "green" | "orange"; isLoading: boolean;
}) {
  const palette = {
    navy:   { bg: "#12345B", text: "white",   accent: "#DCECF8" },
    blue:   { bg: "#DCECF8", text: "#12345B", accent: "#2F80C9" },
    green:  { bg: "#D3F2E7", text: "#14643E", accent: "#22A06B" },
    orange: { bg: "#FEF0DB", text: "#7A4800", accent: "#F59E42" },
  };
  const p = palette[color];
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: p.bg }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: p.accent, opacity: 0.9 }}>
        {label}
      </p>
      {isLoading ? (
        <div className="h-8 w-16 rounded animate-pulse bg-current opacity-10" />
      ) : (
        <p className="text-3xl font-bold tabular-nums" style={{ color: p.text }}>{value}</p>
      )}
      {sub && <p className="text-xs opacity-60" style={{ color: p.text }}>{sub}</p>}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests]   = useState<RepairRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ results?: RepairRequest[] } | RepairRequest[]>("/api/v1/road-repair/requests/?page_size=100")
      .then((data) => {
        if (Array.isArray(data)) setRequests(data);
        else if (data && "results" in data && Array.isArray(data.results)) setRequests(data.results);
        else setRequests([]);
      })
      .catch((e: unknown) => setRequestsError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setRequestsLoading(false));
  }, []);

  const reqActive    = requests.filter((r) => r.status === "active").length;
  const reqPending   = requests.filter((r) => r.status === "pending_review").length;
  const reqCompleted = requests.filter((r) => r.status === "completed").length;
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`.trim()
    : user?.email ?? "";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6)  return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  })();

  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ─────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-7 py-6"
        style={{
          background: "linear-gradient(135deg, #06152A 0%, #0D2344 55%, #12345B 100%)",
          boxShadow: "0 4px 24px rgba(18,52,91,0.18)",
        }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow */}
        <div
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(47,128,201,0.18) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            {user?.organization_name && (
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: "rgba(125,211,252,0.7)" }}>
                {user.organization_name}
              </p>
            )}
            <h2 className="text-[22px] font-bold text-white leading-tight">
              {greeting}{displayName ? `, ${displayName.split(" ")[0]}` : ""}!
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {today.charAt(0).toUpperCase() + today.slice(1)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/repairs/new"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-[8px] text-sm font-medium transition-colors"
              style={{ background: "rgba(47,128,201,0.25)", color: "#7DD3FC", border: "1px solid rgba(125,211,252,0.25)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"/>
              </svg>
              Новая заявка
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section: Road repair requests ──────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1D2939]">Заявки на ремонт</h2>
            <p className="text-xs text-[#98A2B3] mt-0.5">Заявки на проведение дорожных ремонтных работ</p>
          </div>
          <Link
            href="/dashboard/repairs"
            className="inline-flex items-center gap-1 text-sm text-[#2F80C9] font-medium hover:underline"
          >
            Все заявки <ChevronIcon />
          </Link>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Всего заявок"  value={requests.length} color="navy"   isLoading={requestsLoading} />
          <StatCard label="Активных"       value={reqActive}        color="green"  isLoading={requestsLoading} />
          <StatCard label="На проверке"    value={reqPending}        color="orange" isLoading={requestsLoading} />
          <StatCard label="Завершено"      value={reqCompleted}      color="blue"   isLoading={requestsLoading} />
        </div>

        {/* Recent requests */}
        <div className="bg-white rounded-xl border border-[#D9E0E8] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#D9E0E8]">
            <h3 className="text-sm font-semibold text-[#1D2939]">Последние заявки</h3>
            <Link href="/dashboard/repairs/new"
              className="text-xs font-medium text-white bg-[#12345B] hover:bg-[#0A223D] transition-colors px-3 py-1.5 rounded-[5px]">
              + Новая заявка
            </Link>
          </div>

          {requestsLoading && (
            <div className="flex items-center justify-center h-36 text-[#98A2B3] text-sm">Загрузка…</div>
          )}
          {!requestsLoading && requestsError && (
            <div className="flex items-center justify-center h-36 text-[#D92D20] text-sm">{requestsError}</div>
          )}
          {!requestsLoading && !requestsError && requests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-36 gap-3 text-[#98A2B3]">
              <p className="text-sm">Заявок пока нет</p>
              <Link href="/dashboard/repairs/new"
                className="text-xs text-[#2F80C9] font-medium hover:underline">
                Создать первую заявку
              </Link>
            </div>
          )}
          {!requestsLoading && !requestsError && recentRequests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F7F9FC] border-b border-[#D9E0E8] divide-x divide-[#D9E0E8]">
                    <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">№</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Название</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Адрес</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Статус</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Период</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((req, i) => {
                    const s = REQUEST_STATUS_COLORS[req.status] ?? { bg: "#F2F4F7", text: "#667085" };
                    return (
                      <tr key={req.id}
                        className={[
                          "border-b border-[#F2F4F7] hover:bg-[#F7F9FC] transition-colors divide-x divide-[#F2F4F7]",
                          i === recentRequests.length - 1 ? "border-b-0" : "",
                        ].join(" ")}>
                        <td className="px-5 py-3 text-[#98A2B3] font-mono text-xs">{req.id}</td>
                        <td className="px-4 py-3 max-w-[260px]">
                          <Link href={`/dashboard/repairs/${req.id}`}
                            className="font-medium text-[#12345B] hover:underline line-clamp-1">
                            {req.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#667085] max-w-[200px]">
                          <span className="line-clamp-1">{req.address || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: s.bg, color: s.text }}>
                            {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#667085] text-xs whitespace-nowrap">
                          {formatDate(req.planned_start_date)} — {formatDate(req.planned_end_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
