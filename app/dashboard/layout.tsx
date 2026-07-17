"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/auth-context";
import { apiFetch } from "../lib/auth";

const SIDEBAR_KEY = "rw-sidebar-collapsed";

/* ── Icons ────────────────────────────────────────────────────────── */

function ChevronLeftIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ color: "rgba(255,255,255,0.8)", transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function ConstructionIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 20h20M6 20V10l6-6 6 6v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="14" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M7 16l4-5 4 3 4-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Diagonal light streak that sweeps across its parent on hover — parent needs `group relative overflow-hidden`. */
function ShineSweep() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"
      style={{ background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)" }}
    />
  );
}

/* Building mark — extracted from remontnye_raboty_logo.svg, for collapsed sidebar */
function LogoMark() {
  return (
    <svg viewBox="0 0 520 440" className="w-7 h-auto relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rwMarkGrad" x1="120" y1="80" x2="500" y2="420" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.72" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#7DD3FC" />
        </linearGradient>
      </defs>
      <g transform="translate(70 44)" stroke="url(#rwMarkGrad)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 360H430" strokeWidth="14" />
        <path d="M105 360V235L190 180V360" strokeWidth="14" />
        <path d="M190 360V85L282 35V360" strokeWidth="14" />
        <path d="M282 360V172L365 218V360" strokeWidth="14" />
        <path d="M190 180L282 132L365 218" strokeWidth="12" />
        <path d="M190 85L282 132" strokeWidth="12" />
        <path d="M138 338V256L168 237V338" strokeWidth="8" />
        <path d="M225 338V151L255 135V338" strokeWidth="8" />
        <path d="M315 338V221L340 235V338" strokeWidth="8" />
        <g stroke="#7DD3FC" strokeWidth="4" opacity="0.95">
          <path d="M72 284H104" />
          <path d="M282 62V24" />
          <path d="M365 250H412" />
          <path d="M224 210H188" />
          <path d="M326 175V140H390" />
          <circle cx="67" cy="284" r="6" fill="#7DD3FC" stroke="none" />
          <circle cx="282" cy="18" r="6" fill="#7DD3FC" stroke="none" />
          <circle cx="420" cy="250" r="6" fill="#7DD3FC" stroke="none" />
          <circle cx="182" cy="210" r="6" fill="#7DD3FC" stroke="none" />
          <circle cx="398" cy="140" r="6" fill="#7DD3FC" stroke="none" />
        </g>
        <g stroke="#7DD3FC" strokeWidth="2" opacity="0.5">
          <path d="M91 105H155" strokeDasharray="5 9" />
          <path d="M91 122H155" strokeDasharray="5 9" />
          <path d="M44 329V370" strokeDasharray="5 9" />
        </g>
      </g>
    </svg>
  );
}

/* ── Nav config ───────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { href: "/dashboard",          label: "Главная",           icon: HomeIcon,         exact: true,  adminOnly: false },
  { href: "/dashboard/repairs",  label: "Заявки",            icon: ConstructionIcon, exact: false, adminOnly: false },
  { href: "/dashboard/users",    label: "Пользователи",     icon: UsersIcon,        exact: false, adminOnly: true  },
  { href: "/dashboard/map",      label: "Карта",             icon: MapIcon,          exact: false, adminOnly: false },
  { href: "/dashboard/reports",  label: "Отчёты",            icon: ChartIcon,        exact: false, adminOnly: false },
  { href: "/dashboard/settings", label: "Настройки",         icon: GearIcon,         exact: false, adminOnly: false },
];

/* ── Notification Bell ────────────────────────────────────────────── */

type Notif = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  request_id: number | null;
  created_at: string;
};

