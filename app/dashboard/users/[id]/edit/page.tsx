"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../../lib/auth";
import { useUnsavedChanges, UnsavedChangesModal } from "../../../_components/UnsavedChangesGuard";

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  role_display: string;
  organization_name: string;
  is_active: boolean;
};

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  organization_name: string;
  role: "employee" | "admin" | "student";
  is_active: boolean;
  new_password: string;
};

const INPUT = "w-full h-10 px-3.5 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60 disabled:bg-[#F7F9FC]";

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

function SpinnerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    phone: "",
    organization_name: "",
    role: "employee",
    is_active: true,
    new_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);

  useEffect(() => {
    apiFetch<User>(`/api/v1/common/users/${userId}/`)
      .then((u) => {
        setUser(u);
        setForm({
          first_name: u.first_name ?? "",
          last_name: u.last_name ?? "",
          phone: u.phone ?? "",
          organization_name: u.organization_name ?? "",
          role: (u.role as FormState["role"]) ?? "employee",
          is_active: u.is_active,
          new_password: "",
        });
      })
      .catch((e: unknown) => setPageError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setPageLoading(false));
  }, [userId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.new_password && form.new_password.length < 6) {
      setError("Новый пароль должен быть не менее 6 символов");
      return;
    }

    setIsDirty(false);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        organization_name: form.organization_name.trim(),
        role: form.role,
        is_active: form.is_active,
      };
      if (form.new_password) {
        body.password = form.new_password;
      }

      await apiFetch(`/api/v1/common/users/${userId}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      router.replace("/dashboard/users");
    } catch (err: unknown) {
      setIsDirty(true);
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
      setSubmitting(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-[#2F80C9]">
        <SpinnerIcon size={22} />
      </div>
    );
  }

  if (pageError || !user) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/users" className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#12345B] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          К списку пользователей
        </Link>
        <div className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">{pageError ?? "Пользователь не найден"}</div>
      </div>
    );
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

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

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-[#12345B] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {(user.first_name[0] ?? user.email[0] ?? "?").toUpperCase()}
        </div>
        <div>
          <h2 className="text-[19px] font-semibold text-[#1D2939] leading-tight">{fullName}</h2>
          <p className="text-sm text-[#98A2B3]">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6 space-y-4">

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

          {/* Active toggle */}
          <FieldRow label="Статус аккаунта">
            <label className="flex items-center gap-3 cursor-pointer select-none h-10">
              <div
                role="switch"
                aria-checked={form.is_active}
                onClick={() => !submitting && set("is_active", !form.is_active)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_active ? "bg-[#027A48]" : "bg-[#D0D5DD]"} ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-[#344054]">
                {form.is_active ? "Активен — может входить в систему" : "Деактивирован — вход заблокирован"}
              </span>
            </label>
          </FieldRow>

          {/* Divider */}
          <div className="border-t border-[#F2F4F7] pt-4">
            <p className="text-xs font-semibold text-[#98A2B3] uppercase tracking-wide mb-3">Сменить пароль (необязательно)</p>
            <FieldRow label="Новый пароль" hint="Оставьте пустым, чтобы не менять пароль">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${INPUT} pr-10`}
                  placeholder="Минимум 6 символов"
                  value={form.new_password}
                  onChange={(e) => set("new_password", e.target.value)}
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
            {submitting ? <><SpinnerIcon /> Сохранение…</> : "Сохранить изменения"}
          </button>
          <Link
            href="/dashboard/users"
            className="inline-flex items-center h-10 px-5 rounded-[6px] border border-[#D9E0E8] text-sm font-medium text-[#667085] hover:bg-[#F7F9FC] transition-colors"
          >
            Отмена
          </Link>
        </div>
      </form>

      <UnsavedChangesModal show={showModal} mode="edit" onConfirm={confirmLeave} onCancel={cancelLeave} />
    </div>
  );
}
