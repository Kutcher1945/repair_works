"use client";

type Props = {
  title: string;
  description?: string;
};

export function UnderDevelopment({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] select-none">

      {/* Illustration */}
      <div className="relative mb-10">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{ background: "radial-gradient(circle, #2F80C9 0%, #12345B 60%, transparent 100%)", transform: "scale(1.4)" }}
        />

        {/* Blueprint circle */}
        <div
          className="relative w-44 h-44 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0D2344 0%, #12345B 50%, #1a4a80 100%)",
            border: "1.5px solid rgba(125,211,252,0.25)",
            boxShadow: "0 0 0 8px rgba(47,128,201,0.06), 0 20px 60px rgba(18,52,91,0.4)",
          }}
        >
          {/* Dashed orbit ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 176 176" fill="none">
            <circle cx="88" cy="88" r="80" stroke="rgba(125,211,252,0.18)" strokeWidth="1" strokeDasharray="6 8" />
            <circle cx="88" cy="88" r="68" stroke="rgba(125,211,252,0.10)" strokeWidth="1" strokeDasharray="3 10" />
          </svg>

          {/* Central icon — construction / gears */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="relative z-10">
            {/* Gear large */}
            <path
              d="M36 22a14 14 0 1 0 0 28 14 14 0 0 0 0-28z"
              stroke="#7DD3FC"
              strokeWidth="2"
              opacity="0.9"
            />
            <path
              d="M36 28a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"
              stroke="#7DD3FC"
              strokeWidth="1.5"
              opacity="0.6"
            />
            {/* Gear teeth */}
            {[0,45,90,135,180,225,270,315].map((deg, i) => {
              const r = Math.PI * deg / 180;
              const x1 = 36 + 22 * Math.cos(r);
              const y1 = 36 + 22 * Math.sin(r);
              const x2 = 36 + 26 * Math.cos(r);
              const y2 = 36 + 26 * Math.sin(r);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#7DD3FC" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
              );
            })}
            {/* Wrench */}
            <path
              d="M50 14c-3 0-5.5 1.5-7 3.8l6.5 6.5-3.5 3.5-6.5-6.5c-2.3 1.5-3.8 4-3.8 7 0 4.4 3.6 8 8 8 1.8 0 3.4-.6 4.7-1.6L58 45l4-4-9.6-9.6C53.4 30 54 28.4 54 26.6c0-4.4-1.8-9.6-4-12.6z"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Circuit dots */}
            <circle cx="18" cy="18" r="2.5" fill="#7DD3FC" opacity="0.7" />
            <circle cx="54" cy="54" r="2.5" fill="#7DD3FC" opacity="0.7" />
            <circle cx="18" cy="54" r="1.5" fill="#7DD3FC" opacity="0.4" />
            <path d="M18 18h8M54 46v8" stroke="#7DD3FC" strokeWidth="1" opacity="0.4" strokeDasharray="2 3" />
          </svg>
        </div>
      </div>

      {/* Badge */}
      <div
        className="mb-4 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{
          background: "rgba(47,128,201,0.12)",
          border: "1px solid rgba(125,211,252,0.25)",
          color: "#7DD3FC",
        }}
      >
        В разработке
      </div>

      {/* Headline */}
      <h2 className="text-[26px] font-bold text-[#1D2939] mb-3 text-center">{title}</h2>

      {/* Description */}
      <p className="text-[14px] text-[#98A2B3] text-center max-w-sm leading-relaxed">
        {description ?? "Этот раздел находится в процессе разработки. Функциональность будет доступна в ближайшее время."}
      </p>

      {/* Progress bar (decorative) */}
      <div className="mt-8 w-48">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[#98A2B3]">Прогресс</span>
          <span className="text-[11px] font-medium text-[#2F80C9]">Скоро</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#E8EDF3] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: "38%",
              background: "linear-gradient(90deg, #12345B, #2F80C9)",
            }}
          />
        </div>
      </div>

      {/* Dashed grid decoration — background dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" width="600" height="600" viewBox="0 0 600 600">
          {Array.from({ length: 20 }, (_, r) =>
            Array.from({ length: 20 }, (_, c) => (
              <circle key={`${r}-${c}`} cx={c * 32} cy={r * 32} r="1.5" fill="#12345B" />
            ))
          )}
        </svg>
      </div>

    </div>
  );
}
