"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/auth";
import { useAuth } from "../../context/auth-context";
import type { User } from "../../lib/auth";

/* ── Helpers ───────────────────────────────────────────────────────── */
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

const ROLE_LABELS: Record<string, string> = {
  admin:    "Администратор (ЦОДД)",
  employee: "Сотрудник организации",
  student:  "Стажёр",
};

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Alert({ type, msg }: { type: "ok" | "err"; msg: string }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 text-sm rounded-[8px] px-4 py-3 ${
        type === "ok"
          ? "bg-[#E6F6EF] text-[#027A48] border border-[#027A48]/20"
          : "bg-[#FFF2F2] text-[#D92D20] border border-[#D92D20]/20"
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {type === "ok"
          ? <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          : <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="16" r="1" fill="currentColor" /></>
        }
      </svg>
      {msg}
    </div>
  );
}

const INPUT = "w-full h-10 px-3.5 rounded-[8px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60";
const INPUT_READONLY = "w-full h-10 px-3.5 rounded-[8px] border border-[#E9EEF4] bg-[#F7F9FC] text-sm text-[#667085] outline-none cursor-default";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[#344054] mb-1.5">{children}</label>;
}

function PwInput({ label, value, onChange, show, onToggle, disabled, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; disabled: boolean; placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? "••••••••"}
          className={`${INPUT} pr-10`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            {show
              ? <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </>
              : <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                </>
            }
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [firstName,  setFirstName]  = useState(user?.first_name ?? "");
  const [lastName,   setLastName]   = useState(user?.last_name  ?? "");
  const [phone,      setPhone]      = useState(user?.phone      ?? "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoResult, setInfoResult] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [oldPw,    setOldPw]    = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [confPw,   setConfPw]   = useState("");
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwResult, setPwResult] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  if (!user) return null;

  const displayName = user.first_name
    ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`.trim()
    : user.email;

  const initials = ((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")).toUpperCase() || user.email[0].toUpperCase();

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoSaving(true);
    setInfoResult(null);
    try {
      const updated = await apiFetch<User>("/api/v1/common/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() }),
      });
      setUser(updated);
      setInfoResult({ type: "ok", msg: "Данные успешно сохранены" });
    } catch (err: unknown) {
      setInfoResult({ type: "err", msg: err instanceof Error ? err.message : "Ошибка сохранения" });
    } finally {
      setInfoSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwResult(null);
    if (newPw !== confPw) { setPwResult({ type: "err", msg: "Новые пароли не совпадают" }); return; }
    if (newPw.length < 6) { setPwResult({ type: "err", msg: "Минимальная длина пароля — 6 символов" }); return; }
    if (newPw === oldPw)  { setPwResult({ type: "err", msg: "Новый пароль совпадает с текущим" }); return; }
    setPwSaving(true);
    try {
      const res = await apiFetch<{ detail?: string }>("/api/v1/common/auth/me/", {
        method: "POST",
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      });
      setPwResult({ type: "ok", msg: res.detail ?? "Пароль успешно изменён" });
      setOldPw(""); setNewPw(""); setConfPw("");
    } catch (err: unknown) {
      setPwResult({ type: "err", msg: err instanceof Error ? err.message : "Ошибка смены пароля" });
    } finally {
      setPwSaving(false);
    }
  }

  const pwStrength = newPw.length >= 12 ? 4 : newPw.length >= 8 ? 3 : newPw.length >= 6 ? 2 : newPw.length > 0 ? 1 : 0;
  const pwStrengthColors = ["", "#D92D20", "#F59E42", "#2F80C9", "#027A48"];
  const pwStrengthLabels = ["", "Слишком короткий", "Приемлемый", "Хороший", "Надёжный"];

  return (
    <div className="space-y-6">

      {/* ── Full-width avatar banner ───────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-7"
        style={{
          background: "linear-gradient(135deg, #06152A 0%, #0D2344 55%, #12345B 100%)",
          boxShadow: "0 4px 24px rgba(18,52,91,0.18)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -right-12 -top-12 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(47,128,201,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute left-1/3 -bottom-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(47,128,201,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5">
            {/* Avatar circle */}
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[24px] font-bold text-white flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #2F80C9 0%, #12345B 100%)",
                border: "2.5px solid rgba(125,211,252,0.35)",
                boxShadow: "0 4px 20px rgba(47,128,201,0.35)",
              }}
            >
              {initials}
            </div>

            <div>
              <h2 className="text-[22px] font-bold text-white leading-tight">{displayName}</h2>
              {user.organization_name && (
                <p className="text-[13px] mt-0.5" style={{ color: "rgba(125,211,252,0.80)" }}>
                  {user.organization_name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(47,128,201,0.25)", color: "#7DD3FC", border: "1px solid rgba(125,211,252,0.25)" }}
                >
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
                {user.email && (
                  <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                    {user.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6">
            {user.date_joined && (
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>В системе с</p>
                <p className="text-sm font-semibold text-white">{fmtDate(user.date_joined)}</p>
              </div>
            )}
            <div
              className="w-px h-8 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)" }}
            />
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Статус</p>
              <span
                className="inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "#4ADE80" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Активен
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_380px] gap-6 items-start">

        {/* LEFT — Personal data edit */}
        <div className="space-y-6">
          <div className="bg-white border border-[#D9E0E8] rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F2F4F7]">
              <h3 className="text-[14px] font-semibold text-[#1D2939]">Личные данные</h3>
              <p className="text-xs text-[#98A2B3] mt-0.5">Имя, фамилия и контактный номер телефона</p>
            </div>
            <form onSubmit={saveInfo} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Имя</Label>
                  <input
                    type="text"
                    className={INPUT}
                    placeholder="Имя"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={infoSaving}
                    maxLength={150}
                  />
                </div>
                <div>
                  <Label>Фамилия</Label>
                  <input
                    type="text"
                    className={INPUT}
                    placeholder="Фамилия"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={infoSaving}
                    maxLength={150}
                  />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <input type="text" className={INPUT_READONLY} value={user.email} readOnly tabIndex={-1} />
              </div>

              <div>
                <Label>Номер телефона</Label>
                <input
                  type="tel"
                  className={INPUT}
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={infoSaving}
                  maxLength={30}
                />
              </div>

              {infoResult && <Alert type={infoResult.type} msg={infoResult.msg} />}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={infoSaving}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-[8px] bg-[#12345B] text-white text-sm font-medium hover:bg-[#0A223D] transition-colors disabled:opacity-60"
                >
                  {infoSaving && <Spinner />}
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>

          {/* Security tips */}
          <div
            className="rounded-[12px] p-5 border"
            style={{ background: "linear-gradient(135deg, #F0F7FF, #EAF3FC)", borderColor: "#BBDAF5" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(47,128,201,0.15)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#2F80C9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#12345B]">Советы по безопасности</p>
                <ul className="mt-2 space-y-1.5 text-xs text-[#2F80C9]">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    Используйте уникальный пароль для этого аккаунта
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    Минимальная длина пароля — 8 символов, включая цифры
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    Не передавайте данные для входа третьим лицам
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Account info + Password */}
        <div className="space-y-6">

          {/* Account info (read-only) */}
          <div className="bg-white border border-[#D9E0E8] rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7]">
              <h3 className="text-[14px] font-semibold text-[#1D2939]">Аккаунт</h3>
              <p className="text-xs text-[#98A2B3] mt-0.5">Данные, управляемые администратором</p>
            </div>
            <div className="divide-y divide-[#F7F9FC]">
              {[
                { label: "Email",            value: user.email },
                { label: "Роль",             value: ROLE_LABELS[user.role] ?? user.role },
                { label: "Организация",      value: user.organization_name || "—" },
                { label: "Дата регистрации", value: user.date_joined ? fmtDate(user.date_joined) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="px-5 py-3">
                  <p className="text-[11px] text-[#98A2B3] font-medium uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-[#1D2939] break-all">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Password change */}
          <div className="bg-white border border-[#D9E0E8] rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7]">
              <h3 className="text-[14px] font-semibold text-[#1D2939]">Смена пароля</h3>
              <p className="text-xs text-[#98A2B3] mt-0.5">Требуется текущий пароль</p>
            </div>
            <form onSubmit={savePassword} className="px-5 py-5 space-y-4">
              <PwInput
                label="Текущий пароль"
                value={oldPw}
                onChange={setOldPw}
                show={showOld}
                onToggle={() => setShowOld((v) => !v)}
                disabled={pwSaving}
              />
              <PwInput
                label="Новый пароль"
                value={newPw}
                onChange={setNewPw}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                disabled={pwSaving}
                placeholder="Минимум 6 символов"
              />
              <PwInput
                label="Повторите новый пароль"
                value={confPw}
                onChange={setConfPw}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                disabled={pwSaving}
              />

              {/* Strength bar */}
              {pwStrength > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors duration-200"
                        style={{ background: i <= pwStrength ? pwStrengthColors[pwStrength] : "#E9EEF4" }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: pwStrengthColors[pwStrength] }}>
                    {pwStrengthLabels[pwStrength]}
                  </p>
                </div>
              )}

              {pwResult && <Alert type={pwResult.type} msg={pwResult.msg} />}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={pwSaving || !oldPw || !newPw || !confPw}
                  className="w-full inline-flex items-center justify-center gap-2 h-9 px-5 rounded-[8px] bg-[#12345B] text-white text-sm font-medium hover:bg-[#0A223D] transition-colors disabled:opacity-50"
                >
                  {pwSaving && <Spinner />}
                  Изменить пароль
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