function NotificationBell() {
  const [notifs,  setNotifs]  = useState<Notif[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.is_read).length;

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<Notif[]>("/api/v1/common/notifications/")
      .then(setNotifs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markRead(n: Notif) {
    if (!n.is_read) {
      await apiFetch(`/api/v1/common/notifications/${n.id}/read/`, { method: "PATCH" }).catch(() => {});
      setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
  }

  async function markAllRead() {
    await apiFetch("/api/v1/common/notifications/read-all/", { method: "POST" }).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  function fmtTime(s: string) {
    const d = new Date(s);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "только что";
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} ч. назад`;
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="relative w-8 h-8 flex items-center justify-center rounded-[6px] text-[#667085] hover:bg-[#F2F4F7] transition-colors"
        aria-label="Уведомления"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D92D20] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-[#D9E0E8] rounded-[10px] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F7]">
            <span className="text-sm font-semibold text-[#1D2939]">Уведомления</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-[#2F80C9] hover:underline"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F7F9FC]">
            {loading && notifs.length === 0 && (
              <div className="py-8 flex items-center justify-center text-[#98A2B3] text-sm">Загрузка…</div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="py-8 text-center text-sm text-[#98A2B3]">Нет уведомлений</div>
            )}
            {notifs.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 transition-colors ${!n.is_read ? "bg-[#F7F9FF]" : "hover:bg-[#F7F9FC]"}`}
              >
                {n.request_id ? (
                  <Link
                    href={`/dashboard/repairs/${n.request_id}`}
                    onClick={() => { markRead(n); setOpen(false); }}
                    className="block"
                  >
                    <NotifContent n={n} fmtTime={fmtTime} />
                  </Link>
                ) : (
                  <div onClick={() => markRead(n)}>
                    <NotifContent n={n} fmtTime={fmtTime} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifContent({ n, fmtTime }: { n: Notif; fmtTime: (s: string) => string }) {
  return (
    <div className="flex items-start gap-2.5">
      {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#2F80C9] flex-shrink-0" />}
      {n.is_read  && <span className="mt-1.5 w-2 h-2 rounded-full bg-transparent flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug ${!n.is_read ? "font-semibold text-[#1D2939]" : "text-[#344054]"}`}>
          {n.title}
        </p>
        {n.message && <p className="text-[11px] text-[#667085] mt-0.5 line-clamp-2">{n.message}</p>}
        <p className="text-[10px] text-[#98A2B3] mt-1">{fmtTime(n.created_at)}</p>
      </div>
    </div>
  );
}

/* ── Layout ───────────────────────────────────────────────────────── */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
  }, [user, isLoading, router]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F9FC] text-[#2F80C9]">
        <SpinnerIcon />
      </div>
    );
  }

  const displayName = user.first_name
    ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`.trim()
    : user.email;

  const initials = (user.first_name?.[0] ?? user.email[0]).toUpperCase();

  const currentLabel =
    NAV_ITEMS.find(({ href, exact }) =>
      exact ? pathname === href : pathname.startsWith(href),
    )?.label ?? "Панель управления";

  const isCollapsed = mounted && collapsed;
  const sidebarWidth = isCollapsed ? 72 : 240;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F9FC]">
      <style>{`
        @keyframes rwGlow { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes rwDot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:.65} }
      `}</style>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col relative overflow-visible"
        style={{
          width: sidebarWidth,
          transition: "width 0.2s ease",
          background: "linear-gradient(160deg, #06152A 0%, #0D2344 50%, #12345B 100%)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.22)",
        }}
      >
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Radial glow at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(47,128,201,0.22), transparent 70%)" }}
        />

        {/* Logo area */}
        <div
          className="relative z-10 shrink-0 flex items-center overflow-visible"
          style={{
            padding: isCollapsed ? "14px 8px" : "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Link
            href="/dashboard"
            className="group relative overflow-hidden flex items-center rounded-xl transition-colors duration-200 hover:bg-white/[0.04]"
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              width: isCollapsed ? 44 : "100%",
              height: isCollapsed ? 44 : "auto",
              justifyContent: isCollapsed ? "center" : "flex-start",
              padding: isCollapsed ? 0 : "8px 10px",
            }}
          >
            <ShineSweep />
            {isCollapsed ? (
              <LogoMark />
            ) : (
              <Image
                src="/remontnye_raboty_logo.svg"
                alt="Ремонтные работы"
                width={1600}
                height={500}
                sizes="208px"
                className="w-full h-auto relative z-10"
                priority
                unoptimized
              />
            )}
          </Link>

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
            className="absolute -right-3 bottom-0 translate-y-1/2 z-30 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #12345B, #1a4070)",
              borderColor: "rgba(47,128,201,0.5)",
              boxShadow: "0 4px 14px rgba(47,128,201,0.3)",
            }}
          >
            <ChevronLeftIcon collapsed={isCollapsed} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 overflow-y-auto py-5 overflow-x-hidden" aria-label="Главная навигация">
          {!isCollapsed && (
            <p
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.22)", padding: "0 24px" }}
            >
              Навигация
            </p>
          )}
          <ul className="space-y-2" style={{ padding: "0 8px" }}>
            {NAV_ITEMS.filter(({ adminOnly }) => !adminOnly || user.role === "admin").map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    title={isCollapsed ? label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className="group relative overflow-hidden flex items-center rounded-lg transition-all duration-200 border"
                    style={{
                      gap: isCollapsed ? 0 : 10,
                      padding: isCollapsed ? "10px 0" : "9px 12px",
                      justifyContent: isCollapsed ? "center" : "flex-start",
                      background: isActive ? "rgba(47,128,201,0.22)" : "transparent",
                      borderColor: isActive ? "rgba(125,211,252,0.30)" : "rgba(255,255,255,0.07)",
                      color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.52)",
                      boxShadow: isActive ? "0 4px 16px rgba(47,128,201,0.20)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.18)";
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.52)";
                      }
                    }}
                  >
                    <ShineSweep />

                    {/* Animated blue glow on active */}
                    {isActive && (
                      <span
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{ background: "rgba(47,128,201,0.10)", animation: "rwGlow 4s ease-in-out infinite" }}
                      />
                    )}

                    {/* Left accent bar on active */}
                    {isActive && !isCollapsed && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                        style={{ background: "linear-gradient(to bottom, #FFFFFF, #7DD3FC, #2F80C9)" }}
                      />
                    )}

                    <span className="relative z-10" style={{ color: isActive ? "#7DD3FC" : "rgba(255,255,255,0.40)", flexShrink: 0 }}>
                      <Icon />
                    </span>
                    {!isCollapsed && (
                      <>
                        <span className="relative z-10 text-[13.5px] font-medium flex-1 truncate">{label}</span>
                        {isActive && (
                          <span
                            className="relative z-10 w-2 h-2 rounded-full flex-shrink-0 bg-white"
                            style={{ animation: "rwDot 2s ease-in-out infinite" }}
                          />
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div
          className="relative z-10 shrink-0"
          style={{ padding: isCollapsed ? "12px 8px" : "12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2F80C9, #12345B)", border: "1.5px solid rgba(255,255,255,0.18)" }}
                title={displayName}
              >
                {initials}
              </div>
              <button
                onClick={logout}
                title="Выйти"
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
                }}
              >
                <LogoutIcon />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2F80C9, #12345B)", border: "1.5px solid rgba(255,255,255,0.18)" }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate leading-tight">{displayName}</p>
                  {user.organization_name && (
                    <p className="text-[11px] font-medium truncate leading-tight" style={{ color: "rgba(125,211,252,0.75)" }}>{user.organization_name}</p>
                  )}
                  <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.38)" }}>{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                }}
              >
                <LogoutIcon />
                Выйти
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 h-14 bg-white border-b border-[#D9E0E8] flex-shrink-0">
          <h1 className="text-[15px] font-semibold text-[#1D2939]">{currentLabel}</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #DCECF8, #BBDAF5)", color: "#12345B" }}
              >
                {initials}
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-[13px] font-medium text-[#344054]">{displayName}</span>
                {user.organization_name && (
                  <span className="text-[11px] text-[#667085]">{user.organization_name}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
