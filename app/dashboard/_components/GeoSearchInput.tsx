"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Suggestion {
  name: string;
  subtitle: string;
  lat?: number;
  lng?: number;
}

interface Props {
  onSelect: (lat: number, lng: number, displayName: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function GeoSearchInput({
  onSelect,
  disabled,
  placeholder = "Улица или адрес (напр. Айманова 103)…",
}: Props) {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [active, setActive]         = useState(-1);
  const [geocoding, setGeocoding]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const search = useCallback(async (text: string) => {
    if (text.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/yandex-suggest?text=${encodeURIComponent(text)}`);
      const data: { suggestions: Suggestion[] } = await res.json();
      setSuggestions(data.suggestions ?? []);
      setOpen((data.suggestions ?? []).length > 0);
      setActive(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  async function selectSuggestion(s: Suggestion) {
    setQuery(s.name);
    setOpen(false);
    setSuggestions([]);

    // Photon / Nominatim suggestions already carry coordinates — use directly.
    if (s.lat != null && s.lng != null) {
      onSelect(s.lat, s.lng, s.name);
      return;
    }

    // Yandex suggest only returns names; resolve via geocoder.
    setGeocoding(true);
    try {
      const res = await fetch(`/api/yandex-geocode?q=${encodeURIComponent(s.name)}`);
      const { lat, lng }: { lat: number | null; lng: number | null } = await res.json();
      if (lat != null && lng != null) onSelect(lat, lng, s.name);
    } catch {}
    finally { setGeocoding(false); }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); selectSuggestion(suggestions[active]); }
    else if (e.key === "Escape") { setOpen(false); setActive(-1); }
  }

  useEffect(() => {
    if (active >= 0 && listRef.current) {
      const el = listRef.current.children[active] as HTMLElement | undefined;
      el?.scrollIntoView?.({ block: "nearest" });
    }
  }, [active]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        {/* search icon */}
        <svg
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#98A2B3", pointerEvents: "none" }}
          width="15" height="15" viewBox="0 0 24 24" fill="none"
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled || geocoding}
          className="w-full h-10 pl-9 pr-9 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60"
        />
        {/* spinner / clear */}
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#98A2B3" }}>
          {loading || geocoding ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : query ? (
            <button
              type="button"
              onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", lineHeight: 1 }}
              aria-label="Очистить"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10000,
            background: "#fff", border: "1px solid #D9E0E8", borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)", margin: 0, padding: "4px 0",
            listStyle: "none", maxHeight: 260, overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => {
            const isAddress = /\d+[а-яёa-z]?$/i.test(s.name.trim());
            return (
            <li
              key={i}
              onMouseDown={() => selectSuggestion(s)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 12px", cursor: "pointer",
                background: i === active ? "#F0F5FF" : "transparent",
                transition: "background .1s",
              }}
            >
              {isAddress ? (
                <svg style={{ flexShrink: 0, marginTop: 2, color: "#2F80C9" }} width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg style={{ flexShrink: 0, marginTop: 2, color: "#98A2B3" }} width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: "#1D2939", margin: 0, fontWeight: i === active ? 600 : 400 }}>{s.name}</p>
                {s.subtitle && <p style={{ fontSize: 11, color: "#98A2B3", margin: "2px 0 0" }}>{s.subtitle}</p>}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
