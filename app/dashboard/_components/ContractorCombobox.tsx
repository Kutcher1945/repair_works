"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../../lib/auth";

type ContractorOption = { id: number; name: string; phone: string };

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  onSelect: (name: string, phone: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ContractorCombobox({ name, onNameChange, onSelect, disabled, className }: Props) {
  const [query, setQuery] = useState(name);
  const [options, setOptions] = useState<ContractorOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(name);
  }, [name]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const fetchContractors = useCallback((q: string) => {
    if (!q.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    apiFetch<ContractorOption[] | { results: ContractorOption[] }>(
      `/api/v1/road-repair/contractors/?search=${encodeURIComponent(q)}`
    )
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setOptions(list);
        setOpen(list.length > 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onNameChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchContractors(val), 300);
  }

  function handleSelect(opt: ContractorOption) {
    setQuery(opt.name);
    setOptions([]);
    setOpen(false);
    onSelect(opt.name, opt.phone);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className={className}
        placeholder="ТОО «Название компании»"
        value={query}
        onChange={handleInput}
        disabled={disabled}
        autoComplete="off"
        onFocus={() => { if (options.length > 0) setOpen(true); }}
      />

      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin text-[#98A2B3]" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
      )}

      {open && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-white border border-[#D9E0E8] rounded-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.10)] max-h-56 overflow-y-auto"
        >
          {options.map((opt) => (
            <li key={opt.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-[#F2F8FF] transition-colors"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
              >
                <span className="text-sm font-medium text-[#1D2939] block truncate">{opt.name}</span>
                {opt.phone && <span className="text-xs text-[#98A2B3]">{opt.phone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
