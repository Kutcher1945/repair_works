"use client";

import { useId, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../context/auth-context";


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
      <div
        className="relative flex-shrink-0 w-full lg:w-[460px] xl:w-[500px] flex flex-col justify-center px-10 py-14 overflow-y-auto overflow-x-hidden"
        style={{ background: "linear-gradient(160deg, #06152A 0%, #0D2344 50%, #12345B 100%)" }}
      >
        {/* Sidebar-style grid texture */}
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
          className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(47,128,201,0.18), transparent 70%)" }}
        />

        <div className="relative z-10 w-full max-w-[360px] mx-auto">

          {/* Brand lockup */}
          <div className="flex items-center gap-4 mb-10">
            <Image
              src="/remontnye_raboty_logo.svg"
              alt="Ремонтные работы"
              width={800}
              height={240}
              className="h-10 w-auto"
              priority
              unoptimized
            />
            <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.18)" }} />
            <Image
              src="/logo_sc.png"
              alt="SC"
              width={400}
              height={120}
              className="h-10 w-auto"
              priority
              unoptimized
            />
          </div>

          <h1 className="text-[22px] font-semibold text-white mb-1">
            Вход в систему
          </h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Введите учётные данные для доступа к платформе
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor={emailId}
                className="block text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.75)" }}
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
                className="w-full h-11 px-4 rounded-[6px] text-sm outline-none transition-[border-color,box-shadow] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#fff",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(47,128,201,0.8)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,128,201,0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor={passwordId}
                className="block text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.75)" }}
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
                  className="w-full h-11 pl-4 pr-11 rounded-[6px] text-sm outline-none transition-[border-color,box-shadow] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#fff",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(47,128,201,0.8)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,128,201,0.2)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus-visible:outline-none rounded"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                role="alert"
                className="text-sm rounded-[6px] px-4 py-2.5"
                style={{ color: "#F97066", background: "rgba(217,45,32,0.15)", border: "1px solid rgba(217,45,32,0.35)" }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-2.5 rounded-[6px] text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7DD3FC] focus-visible:ring-offset-2"
              style={{
                background: "linear-gradient(135deg, #2F80C9, #1a5fa0)",
                boxShadow: "0 4px 20px rgba(47,128,201,0.4)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 28px rgba(47,128,201,0.6)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(47,128,201,0.4)"; }}
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
          <div className="mt-10 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-[11px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
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
