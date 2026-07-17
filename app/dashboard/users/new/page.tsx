"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/auth";
import { useUnsavedChanges, UnsavedChangesModal } from "../../_components/UnsavedChangesGuard";

type FormState = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  organization_name: string;
  role: "employee" | "admin" | "student";
  password: string;
};

const INPUT = "w-full h-10 px-3.5 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20";

function FieldRow({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#344054] mb-1.5">
        {label}
        {required && <span className="text-[#D92D20] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#98A2B3]">{hint}</p>}
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    organization_name: "",
    role: "employee",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.email.trim()) { setError("Введите email"); return; }
    if (!form.password || form.password.length < 6) { setError("Пароль должен быть не менее 6 символов"); return; }
    if (!form.role) { setError("Выберите роль"); return; }

    setIsDirty(false);
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/common/users/", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || undefined,
          organization_name: form.organization_name.trim(),
          role: form.role,
          password: form.password,
        }),
      });
      router.replace("/dashboard/users");
    } catch (err: unknown) {
      setIsDirty(true);
      setError(err instanceof Error ? err.message : "Ошибка при создании пользователя");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href="/dashboard/users"
        className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#12345B] transition-colors mb-5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        К списку пользователей
      </Link>

      <h2 className="text-[19px] font-semibold text-[#1D2939] mb-6">Новый пользователь</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6 space-y-4">

          {/* Email */}
          <FieldRow label="Email" required>
            <input
              type="email"
              className={INPUT}
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={submitting}
              autoComplete="off"
            />
          </FieldRow>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Имя">
              <input
                type="text"
                className={INPUT}
                placeholder="Иван"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                disabled={submitting}
              />
            </FieldRow>
            <FieldRow label="Фамилия">
              <input
                type="text"
                className={INPUT}
                placeholder="Иванов"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                disabled={submitting}
              />
            </FieldRow>
          </div>

          {/* Phone */}
          <FieldRow label="Телефон">
            <input
              type="tel"
              className={INPUT}
              placeholder="+7 700 000 00 00"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={submitting}
            />
          </FieldRow>

          {/* Organization */}
          <FieldRow label="Организация">
            <input
              type="text"
              className={INPUT}
              placeholder="ТОО «Название организации»"
              value={form.organization_name}
              onChange={(e) => set("organization_name", e.target.value)}
              disabled={submitting}
            />
          </FieldRow>

          {/* Role */}
          <FieldRow label="Роль" required>
            <select
              className={`${INPUT} appearance-none pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%2398A2B3' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center]`}
              value={form.role}
              onChange={(e) => set("role", e.target.value as FormState["role"])}
              disabled={submitting}
            >
              <option value="employee">Работник</option>
              <option value="admin">Администратор</option>
              <option value="student">Студент</option>
            </select>
          </FieldRow>

          {/* Password */}
          <FieldRow label="Пароль" required hint="Не менее 6 символов">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`${INPUT} pr-10`}
                placeholder="Минимум 6 символов"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                disabled={submitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </FieldRow>

        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-[6px] bg-[#12345B] text-white text-sm font-semibold hover:bg-[#0A223D] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? <><SpinnerIcon /> Создание…</> : "Создать пользователя"}
          </button>
          <Link
            href="/dashboard/users"
            className="inline-flex items-center h-10 px-5 rounded-[6px] border border-[#D9E0E8] text-sm font-medium text-[#667085] hover:bg-[#F7F9FC] transition-colors"
          >
            Отмена
          </Link>
        </div>
      </form>

      <UnsavedChangesModal show={showModal} mode="create" onConfirm={confirmLeave} onCancel={cancelLeave} />
    </div>
  );
}
