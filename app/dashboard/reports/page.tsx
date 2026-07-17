"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/auth";
import { useAuth } from "../../context/auth-context";

// ── Types ───────────────────────────────────────────────────────────────────
type Request = {
  id: number;
  title: string;
  status: string;
  organization_name: string;
  planned_start_date: string;
  planned_end_date: string;
  is_overdue: boolean;
  days_overdue: number;
  days_remaining: number;
  district: number | { id: number; name_ru?: string | null; name_kz?: string | null } | null;
  address: string;
  created_at: string;
};
type ApiResponse = { results?: Request[] } | Request[];
function toArr(r: ApiResponse): Request[] {
  return Array.isArray(r) ? r : (r.results ?? []);
}

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик", pending_review: "На проверке", needs_revision: "На доработке",
  active: "Активный", completed: "Завершён", cancelled: "Аннулирован",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#98A2B3", pending_review: "#F59E42", needs_revision: "#D92D20",
  active: "#027A48", completed: "#2F80C9", cancelled: "#D0D5DD",
};
const STATUS_BG: Record<string, string> = {
  draft: "#F2F4F7", pending_review: "#FFF7E6", needs_revision: "#FFF2F2",
  active: "#E6F6EF", completed: "#DCECF8", cancelled: "#F7F9FC",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function pluralDays(n: number) {
  const a = n % 100, b = a % 10;
  if (a > 10 && a < 20) return "дней";
  if (b === 1) return "день";
  if (b >= 2 && b <= 4) return "дня";
  return "дней";
}
function districtName(d: Request["district"]): string {
  if (!d) return "—";
  if (typeof d === "number") return `Район ${d}`;
  return d.name_ru ?? d.name_kz ?? `Район ${d.id}`;
}

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-24 text-[#2F80C9]">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="animate-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: string | number; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] px-5 py-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: accent + "18" }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#98A2B3] uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold tabular-nums" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[11px] text-[#98A2B3] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ requests }: { requests: Request[] }) {
  const items = ["active", "pending_review", "needs_revision", "completed", "cancelled", "draft"];
  const counts = items.map(s => ({ s, n: requests.filter(r => r.status === s).length })).filter(x => x.n > 0);
  const total = counts.reduce((a, x) => a + x.n, 0);
  if (total === 0) return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] p-5">
      <p className="text-sm font-semibold text-[#1D2939] mb-2">Распределение</p>
      <p className="text-sm text-[#98A2B3]">Нет данных</p>
    </div>
  );

  const R = 52, circ = 2 * Math.PI * R;
  let off = 0;
  const segs = counts.map(({ s, n }) => {
    const dash = (n / total) * circ;
    const seg = { s, n, dash, off };
    off += dash;
    return seg;
  });

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] p-5">
      <h3 className="text-sm font-semibold text-[#1D2939] mb-4">Распределение по статусам</h3>
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#F2F4F7" strokeWidth="14" />
            {segs.map(({ s, dash, off: o }) => (
              <circle key={s} cx="60" cy="60" r={R} fill="none"
                stroke={STATUS_COLOR[s]} strokeWidth="14"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-o}
                style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[#1D2939]">{total}</span>
            <span className="text-[10px] text-[#98A2B3]">заявок</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {segs.map(({ s, n }) => (
            <div key={s} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[s] }} />
              <span className="text-[11px] text-[#667085] flex-1 truncate">{STATUS_LABELS[s]}</span>
              <span className="text-[11px] font-semibold text-[#344054]">{n}</span>
              <span className="text-[10px] text-[#98A2B3] w-7 text-right">{Math.round(n / total * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Monthly Bar Chart ────────────────────────────────────────────────────────
function MonthlyChart({ requests }: { requests: Request[] }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
      const reqs = requests.filter(r => r.created_at?.startsWith(key));
      return { key, label, total: reqs.length, completed: reqs.filter(r => r.status === "completed").length, active: reqs.filter(r => r.status === "active").length };
    });
  }, [requests]);

  const maxVal = Math.max(...months.map(m => m.total), 1);
  const H = 110;

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1D2939]">Динамика создания заявок</h3>
          <p className="text-[11px] text-[#98A2B3] mt-0.5">Последние 7 месяцев</p>
        </div>
        <div className="flex items-center gap-3">
          {[["#DCECF8", "Создано"], ["#2F80C9", "Завершено"], ["#D3F2E7", "Активных"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: c }} />
              <span className="text-[10px] text-[#98A2B3]">{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-2" style={{ height: H + 36 }}>
        {months.map((m) => {
          const barH = Math.max(m.total > 0 ? 4 : 0, (m.total / maxVal) * H);
          const compH = m.total > 0 ? Math.round((m.completed / m.total) * barH) : 0;
          const actH  = m.total > 0 ? Math.round((m.active  / m.total) * barH) : 0;
          const restH = Math.max(0, barH - compH - actH);
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group">
              <span className="text-[10px] font-semibold text-[#667085] opacity-0 group-hover:opacity-100 transition-opacity">
                {m.total || ""}
              </span>
              <div className="w-full flex flex-col justify-end rounded-t-[4px] overflow-hidden relative"
                style={{ height: H }}>
                {m.total > 0 && (
                  <div className="w-full flex flex-col" style={{ height: barH }}>
                    {compH > 0 && <div className="w-full" style={{ height: compH, background: "#2F80C9" }} />}
                    {actH  > 0 && <div className="w-full" style={{ height: actH,  background: "#22A06B" }} />}
                    {restH > 0 && <div className="w-full rounded-t-[4px]" style={{ height: restH, background: "#DCECF8" }} />}
                  </div>
                )}
                {m.total === 0 && (
                  <div className="w-full h-[3px] rounded" style={{ background: "#F2F4F7" }} />
                )}
              </div>
              <span className="text-[10px] text-[#98A2B3] capitalize">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ value, label, color, size = 68 }: { value: number; label: string; color: string; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / 100, 1) * circ;
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2F4F7" strokeWidth="5" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transform: `rotate(-90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[13px] font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-[11px] text-[#667085] text-center leading-tight">{label}</span>
    </div>
  );
}

// ── District Table ───────────────────────────────────────────────────────────
function DistrictTable({ requests }: { requests: Request[] }) {
  const rows = useMemo(() => {
    const map: Record<string, { total: number; active: number; overdue: number }> = {};
    for (const r of requests) {
      const key = districtName(r.district);
      if (!map[key]) map[key] = { total: 0, active: 0, overdue: 0 };
      map[key].total++;
      if (r.status === "active") map[key].active++;
      if (r.is_overdue && !["completed", "cancelled"].includes(r.status)) map[key].overdue++;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [requests]);

  const maxTotal = Math.max(...rows.map(r => r.total), 1);

  if (rows.length === 0 || (rows.length === 1 && rows[0].name === "—")) return null;

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F2F4F7]">
        <h3 className="text-sm font-semibold text-[#1D2939]">По районам</h3>
      </div>
      <div className="divide-y divide-[#F7F9FC]">
        {rows.map((row) => {
          const pct = Math.round((row.total / maxTotal) * 100);
          return (
            <div key={row.name} className="px-5 py-3 hover:bg-[#F7F9FC] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-[#344054] font-medium truncate flex-1 mr-4">{row.name}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-semibold text-[#1D2939]">{row.total}</span>
                  {row.active > 0 && (
                    <span className="text-[11px] text-[#027A48] font-medium">{row.active} акт.</span>
                  )}
                  {row.overdue > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF2F2] text-[#D92D20]">
                      !{row.overdue}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-[#F2F4F7] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#2F80C9] transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Expiring Soon ────────────────────────────────────────────────────────────
function ExpiringSoon({ requests }: { requests: Request[] }) {
  const soon = requests
    .filter(r => !r.is_overdue && !["completed", "cancelled", "draft"].includes(r.status) && (r.days_remaining ?? 999) <= 14)
    .sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0))
    .slice(0, 5);

  if (soon.length === 0) return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] p-5">
      <h3 className="text-sm font-semibold text-[#1D2939] mb-3">Истекает в ближайшие 2 недели</h3>
      <p className="text-sm text-[#027A48] flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-[#E6F6EF] flex items-center justify-center text-[10px]">✓</span>
        Критических сроков нет
      </p>
    </div>
  );

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F2F4F7] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1D2939]">Истекает в ближайшие 2 недели</h3>
        <span className="text-xs font-semibold text-white rounded-full px-2 py-0.5"
          style={{ background: "#F59E42" }}>{soon.length}</span>
      </div>
      <div className="divide-y divide-[#F7F9FC]">
        {soon.map(r => {
          const d = r.days_remaining ?? 0;
          const color = d <= 3 ? "#D92D20" : d <= 7 ? "#F59E42" : "#667085";
          return (
            <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#FFFBF5] transition-colors">
              <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ background: color + "18" }}>
                <span className="text-[11px] font-bold" style={{ color }}>{d}</span>
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/dashboard/repairs/${r.id}`}
                  className="text-sm font-medium text-[#1D2939] hover:text-[#2F80C9] line-clamp-1 transition-colors">
                  {r.title}
                </Link>
                <p className="text-[11px] text-[#98A2B3]">{pluralDays(d)} · {fmtDate(r.planned_end_date)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Overdue Table ────────────────────────────────────────────────────────────
function OverdueTable({ requests }: { requests: Request[] }) {
  const overdue = requests
    .filter(r => r.is_overdue && !["completed", "cancelled"].includes(r.status))
    .sort((a, b) => b.days_overdue - a.days_overdue);

  if (overdue.length === 0) return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] p-5">
      <h3 className="text-sm font-semibold text-[#1D2939] mb-3">Просроченные заявки</h3>
      <p className="text-sm text-[#027A48] flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-[#E6F6EF] flex items-center justify-center text-[10px]">✓</span>
        Просроченных заявок нет
      </p>
    </div>
  );

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F2F4F7] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1D2939]">Просроченные заявки</h3>
        <span className="text-xs font-semibold text-white bg-[#D92D20] rounded-full px-2 py-0.5">{overdue.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F2F4F7] bg-[#FAFBFC]">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-[#667085]">Заявка</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#667085]">Статус</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#667085]">Срок</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-[#D92D20]">Просрочка</th>
            </tr>
          </thead>
          <tbody>
            {overdue.map(r => (
              <tr key={r.id} className="border-b border-[#F7F9FC] hover:bg-[#FFFBFB] transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/dashboard/repairs/${r.id}`}
                    className="text-[#12345B] font-medium hover:underline line-clamp-1">{r.title}</Link>
                  <p className="text-xs text-[#98A2B3] mt-0.5">{r.address || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: STATUS_BG[r.status], color: STATUS_COLOR[r.status] }}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#667085]">{fmtDate(r.planned_end_date)}</td>
                <td className="px-5 py-3 text-right">
                  <span className="text-xs font-bold text-[#D92D20]">+{r.days_overdue} {pluralDays(r.days_overdue)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Org Table ────────────────────────────────────────────────────────────────
function OrgTable({ requests }: { requests: Request[] }) {
  const orgs = useMemo(() => {
    const map: Record<string, Request[]> = {};
    for (const r of requests) {
      const key = r.organization_name || "—";
      (map[key] = map[key] ?? []).push(r);
    }
    return Object.entries(map).map(([name, reqs]) => ({
      name,
      total:   reqs.length,
      active:  reqs.filter(r => r.status === "active").length,
      pending: reqs.filter(r => r.status === "pending_review").length,
      revision:reqs.filter(r => r.status === "needs_revision").length,
      done:    reqs.filter(r => r.status === "completed").length,
      overdue: reqs.filter(r => r.is_overdue && !["completed","cancelled"].includes(r.status)).length,
      rate:    reqs.length > 0 ? Math.round(reqs.filter(r => r.status === "completed").length / reqs.length * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [requests]);

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[12px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F2F4F7]">
        <h3 className="text-sm font-semibold text-[#1D2939]">Сводка по организациям</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F2F4F7] bg-[#FAFBFC]">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-[#667085]">Организация</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#667085]">Всего</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#027A48]">Акт.</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#B76E00]">Пров.</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#D92D20]">Дораб.</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#2F80C9]">Заверш.</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#D92D20]">Просроч.</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#667085]">Выполнение</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org.name} className="border-b border-[#F7F9FC] hover:bg-[#F7F9FC] transition-colors">
                <td className="px-5 py-3 font-medium text-[#1D2939] max-w-[200px]">
                  <span className="line-clamp-1">{org.name}</span>
                </td>
                <td className="px-3 py-3 text-center font-semibold text-[#344054]">{org.total}</td>
                <td className="px-3 py-3 text-center">
                  {org.active > 0 ? <span className="font-semibold text-[#027A48]">{org.active}</span> : <span className="text-[#D0D5DD]">—</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {org.pending > 0 ? <span className="font-semibold text-[#B76E00]">{org.pending}</span> : <span className="text-[#D0D5DD]">—</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {org.revision > 0 ? <span className="font-semibold text-[#D92D20]">{org.revision}</span> : <span className="text-[#D0D5DD]">—</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {org.done > 0 ? <span className="font-semibold text-[#2F80C9]">{org.done}</span> : <span className="text-[#D0D5DD]">—</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {org.overdue > 0
                    ? <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FFF2F2] text-[#D92D20]">{org.overdue}</span>
                    : <span className="text-[#D0D5DD]">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#F2F4F7] rounded-full overflow-hidden" style={{ minWidth: 48 }}>
                      <div className="h-full rounded-full bg-[#2F80C9]" style={{ width: `${org.rate}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-[#344054] w-8">{org.rate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuth();
  const [all,     setAll]     = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ApiResponse>("/api/v1/road-repair/requests/?page_size=1000")
      .then(data => setAll(toArr(data).filter(r => !(r as { is_deleted?: boolean }).is_deleted)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === "admin";

  const stats = useMemo(() => {
    const active    = all.filter(r => r.status === "active").length;
    const pending   = all.filter(r => r.status === "pending_review").length;
    const revision  = all.filter(r => r.status === "needs_revision").length;
    const completed = all.filter(r => r.status === "completed").length;
    const overdue   = all.filter(r => r.is_overdue && !["completed","cancelled"].includes(r.status)).length;
    const draft     = all.filter(r => r.status === "draft").length;
    const cancelled = all.filter(r => r.status === "cancelled").length;
    const nonDraft  = all.filter(r => r.status !== "draft").length;
    const completionRate = nonDraft > 0 ? Math.round(completed / nonDraft * 100) : 0;
    const onTimeRate = completed > 0
      ? Math.round(all.filter(r => r.status === "completed" && !r.is_overdue).length / completed * 100)
      : 0;
    return { active, pending, revision, completed, overdue, draft, cancelled, completionRate, onTimeRate };
  }, [all]);

  if (loading) return <Spinner />;
  if (error) return (
    <div className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">{error}</div>
  );

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`.trim()
    : user?.email ?? "";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return "Доброй ночи"; if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день"; return "Добрый вечер";
  })();

  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl px-7 py-6"
        style={{ background: "linear-gradient(135deg, #06152A 0%, #0D2344 55%, #12345B 100%)", boxShadow: "0 4px 24px rgba(18,52,91,0.18)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(47,128,201,0.18) 0%,transparent 70%)" }} />
        <div className="relative z-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: "rgba(125,211,252,0.7)" }}>
              {isAdmin ? "Сводная аналитика" : (user?.organization_name ?? "Аналитика")}
            </p>
            <h2 className="text-[22px] font-bold text-white leading-tight">
              {greeting}{displayName ? `, ${displayName.split(" ")[0]}` : ""}!
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {today.charAt(0).toUpperCase() + today.slice(1)}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "Всего заявок", value: all.length },
              { label: "Активных", value: stats.active },
              { label: "Просрочено", value: stats.overdue },
            ].map(({ label, value }) => (
              <div key={label} className="text-right">
                <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Всего" value={all.length} accent="#344054"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.75"/><path d="M8 12h8M8 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
        <KpiCard label="Активных" value={stats.active} accent="#027A48"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
        <KpiCard label="На проверке" value={stats.pending} accent="#B76E00"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>} />
        <KpiCard label="На доработке" value={stats.revision} accent="#D92D20"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>} />
        <KpiCard label="Завершено" value={stats.completed} sub={`${stats.completionRate}% от поданных`} accent="#2F80C9"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
        <KpiCard label="Просрочено" value={stats.overdue} accent={stats.overdue > 0 ? "#D92D20" : "#027A48"}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>} />
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_320px] gap-5 items-start">

        {/* Left column */}
        <div className="space-y-5">
          <MonthlyChart requests={all} />
          {isAdmin && <OrgTable requests={all} />}
          <OverdueTable requests={all} />
          <DistrictTable requests={all} />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <DonutChart requests={all} />

          {/* Performance */}
          <div className="bg-white border border-[#D9E0E8] rounded-[12px] p-5">
            <h3 className="text-sm font-semibold text-[#1D2939] mb-4">Показатели выполнения</h3>
            <div className="flex items-center justify-around">
              <ProgressRing value={stats.completionRate} label="Выполнено" color="#2F80C9" />
              <ProgressRing value={stats.onTimeRate} label="В срок" color="#027A48" />
              <ProgressRing value={stats.overdue > 0 ? Math.round(stats.overdue / Math.max(all.length, 1) * 100) : 0} label="Просрочено" color="#D92D20" />
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white border border-[#D9E0E8] rounded-[12px] p-5">
            <h3 className="text-sm font-semibold text-[#1D2939] mb-3">Дополнительно</h3>
            <div className="space-y-0">
              {[
                { label: "Черновики",         value: stats.draft,     color: "#98A2B3" },
                { label: "Аннулировано",      value: stats.cancelled, color: "#98A2B3" },
                { label: "Ожидают проверки",  value: stats.pending,   color: "#B76E00" },
                { label: "На доработке",      value: stats.revision,  color: "#D92D20" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#F7F9FC] last:border-0">
                  <span className="text-sm text-[#667085]">{label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <ExpiringSoon requests={all} />
        </div>
      </div>
    </div>
  );
}
