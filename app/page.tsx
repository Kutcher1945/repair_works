"use client";

import { useId, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/auth-context";

function BuildingIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M3 23h20M7 23V11l6-4 6 4v12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="10" y="16" width="6" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="8.5" y="7.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14.5" y="7.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const emailId = useId();
  const passwordId = useId();
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  if (authLoading || user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F4F7FB] text-[#2F80C9]">
        <Spinner />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Заполните все поля");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left hero */}
      <div
        className="hidden lg:block relative flex-1 overflow-hidden"
        role="img"
        aria-label="Панорама Алматы — Ремонтные работы"
      >
        <style>{`
          @keyframes heroStripT {
            from { transform: translateY(-110%); }
            to   { transform: translateY(0); }
          }
          @keyframes heroStripB {
            from { transform: translateY(110%); }
            to   { transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-strip { animation-duration: 0.01ms !important; animation-delay: 0ms !important; }
          }
        `}</style>

        {Array.from({ length: 10 }, (_, i) => {
          const n = 10;
          const w = 100 / n;  // strip width in %
          const d = 16;       // diagonal offset in %
          const x0 = i * w - d / 2;
          const x1 = x0 + w;
          // Extend first strip to cover bottom-left corner,
          // extend last strip to cover top-right corner
          const tl = `${i === 0 ? 0 : x0}% 0%`;
          const tr = `${i === n - 1 ? 100 : x1}% 0%`;
          const br = `${i === n - 1 ? 100 : x1 + d}% 100%`;
          const bl = `${i === 0 ? 0 : x0 + d}% 100%`;
          return (
            <div
              key={i}
              className="hero-strip absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/background-login.png')",
                clipPath: `polygon(${tl}, ${tr}, ${br}, ${bl})`,
                animation: `${i % 2 === 0 ? "heroStripT" : "heroStripB"} 1s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.075}s both`,
              }}
            />
          );
        })}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(10,34,61,0.55) 0%, rgba(18,52,91,0.25) 50%, rgba(18,52,91,0.05) 100%)",
          }}
        />
      </div>

      {/* Right login panel */}
      <div className="flex-shrink-0 w-full lg:w-[460px] xl:w-[500px] flex flex-col justify-center px-10 py-14 bg-[#F4F7FB] overflow-y-auto">
        <div className="w-full max-w-[360px] mx-auto">

          {/* Brand lockup */}
          <div className="flex items-center gap-3 mb-10">
            <div className="text-[#12345B]">
              <BuildingIcon />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#8899AA]">
                Система мониторинга
              </p>
              <p className="text-[17px] font-bold text-[#12345B] tracking-wider leading-tight">
                Ремонтные работы
              </p>
            </div>
          </div>

          <h1 className="text-[22px] font-semibold text-[#1D2939] mb-1">
            Вход в систему
          </h1>
          <p className="text-sm text-[#667085] mb-8 leading-relaxed">
            Введите учётные данные для доступа к платформе
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor={emailId}
                className="block text-sm font-medium text-[#1D2939]"
              >
                Email
              </label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                autoComplete="email"
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-[6px] border border-[#D9E0E8] bg-white text-[#1D2939] text-sm placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor={passwordId}
                className="block text-sm font-medium text-[#1D2939]"
              >
                Пароль
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full h-11 pl-4 pr-11 rounded-[6px] border border-[#D9E0E8] bg-white text-[#1D2939] text-sm placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80C9] rounded"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                role="alert"
                className="text-sm text-[#D92D20] bg-[#FFF2F2] border border-[#D92D20]/30 rounded-[6px] px-4 py-2.5"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-2.5 rounded-[6px] bg-[#12345B] text-white text-sm font-semibold tracking-wide hover:bg-[#0A223D] active:bg-[#0A223D] transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80C9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F7FB]"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  Выполняется вход…
                </>
              ) : (
                "Войти"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-[#D9E0E8]">
            <p className="text-[11px] text-[#98A2B3] text-center leading-relaxed">
              Управление строительства города Алматы
              <br />
              © 2024 Ремонтные работы. Все права защищены.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
