"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { apiFetch } from "../../lib/auth";

/* ── Types ──────────────────────────────────────────────────────── */
type RepairRequest = {
  id: number;
  title: string;
  address: string;
  road_section?: string | null;
  contractor_name?: string | null;
  status: string;
  planned_start_date: string;
  planned_end_date: string;
  is_overdue: boolean;
  days_remaining: number | null;
  days_overdue: number | null;
  district?: number | { id: number; name_ru?: string | null } | null;
  created_at: string;
  is_deleted?: boolean;
};

type District = { id: number; name_ru?: string | null; name_kz?: string | null; name?: string | null };
type TabId = "all" | "attention" | "expiring" | "overdue" | "completed" | "deleted";
type PhotoItem = { id: number; phase: string; image: string; description?: string | null };
type Preview = { id: number; x: number; y: number };

/* ── Config ──────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  draft:          "Черновик",
  pending_review: "На проверке",
  needs_revision: "На доработке",
  active:         "Активный ремонт",
  completed:      "Завершена",
  cancelled:      "Аннулирована",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:          { bg: "#F2F4F7",  text: "#667085" },
  pending_review: { bg: "#FFF7E6",  text: "#B76E00" },
  needs_revision: { bg: "#FFF2F2",  text: "#D92D20" },
  active:         { bg: "#E6F6EF",  text: "#027A48" },
  completed:      { bg: "#DCECF8",  text: "#12345B" },
  cancelled:      { bg: "#F2F4F7",  text: "#98A2B3" },
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function getDaysInfo(req: RepairRequest) {
  const end = new Date(req.planned_end_date);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  const remaining = req.days_remaining ?? Math.max(0, diff);
  const overdue   = req.days_overdue  ?? Math.max(0, -diff);
  const isOver    = req.is_overdue || overdue > 0;
  return { remaining, overdue, isOver };
}

function pluralDays(n: number) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "дней";
  if (b === 1) return "день";
  if (b >= 2 && b <= 4) return "дня";
  return "дней";
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function districtId(d: RepairRequest["district"]): string {
  if (!d) return "";
  if (typeof d === "number") return String(d);
  return String(d.id);
}

function tabFilter(req: RepairRequest, tab: TabId) {
  if (tab === "deleted") return req.is_deleted === true;
  if (req.is_deleted) return false;

  if (tab === "all") return true;
  if (tab === "attention") return req.status === "needs_revision";

  const terminal = req.status === "completed" || req.status === "cancelled";

  if (tab === "expiring") {
    if (terminal) return false;
    const { remaining, isOver } = getDaysInfo(req);
    return !isOver && remaining <= 7;
  }

  if (tab === "overdue") {
    if (terminal) return false;
    return getDaysInfo(req).isOver;
  }

  if (tab === "completed") return terminal;

  return true;
}

function pageNums(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p);
  if (current < total - 2) out.push("…");
  out.push(total);
  return out;
}

/* ── Icons ───────────────────────────────────────────────────────── */
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>;
}
function FilterIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
}
function ResetIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"/></svg>;
}
function EyeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.75"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75"/></svg>;
}
function DotsIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>;
}
function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ChevLeft() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ChevRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function SpinnerIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function RestoreIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/* ── Page ────────────────────────────────────────────────────────── */
const PAGE_SIZES = [10, 20, 50];

