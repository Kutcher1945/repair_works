"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/auth";
import type { User } from "../../lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Alert({ type, msg }: { type: "ok" | "err"; msg: string }) {
  return (
    <p
      role="alert"
      className={`text-sm rounded-[6px] px-4 py-2.5 ${
        type === "ok"
          ? "bg-[#E6F6EF] text-[#027A48] border border-[#027A48]/20"
          : "bg-[#FFF2F2] text-[#D92D20] border border-[#D92D20]/20"
      }`}
    >
      {msg}
    </p>
  );
}

// ── Profile tab ────────────────────────────────────────────────────────────
function ProfileTab({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName,  setLastName]  = useState(user.last_name  ?? "");
  const [phone,     setPhone]     = useState((user as { phone?: string }).phone ?? "");
  const [saving,    setSaving]    = useState(false);
  const [result,    setResult]    = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const updated = await apiFetch<User>("/api/v1/common/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone }),
      });
      onUpdate(updated);
      setResult({ type: "ok", msg: "Профиль сохранён" });
    } catch (e: unknown) {
      setResult({ type: "err", msg: e instanceof Error ? e.message : "Ошибка сохранения" });
    } finally {
      setSaving(false);
    }
  }

  const ROLE_LABELS: Record<string, string> = { admin: "Администратор (ЦОДД)", employee: "Сотрудник организации" };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Read-only info */}
      <div className="bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F2F4F7]">
          <h3 className="text-sm font-semibold text-[#1D2939]">Учётная запись</h3>
        </div>
        <div className="divide-y divide-[#F7F9FC]">
          {[
            { label: "Email",         value: user.email },
            { label: "Роль",          value: ROLE_LABELS[user.role ?? ""] ?? user.role ?? "—" },
            { label: "Организация",   value: user.organization_name || "—" },
            { label: "Дата регистрации", value: user.date_joined ? fmtDate(user.date_joined) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[160px_1fr] gap-3 px-5 py-3">
              <span className="text-sm text-[#667085]">{label}</span>
              <span className="text-sm text-[#1D2939] font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F2F4F7]">
          <h3 className="text-sm font-semibold text-[#1D2939]">Личные данные</h3>
        </div>
        <form onSubmit={save} className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#344054]">Имя</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={saving}
                placeholder="Имя"
                className="w-full h-10 px-3 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#344054]">Фамилия</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
                placeholder="Фамилия"
                className="w-full h-10 px-3 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#344054]">Телефон</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              placeholder="+7 (___) ___-__-__"
              className="w-full h-10 px-3 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60"
            />
          </div>

          {result && <Alert type={result.type} msg={result.msg} />}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-[6px] bg-[#12345B] text-white text-sm font-medium hover:bg-[#0A223D] transition-colors disabled:opacity-60"
            >
              {saving && <Spinner size={14} />}
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Password tab ───────────────────────────────────────────────────────────
function PasswordTab() {
  const [oldPw,   setOldPw]   = useState("");
  const [newPw,   setNewPw]   = useState("");
  const [confPw,  setConfPw]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [result,  setResult]  = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (newPw !== confPw) {
      setResult({ type: "err", msg: "Новые пароли не совпадают" });
      return;
    }
    if (newPw.length < 6) {
      setResult({ type: "err", msg: "Пароль должен содержать минимум 6 символов" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ detail: string }>("/api/v1/common/auth/me/", {
        method: "POST",
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      });
      setResult({ type: "ok", msg: res.detail ?? "Пароль успешно изменён" });
      setOldPw(""); setNewPw(""); setConfPw("");
    } catch (e: unknown) {
      setResult({ type: "err", msg: e instanceof Error ? e.message : "Ошибка смены пароля" });
    } finally {
      setSaving(false);
    }
  }

  function PwField({ label, value, onChange, show, onToggle, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder?: string;
  }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#344054]">{label}</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={saving}
            placeholder={placeholder ?? "••••••••"}
            className="w-full h-10 pl-3 pr-10 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              {show
                ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></>
              }
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <div className="bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F2F4F7]">
          <h3 className="text-sm font-semibold text-[#1D2939]">Смена пароля</h3>
        </div>
        <form onSubmit={save} className="px-5 py-5 space-y-4">
          <PwField label="Текущий пароль" value={oldPw} onChange={setOldPw} show={showOld} onToggle={() => setShowOld(v => !v)} />
          <PwField label="Новый пароль" value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew(v => !v)} placeholder="Минимум 6 символов" />
          <PwField label="Повторите новый пароль" value={confPw} onChange={setConfPw} show={showNew} onToggle={() => setShowNew(v => !v)} />

          {result && <Alert type={result.type} msg={result.msg} />}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving || !oldPw || !newPw || !confPw}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-[6px] bg-[#12345B] text-white text-sm font-medium hover:bg-[#0A223D] transition-colors disabled:opacity-50"
            >
              {saving && <Spinner size={14} />}
              Сменить пароль
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── About tab ──────────────────────────────────────────────────────────────
function AboutTab() {
  const items = [
    { label: "Система",   value: "Мониторинг ремонтных работ" },
    { label: "Версия",    value: "1.0.0" },
    { label: "Поддержка", value: "Адилан Ахрамович" },
    { label: "Телефон",   value: "+77758249686" },
  ];

  return (
    <div className="max-w-xl space-y-5">
      <div className="bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F2F4F7]">
          <h3 className="text-sm font-semibold text-[#1D2939]">О системе</h3>
        </div>
        <div className="divide-y divide-[#F7F9FC]">
          {items.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[160px_1fr] gap-3 px-5 py-3">
              <span className="text-sm text-[#667085]">{label}</span>
              <span className="text-sm text-[#1D2939] font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#F7F9FC] border border-[#D9E0E8] rounded-[10px] px-5 py-4">
        <p className="text-xs text-[#98A2B3] leading-relaxed">
          © 2024–2026 Управление строительства города Алматы. Все права защищены.<br />
          Система предназначена для учёта и контроля ремонтных работ на дорогах города Алматы.
        </p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile",  label: "Профиль" },
  { id: "password", label: "Смена пароля" },
  { id: "about",    label: "О системе" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SettingsPage() {
  const [tab,     setTab]     = useState<TabId>("profile");
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<User>("/api/v1/common/auth/me/")
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-[#2F80C9]">
      <Spinner size={26} />
    </div>
  );

  if (!user) return (
    <div className="text-sm text-[#D92D20]">Ошибка загрузки профиля</div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-semibold text-[#1D2939]">Настройки</h2>
        <p className="text-sm text-[#667085] mt-0.5">Профиль и параметры учётной записи</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#D9E0E8]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-[#12345B] text-[#12345B]"
                : "border-transparent text-[#667085] hover:text-[#344054]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "profile"  && <ProfileTab  user={user} onUpdate={setUser} />}
      {tab === "password" && <PasswordTab />}
      {tab === "about"    && <AboutTab />}
    </div>
  );
}
