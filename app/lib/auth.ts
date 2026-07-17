const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type User = {
  id: number;
  email: string;
  username?: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: "admin" | "employee" | "student";
  organization_name?: string;
  date_joined?: string;
  is_active?: boolean;
};

export function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem("rw_access");
  const refresh = localStorage.getItem("rw_refresh");
  if (!access || !refresh) return null;
  return { access, refresh };
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem("rw_access", tokens.access);
  localStorage.setItem("rw_refresh", tokens.refresh);
}

export function clearTokens(): void {
  localStorage.removeItem("rw_access");
  localStorage.removeItem("rw_refresh");
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ user: User; access: string; refresh: string }> {
  const res = await fetch(`${API_URL}/api/v1/common/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const detail = (body.detail ?? body.error ?? body.non_field_errors) as string | string[] | undefined;
    const message = Array.isArray(detail) ? detail[0] : detail;
    throw new Error(message ?? "Неверный email или пароль");
  }
  return res.json() as Promise<{ user: User; access: string; refresh: string }>;
}

export async function apiLogout(refresh: string, access: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/common/auth/logout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify({ refresh }),
  });
}

export async function apiGetMe(access: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/v1/common/auth/me/`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json() as Promise<User>;
}

async function tryRefresh(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refresh) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/common/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access: string };
    saveTokens({ access: data.access, refresh: tokens.refresh });
    return data.access;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers ?? {}) as Record<string, string>),
  };
  if (tokens?.access) headers["Authorization"] = `Bearer ${tokens.access}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const newAccess = await tryRefresh();
    if (newAccess) {
      headers["Authorization"] = `Bearer ${newAccess}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    } else {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/";
      throw new Error("Сессия истекла. Войдите снова.");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body.detail as string | undefined) ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiUploadForm<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {};
  if (tokens?.access) headers["Authorization"] = `Bearer ${tokens.access}`;

  let res = await fetch(`${API_URL}${path}`, { method, headers, body: formData });

  if (res.status === 401) {
    const newAccess = await tryRefresh();
    if (newAccess) {
      headers["Authorization"] = `Bearer ${newAccess}`;
      res = await fetch(`${API_URL}${path}`, { method, headers, body: formData });
    } else {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/";
      throw new Error("Сессия истекла. Войдите снова.");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body.detail as string | undefined) ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