export default function RepairsListPage() {
  const [all, setAll]           = useState<RepairRequest[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("all");

  /* panel filters */
  const [fTitle,     setFTitle]     = useState("");
  const [fStatus,    setFStatus]    = useState("");
  const [fDistrict,  setFDistrict]  = useState("");
  const [fStartFrom, setFStartFrom] = useState("");
  const [fEndTo,     setFEndTo]     = useState("");

  /* column filters — separate state so they don't share DOM with panel */
  const [cTitle,      setCTitle]      = useState("");
  const [cAddress,    setCAddress]    = useState("");
  const [cContractor, setCContractor] = useState("");
  const [cStatus,     setCStatus]     = useState("");
  const [cStart,      setCStart]      = useState("");
  const [cEnd,        setCEnd]        = useState("");

  const [page, setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [kebab, setKebab]       = useState<number | null>(null);
  const [kebabPos, setKebabPos] = useState<{ x: number; y: number } | null>(null);

  /* hover preview */
  const [preview, setPreview]           = useState<Preview | null>(null);
  const [photoCache, setPhotoCache]     = useState<Record<number, PhotoItem[]>>({});
  const [photoLoading, setPhotoLoading] = useState<Record<number, boolean>>({});
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mousePos   = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [confirmDelete, setConfirmDelete] = useState<RepairRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const toArr = <T,>(r: { results?: T[] } | T[]) =>
      Array.isArray(r) ? r : (r as { results?: T[] }).results ?? [];

    Promise.all([
      apiFetch<{ results?: RepairRequest[] } | RepairRequest[]>("/api/v1/road-repair/requests/?page_size=1000"),
      apiFetch<{ results?: RepairRequest[] } | RepairRequest[]>("/api/v1/road-repair/requests/?page_size=1000&is_deleted=true").catch(() => [] as RepairRequest[]),
      apiFetch<{ results?: District[] } | District[]>("/api/v1/repair-works/ref_district/"),
    ])
      .then(([rd, rdDel, dd]) => {
        const active  = toArr(rd as { results?: RepairRequest[] } | RepairRequest[]);
        const deleted = (Array.isArray(rdDel) ? rdDel : toArr(rdDel as { results?: RepairRequest[] } | RepairRequest[])).map(
          (r) => ({ ...r, is_deleted: true })
        );
        const seen = new Set(active.map((r) => r.id));
        const merged = [...active, ...deleted.filter((r) => !seen.has(r.id))];
        setAll(merged);
        setDistricts(toArr(dd as { results?: District[] } | District[]));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (kebab === null) return;
    const handler = () => { setKebab(null); setKebabPos(null); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [kebab]);

  function showPreview(id: number, e: React.MouseEvent) {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      const popW = 300;
      const popH = 380;
      const { x: mx, y: my } = mousePos.current;
      const rightSpace = window.innerWidth - mx;
      const x = rightSpace > popW + 24 ? mx + 18 : mx - popW - 18;
      const y = Math.max(8, Math.min(my - popH / 2, window.innerHeight - popH - 8));
      setPreview({ id, x: Math.max(8, x), y });
      fetchPhotos(id);
    }, 280);
  }

  function hidePreview() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    leaveTimer.current = setTimeout(() => setPreview(null), 140);
  }

  async function fetchPhotos(id: number) {
    if (photoCache[id] !== undefined || photoLoading[id]) return;
    setPhotoLoading((p) => ({ ...p, [id]: true }));
    try {
      const data = await apiFetch<{ photos?: PhotoItem[] }>(`/api/v1/road-repair/requests/${id}/`);
      setPhotoCache((p) => ({ ...p, [id]: data.photos ?? [] }));
    } catch {
      setPhotoCache((p) => ({ ...p, [id]: [] }));
    } finally {
      setPhotoLoading((p) => ({ ...p, [id]: false }));
    }
  }

  async function softDelete(req: RepairRequest) {
    setActionLoading(req.id);
    try {
      await apiFetch(`/api/v1/road-repair/requests/${req.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_deleted: true }),
      });
      setAll((prev) => prev.map((r) => r.id === req.id ? { ...r, is_deleted: true } : r));
      setConfirmDelete(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка при удалении");
    } finally {
      setActionLoading(null);
    }
  }

  async function restoreRecord(id: number) {
    setActionLoading(id);
    try {
      await apiFetch(`/api/v1/road-repair/requests/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_deleted: false }),
      });
      setAll((prev) => prev.map((r) => r.id === id ? { ...r, is_deleted: false } : r));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка при восстановлении");
    } finally {
      setActionLoading(null);
    }
  }

  function reset() {
    setFTitle(""); setFStatus(""); setFDistrict(""); setFStartFrom(""); setFEndTo("");
    setCTitle(""); setCAddress(""); setCContractor(""); setCStatus(""); setCStart(""); setCEnd("");
    setPage(1);
  }

  const anyFilter = fTitle || fStatus || fDistrict || fStartFrom || fEndTo || cTitle || cAddress || cContractor || cStatus || cStart || cEnd;

  function tabCount(t: TabId) { return all.filter((r) => tabFilter(r, t)).length; }

  const tabFiltered = all.filter((r) => tabFilter(r, activeTab));
  const filtered = tabFiltered.filter((r) => {
    // panel global search
    if (fTitle) {
      const q = fTitle.toLowerCase();
      if (
        !r.title.toLowerCase().includes(q) &&
        !(r.road_section ?? "").toLowerCase().includes(q) &&
        !r.address.toLowerCase().includes(q) &&
        !(r.contractor_name ?? "").toLowerCase().includes(q)
      ) return false;
    }
    if (fStatus   && r.status !== fStatus) return false;
    if (fDistrict && districtId(r.district) !== fDistrict) return false;
    if (fStartFrom && r.planned_start_date < fStartFrom) return false;
    if (fEndTo     && r.planned_end_date   > fEndTo)     return false;
    // column-specific filters
    if (cTitle && !r.title.toLowerCase().includes(cTitle.toLowerCase()) && !(r.road_section ?? "").toLowerCase().includes(cTitle.toLowerCase())) return false;
    if (cAddress    && !r.address.toLowerCase().includes(cAddress.toLowerCase())) return false;
    if (cContractor && !(r.contractor_name ?? "").toLowerCase().includes(cContractor.toLowerCase())) return false;
    if (cStatus && r.status !== cStatus) return false;
    if (cStart && r.planned_start_date < cStart) return false;
    if (cEnd   && r.planned_end_date   > cEnd)   return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const rows       = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const tabs: { id: TabId; label: string; danger?: boolean }[] = [
    { id: "all",       label: "Все заявки" },
    { id: "attention", label: "Требуют внимания" },
    { id: "expiring",  label: "Срок завершается" },
    { id: "overdue",   label: "Просроченные" },
    { id: "completed", label: "Завершённые" },
    { id: "deleted",   label: "Удалённые", danger: true },
  ];

  const dLabel = (d: District) => d.name_ru ?? d.name_kz ?? d.name ?? String(d.id);

  const INPUT_CLS = "h-9 px-3 rounded-[6px] border border-[#D9E0E8] text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 bg-white";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[17px] font-semibold text-[#1D2939]">Заявки</h2>
          <p className="text-sm text-[#667085] mt-0.5">Заявки на проведение ремонтных работ</p>
        </div>
      </div>

      <div className="bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">

        {/* Tabs */}
        <div className="flex items-center border-b border-[#D9E0E8] px-1 overflow-x-auto">
          {tabs.map((t) => {
            const cnt = tabCount(t.id);
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setPage(1); }}
                className={[
                  "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? t.danger ? "border-[#D92D20] text-[#D92D20]" : "border-[#2F80C9] text-[#2F80C9]"
                    : "border-transparent text-[#667085] hover:text-[#1D2939]",
                ].join(" ")}
              >
                {t.label}
                {cnt > 0 && (
                  <span className={[
                    "text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    active
                      ? t.danger ? "bg-[#D92D20] text-white" : "bg-[#2F80C9] text-white"
                      : t.danger ? "bg-[#FFF2F2] text-[#D92D20]" : "bg-[#F2F4F7] text-[#667085]",
                  ].join(" ")}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter panel */}
        <div className="px-5 py-4 border-b border-[#D9E0E8]">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-[#667085] mb-1.5">Поиск</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none"><SearchIcon /></span>
                <input
                  type="text"
                  placeholder="Название, адрес, подрядчик…"
                  value={fTitle}
                  onChange={(e) => { setFTitle(e.target.value); setPage(1); }}
                  className={`${INPUT_CLS} w-full pl-9`}
                />
              </div>
            </div>

            {/* Status */}
            <div className="w-44">
              <label className="block text-xs font-medium text-[#667085] mb-1.5">Статус</label>
              <select value={fStatus} onChange={(e) => { setFStatus(e.target.value); setPage(1); }} className={INPUT_CLS + " w-full"}>
                <option value="">Все статусы</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {/* District */}
            <div className="w-44">
              <label className="block text-xs font-medium text-[#667085] mb-1.5">Район</label>
              <select value={fDistrict} onChange={(e) => { setFDistrict(e.target.value); setPage(1); }} className={INPUT_CLS + " w-full"}>
                <option value="">Все районы</option>
                {districts.map((d) => <option key={d.id} value={String(d.id)}>{dLabel(d)}</option>)}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5">Период работ</label>
              <div className="flex items-center gap-2">
                <input type="date" value={fStartFrom} onChange={(e) => { setFStartFrom(e.target.value); setPage(1); }} className={INPUT_CLS} />
                <span className="text-[#98A2B3] text-sm select-none">—</span>
                <input type="date" value={fEndTo} min={fStartFrom || undefined} onChange={(e) => { setFEndTo(e.target.value); setPage(1); }} className={INPUT_CLS} />
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              className="h-9 px-4 rounded-[6px] border border-[#D9E0E8] text-sm text-[#667085] hover:bg-[#F7F9FC] transition-colors flex items-center gap-1.5"
            >
              <ResetIcon /> Сбросить
            </button>
          </div>
        </div>

        {/* Create button row */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#D9E0E8]">
          {anyFilter ? (
            <span className="text-xs text-[#667085]">
              Найдено: <span className="font-semibold text-[#1D2939]">{filtered.length}</span> из {tabFiltered.length}
            </span>
          ) : (
            <span />
          )}
          <Link
            href="/dashboard/repairs/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-[6px] bg-[#2F80C9] text-white text-sm font-medium hover:bg-[#1E6BAD] transition-colors"
          >
            <PlusIcon /> Создать заявку
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-[#2F80C9]"><SpinnerIcon /></div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="px-5 py-5">
            <div className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">{error}</div>
          </div>
        )}

        {/* Table — always shown after load so column-filter headers stay visible */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F7F9FC] border-b border-[#D9E0E8] divide-x divide-[#D9E0E8]">
                  {/* № */}
                  <th className="text-left px-5 pt-3 pb-2 font-semibold text-[#667085] text-xs whitespace-nowrap align-top">
                    №
                  </th>

                  {/* Название */}
                  <th className="text-left px-5 pt-3 pb-2 font-semibold text-[#667085] text-xs align-top min-w-[180px]">
                    <span className="block mb-1.5 whitespace-nowrap">Название заявки</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#C4CBD8] pointer-events-none"><SearchIcon /></span>
                      <input
                        type="text"
                        placeholder="Поиск…"
                        value={cTitle}
                        onChange={(e) => { setCTitle(e.target.value); setPage(1); }}
                        className="w-full h-7 pl-7 pr-2 rounded-[5px] border border-[#E4EAF2] bg-white text-xs text-[#1D2939] placeholder:text-[#C4CBD8] outline-none focus:border-[#2F80C9] focus:ring-1 focus:ring-[#2F80C9]/20 font-normal"
                      />
                    </div>
                  </th>

                  {/* Адрес */}
                  <th className="text-left px-4 pt-3 pb-2 font-semibold text-[#667085] text-xs align-top min-w-[160px]">
                    <span className="block mb-1.5 whitespace-nowrap">Адрес участка</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#C4CBD8] pointer-events-none"><SearchIcon /></span>
                      <input
                        type="text"
                        placeholder="Поиск…"
                        value={cAddress}
                        onChange={(e) => { setCAddress(e.target.value); setPage(1); }}
                        className="w-full h-7 pl-7 pr-2 rounded-[5px] border border-[#E4EAF2] bg-white text-xs text-[#1D2939] placeholder:text-[#C4CBD8] outline-none focus:border-[#2F80C9] focus:ring-1 focus:ring-[#2F80C9]/20 font-normal"
                      />
                    </div>
                  </th>

                  {/* Подрядчик */}
                  <th className="text-left px-4 pt-3 pb-2 font-semibold text-[#667085] text-xs align-top min-w-[140px]">
                    <span className="block mb-1.5 whitespace-nowrap">Подрядчик</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#C4CBD8] pointer-events-none"><SearchIcon /></span>
                      <input
                        type="text"
                        placeholder="Поиск…"
                        value={cContractor}
                        onChange={(e) => { setCContractor(e.target.value); setPage(1); }}
                        className="w-full h-7 pl-7 pr-2 rounded-[5px] border border-[#E4EAF2] bg-white text-xs text-[#1D2939] placeholder:text-[#C4CBD8] outline-none focus:border-[#2F80C9] focus:ring-1 focus:ring-[#2F80C9]/20 font-normal"
                      />
                    </div>
                  </th>

                  {/* Начало */}
                  <th className="text-left px-4 pt-3 pb-2 font-semibold text-[#667085] text-xs align-top">
                    <span className="block mb-1.5 whitespace-nowrap">Начало</span>
                    <input
                      type="date"
                      value={cStart}
                      onChange={(e) => { setCStart(e.target.value); setPage(1); }}
                      title="Начало не раньше"
                      className="h-7 w-[130px] px-2 rounded-[5px] border border-[#E4EAF2] bg-white text-xs text-[#344054] outline-none focus:border-[#2F80C9] focus:ring-1 focus:ring-[#2F80C9]/20 font-normal"
                    />
                  </th>

                  {/* Завершение */}
                  <th className="text-left px-4 pt-3 pb-2 font-semibold text-[#667085] text-xs align-top">
                    <span className="block mb-1.5 whitespace-nowrap">Завершение</span>
                    <input
                      type="date"
                      value={cEnd}
                      min={cStart || undefined}
                      onChange={(e) => { setCEnd(e.target.value); setPage(1); }}
                      title="Завершение не позже"
                      className="h-7 w-[130px] px-2 rounded-[5px] border border-[#E4EAF2] bg-white text-xs text-[#344054] outline-none focus:border-[#2F80C9] focus:ring-1 focus:ring-[#2F80C9]/20 font-normal"
                    />
                  </th>

                  {/* Статус */}
                  <th className="text-left px-4 pt-3 pb-2 font-semibold text-[#667085] text-xs align-top">
                    <span className="block mb-1.5 whitespace-nowrap">Статус</span>
                    <select
                      value={cStatus}
                      onChange={(e) => { setCStatus(e.target.value); setPage(1); }}
                      className="h-7 pl-2 pr-6 rounded-[5px] border border-[#E4EAF2] bg-white text-xs text-[#344054] outline-none focus:border-[#2F80C9] focus:ring-1 focus:ring-[#2F80C9]/20 font-normal appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 24 24%27 fill=%27none%27%3E%3Cpath d=%27M6 9l6 6 6-6%27 stroke=%27%23C4CBD8%27 stroke-width=%272.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_6px_center]"
                    >
                      <option value="">Все</option>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </th>

                  {/* Осталось */}
                  <th className="text-left px-4 pt-3 pb-2 font-semibold text-[#667085] text-xs whitespace-nowrap align-top">
                    Осталось / Просрочка
                  </th>

                  {/* Действия */}
                  <th className="text-center px-4 pt-3 pb-2 font-semibold text-[#667085] text-xs whitespace-nowrap align-top">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 text-[#D9E0E8]" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 12h8M8 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <p className="text-sm font-medium text-[#667085]">Заявок не найдено</p>
                      <p className="text-xs text-[#98A2B3] mt-1">Попробуйте изменить фильтры или создайте новую заявку</p>
                    </td>
                  </tr>
                )}
                {rows.map((req, i) => {
                  const sc = STATUS_COLORS[req.status] ?? { bg: "#F2F4F7", text: "#667085" };
                  const isTerminal = req.status === "completed" || req.status === "cancelled";
                  const { remaining, overdue, isOver } = getDaysInfo(req);

                  return (
                    <tr
                      key={req.id}
                      className={[
                        "border-b border-[#F2F4F7] transition-colors divide-x divide-[#F2F4F7] cursor-default",
                        req.is_deleted ? "bg-[#FAFAFA] opacity-70" : "hover:bg-[#F7F9FC]",
                        i === rows.length - 1 ? "border-b-0" : "",
                      ].join(" ")}
                    >
                      {/* № */}
                      <td className="px-5 py-4 text-[#98A2B3] font-mono text-xs whitespace-nowrap">{req.id}</td>

                      {/* Title */}
                      <td className="px-5 py-4 max-w-[240px]">
                        <Link
                          href={`/dashboard/repairs/${req.id}`}
                          className="block group"
                          onMouseEnter={(e) => showPreview(req.id, e)}
                          onMouseLeave={hidePreview}
                        >
                          <p className={[
                            "font-semibold transition-colors line-clamp-1",
                            req.is_deleted ? "line-through text-[#98A2B3]" : "text-[#1D2939] group-hover:text-[#2F80C9]",
                          ].join(" ")}>
                            {req.title}
                          </p>
                          {req.road_section && (
                            <p className="text-xs text-[#98A2B3] mt-0.5 line-clamp-1">{req.road_section}</p>
                          )}
                        </Link>
                      </td>

                      {/* Address */}
                      <td className="px-4 py-4 max-w-[200px]">
                        <p className="text-[#344054] line-clamp-1">{req.address || "—"}</p>
                      </td>

                      {/* Contractor */}
                      <td className="px-4 py-4 text-[#667085] whitespace-nowrap">
                        {req.contractor_name ?? "—"}
                      </td>

                      {/* Start */}
                      <td className="px-4 py-4 text-[#667085] whitespace-nowrap">
                        {fmtDate(req.planned_start_date)}
                      </td>

                      {/* End */}
                      <td className="px-4 py-4 text-[#667085] whitespace-nowrap">
                        {fmtDate(req.planned_end_date)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </td>

                      {/* Days */}
                      <td className="px-4 py-4">
                        {isTerminal ? (
                          <span className="text-[#98A2B3] text-sm">—</span>
                        ) : isOver ? (
                          <div>
                            <p className="text-sm font-semibold text-[#D92D20]">{overdue} {pluralDays(overdue)}</p>
                            <p className="text-xs text-[#D92D20]/70">просрочка</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold" style={{ color: remaining <= 7 ? "#F59E42" : "#667085" }}>
                              {remaining} {pluralDays(remaining)}
                            </p>
                            <p className="text-xs text-[#98A2B3]">до завершения</p>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-center">
                          <Link
                            href={`/dashboard/repairs/${req.id}`}
                            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#667085] hover:bg-[#F0F4F8] hover:text-[#12345B] transition-colors"
                            title="Просмотр"
                          >
                            <EyeIcon />
                          </Link>
                          <div className="relative">
                            <button
                              type="button"
                              title="Действия"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (kebab === req.id) { setKebab(null); setKebabPos(null); return; }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setKebabPos({ x: rect.right, y: rect.bottom + 4 });
                                setKebab(req.id);
                              }}
                              className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#667085] hover:bg-[#F0F4F8] hover:text-[#12345B] transition-colors"
                            >
                              <DotsIcon />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#D9E0E8]">
            <p className="text-xs text-[#667085]">
              Показано {Math.min((safePage - 1) * pageSize + 1, filtered.length)}–{Math.min(safePage * pageSize, filtered.length)} из {filtered.length}
            </p>
            <div className="flex items-center gap-3">
              {/* Pages */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center border border-[#D9E0E8] text-[#667085] hover:bg-[#F7F9FC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevLeft />
                </button>
                {pageNums(safePage, totalPages).map((p, idx) =>
                  p === "…" ? (
                    <span key={`e${idx}`} className="w-8 h-8 flex items-center justify-center text-[#98A2B3] text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={[
                        "w-8 h-8 rounded-[6px] text-sm font-medium transition-colors",
                        safePage === p
                          ? "bg-[#12345B] text-white"
                          : "border border-[#D9E0E8] text-[#667085] hover:bg-[#F7F9FC]",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center border border-[#D9E0E8] text-[#667085] hover:bg-[#F7F9FC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevRight />
                </button>
              </div>
              {/* Page size */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#667085]">Показывать по:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="h-8 px-2 rounded-[6px] border border-[#D9E0E8] text-sm text-[#344054] outline-none focus:border-[#2F80C9]"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Kebab portal dropdown ─────────────────────────────────── */}
      {kebab !== null && kebabPos !== null && (() => {
        const req = all.find((r) => r.id === kebab);
        if (!req) return null;
        const menuW = 192;
        const left = Math.min(kebabPos.x - menuW, window.innerWidth - menuW - 8);
        const top  = Math.min(kebabPos.y, window.innerHeight - 200);
        return createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top, left, width: menuW, zIndex: 99999 }}
            className="bg-white rounded-[8px] border border-[#D9E0E8] shadow-xl py-1"
          >
            <Link
              href={`/dashboard/repairs/${req.id}`}
              onClick={() => { setKebab(null); setKebabPos(null); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#344054] hover:bg-[#F7F9FC] transition-colors"
            >
              <EyeIcon /> Просмотр
            </Link>
            {!req.is_deleted && (
              <>
                <Link
                  href={`/dashboard/repairs/${req.id}/edit`}
                  onClick={() => { setKebab(null); setKebabPos(null); }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#344054] hover:bg-[#F7F9FC] transition-colors"
                >
                  <EditIcon /> Редактировать
                </Link>
                <div className="mx-3 my-1 border-t border-[#F2F4F7]" />
                <button
                  type="button"
                  onClick={() => { setKebab(null); setKebabPos(null); setConfirmDelete(req); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#D92D20] hover:bg-[#FFF2F2] transition-colors"
                >
                  <TrashIcon /> Удалить
                </button>
              </>
            )}
            {req.is_deleted && (
              <button
                type="button"
                disabled={actionLoading === req.id}
                onClick={() => { setKebab(null); setKebabPos(null); restoreRecord(req.id); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#027A48] hover:bg-[#E6F6EF] transition-colors disabled:opacity-50"
              >
                <RestoreIcon /> Восстановить
              </button>
            )}
          </div>,
          document.body
        );
      })()}

      {/* ── Confirm delete dialog ─────────────────────────────────── */}
      {confirmDelete !== null && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: "rgba(13,35,68,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#D9E0E8] shadow-2xl w-[400px] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "previewFadeIn 0.15s ease" }}
          >
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#FFF2F2] flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="#D92D20" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#D92D20" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 11v6M14 11v6" stroke="#D92D20" strokeWidth="1.75" strokeLinecap="round"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#D92D20" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-[#1D2939] mb-1">Удалить заявку?</h3>
              <p className="text-sm text-[#667085] leading-relaxed">
                Заявка <span className="font-medium text-[#344054]">«{confirmDelete.title}»</span> будет помечена как удалённая. Вы сможете восстановить её из вкладки <span className="font-medium text-[#344054]">«Удалённые»</span>.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-10 rounded-[8px] border border-[#D9E0E8] text-sm font-medium text-[#344054] hover:bg-[#F7F9FC] transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={actionLoading === confirmDelete.id}
                onClick={() => softDelete(confirmDelete)}
                className="flex-1 h-10 rounded-[8px] text-sm font-medium text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "#D92D20" }}
              >
                {actionLoading === confirmDelete.id
                  ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg> Удаление…</>
                  : "Удалить"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hover preview card ─────────────────────────────────────── */}
      {preview !== null && (() => {
        const req = all.find((r) => r.id === preview.id);
        if (!req) return null;
        const sc = STATUS_COLORS[req.status] ?? { bg: "#F2F4F7", text: "#667085" };
        const photos = photoCache[preview.id] ?? null;
        const isLoading = photoLoading[preview.id] ?? false;
        const { remaining, overdue, isOver } = getDaysInfo(req);
        const isTerminal = req.status === "completed" || req.status === "cancelled";

        return (
          <div
            onMouseEnter={() => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }}
            onMouseLeave={hidePreview}
            style={{
              position: "fixed",
              top: preview.y,
              left: preview.x,
              width: 300,
              zIndex: 9999,
              boxShadow: "0 8px 32px rgba(18,52,91,0.16), 0 2px 8px rgba(0,0,0,0.08)",
              animation: "previewFadeIn 0.15s ease",
            }}
            className="bg-white rounded-2xl border border-[#D9E0E8] overflow-hidden"
          >
            <style>{`@keyframes previewFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-[#F2F4F7]">
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: sc.bg, color: sc.text }}
                >
                  {STATUS_LABELS[req.status] ?? req.status}
                </span>
                <span className="text-[11px] text-[#98A2B3] font-mono">#{req.id}</span>
              </div>
              <p className="text-sm font-semibold text-[#1D2939] leading-snug line-clamp-2">{req.title}</p>
            </div>

            {/* Meta */}
            <div className="px-4 py-3 space-y-2 border-b border-[#F2F4F7]">
              {req.address && (
                <div className="flex items-start gap-2 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-[#98A2B3]">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.75"/>
                    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75"/>
                  </svg>
                  <span className="text-[#344054] line-clamp-2">{req.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#98A2B3]">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
                <span className="text-[#344054]">{fmtDate(req.planned_start_date)} — {fmtDate(req.planned_end_date)}</span>
              </div>
              {req.contractor_name && (
                <div className="flex items-center gap-2 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#98A2B3]">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75"/>
                    <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                  <span className="text-[#344054] truncate">{req.contractor_name}</span>
                </div>
              )}
              {!isTerminal && (
                <div className="flex items-center gap-2 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#98A2B3]">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                  {isOver
                    ? <span className="font-medium text-[#D92D20]">Просрочка {overdue} {pluralDays(overdue)}</span>
                    : <span style={{ color: remaining <= 7 ? "#F59E42" : "#667085" }}>Осталось {remaining} {pluralDays(remaining)}</span>
                  }
                </div>
              )}
            </div>

            {/* Photos */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#98A2B3] mb-2">Фотографии</p>
              {isLoading && (
                <div className="flex items-center justify-center h-16 text-[#2F80C9]"><SpinnerIcon /></div>
              )}
              {!isLoading && photos !== null && photos.length === 0 && (
                <p className="text-xs text-[#98A2B3] italic">Фотографии не добавлены</p>
              )}
              {!isLoading && photos !== null && photos.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {photos.slice(0, 3).map((ph) => (
                    <div key={ph.id} className="aspect-square rounded-lg overflow-hidden bg-[#F7F9FC] border border-[#E8EDF3]">
                      <img src={ph.image} alt={ph.description ?? "Фото"} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {photos.length > 3 && (
                    <div className="aspect-square rounded-lg bg-[#F7F9FC] border border-[#E8EDF3] flex items-center justify-center">
                      <span className="text-xs font-semibold text-[#667085]">+{photos.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
              <Link
                href={`/dashboard/repairs/${req.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2F80C9] hover:underline"
              >
                Открыть заявку
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
