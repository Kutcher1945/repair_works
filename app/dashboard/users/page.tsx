"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/auth";

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
  date_joined: string;
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:    { bg: "#DCECF8", text: "#12345B" },
  employee: { bg: "#F2F4F7", text: "#667085" },
  student:  { bg: "#E6F6EF", text: "#027A48" },
};

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function UserAvatar({ user }: { user: User }) {
  const initials = [user.first_name[0], user.last_name[0]].filter(Boolean).join("").toUpperCase() || user.email[0].toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[#12345B] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<User[]>("/api/v1/common/users/")
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(user: User) {
    setActionLoading(user.id);
    try {
      if (user.is_active) {
        await apiFetch(`/api/v1/common/users/${user.id}/`, { method: "DELETE" });
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: false } : u));
      } else {
        await apiFetch(`/api/v1/common/users/${user.id}/activate/`, { method: "POST" });
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: true } : u));
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      (u.organization_name ?? "").toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[19px] font-semibold text-[#1D2939]">Пользователи</h2>
          <p className="text-sm text-[#667085] mt-0.5">Управление учётными записями и организациями</p>
        </div>
        <Link
          href="/dashboard/users/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-[6px] bg-[#12345B] text-white text-sm font-semibold hover:bg-[#0A223D] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Новый пользователь
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" aria-hidden="true">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Поиск по имени, email, организации…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 pr-8 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#344054] outline-none focus:border-[#2F80C9] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27%3E%3Cpath d=%27M6 9l6 6 6-6%27 stroke=%27%2398A2B3%27 stroke-width=%272.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center]"
        >
          <option value="">Все роли</option>
          <option value="admin">Администратор</option>
          <option value="employee">Работник</option>
          <option value="student">Студент</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-[#2F80C9]"><SpinnerIcon /></div>
      ) : error ? (
        <div className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">{error}</div>
      ) : (
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F2F4F7]">
                <th className="text-left text-xs font-semibold text-[#667085] uppercase tracking-wide px-5 py-3.5">Пользователь</th>
                <th className="text-left text-xs font-semibold text-[#667085] uppercase tracking-wide px-5 py-3.5">Организация</th>
                <th className="text-left text-xs font-semibold text-[#667085] uppercase tracking-wide px-5 py-3.5">Роль</th>
                <th className="text-left text-xs font-semibold text-[#667085] uppercase tracking-wide px-5 py-3.5">Статус</th>
                <th className="text-left text-xs font-semibold text-[#667085] uppercase tracking-wide px-5 py-3.5">Дата регистрации</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#98A2B3]">
                    {search || roleFilter ? "Ничего не найдено" : "Нет пользователей"}
                  </td>
                </tr>
              ) : filtered.map((user) => {
                const roleStyle = ROLE_COLORS[user.role] ?? ROLE_COLORS.employee;
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={user.id} className="border-b border-[#F7F9FC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div>
                          <p className="text-sm font-medium text-[#1D2939]">{fullName}</p>
                          <p className="text-xs text-[#98A2B3]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#344054]">{user.organization_name || <span className="text-[#98A2B3]">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}>
                        {user.role_display}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_active ? "text-[#027A48]" : "text-[#98A2B3]"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-[#027A48]" : "bg-[#D0D5DD]"}`} />
                        {user.is_active ? "Активен" : "Деактивирован"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#667085]">
                      {new Date(user.date_joined).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/dashboard/users/${user.id}/edit`}
                          className="h-7 px-3 rounded-[5px] border border-[#D9E0E8] text-xs text-[#344054] hover:bg-[#F7F9FC] transition-colors"
                        >
                          Изменить
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          disabled={actionLoading === user.id}
                          className={`h-7 px-3 rounded-[5px] border text-xs transition-colors disabled:opacity-50 ${
                            user.is_active
                              ? "border-[#D92D20]/40 text-[#D92D20] hover:bg-[#FFF2F2]"
                              : "border-[#027A48]/40 text-[#027A48] hover:bg-[#E6F6EF]"
                          }`}
                        >
                          {actionLoading === user.id ? "…" : user.is_active ? "Деактивировать" : "Активировать"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-[#F2F4F7] text-xs text-[#98A2B3]">
              Показано {filtered.length} из {users.length} пользователей
            </div>
          )}
        </div>
      )}
    </div>
  );
}
