"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Browser tab close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept all anchor clicks in capture phase (fires before Next.js router)
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      // Ignore: external, hash-only, mailto/tel, same page
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) return;
      if (href === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  function confirmLeave() {
    if (!pendingHref) return;
    const href = pendingHref;
    setPendingHref(null);
    router.push(href);
  }

  function cancelLeave() {
    setPendingHref(null);
  }

  return { showModal: !!pendingHref, confirmLeave, cancelLeave };
}

type Props = {
  show: boolean;
  mode: "create" | "edit";
  onConfirm: () => void;
  onCancel: () => void;
};

export function UnsavedChangesModal({ show, mode, onConfirm, onCancel }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [show, onCancel]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[12px] shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + header */}
        <div className="px-6 pt-6 pb-4 flex gap-4 items-start">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[#FFF2F2] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                stroke="#D92D20" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              />
              <line x1="12" y1="9" x2="12" y2="13" stroke="#D92D20" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="#D92D20" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#1D2939]">Несохранённые изменения</h3>
            <p className="text-sm text-[#667085] mt-1 leading-relaxed">
              {mode === "create"
                ? "Вы не завершили создание заявки. Если покинете страницу — данные будут потеряны."
                : "Вы не сохранили изменения. Если покинете страницу — все правки будут потеряны."}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#F2F4F7] mx-6" />

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-[6px] border border-[#D9E0E8] text-sm font-medium text-[#344054] hover:bg-[#F7F9FC] transition-colors"
          >
            Остаться
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 px-4 rounded-[6px] bg-[#D92D20] text-white text-sm font-medium hover:bg-[#B42318] transition-colors"
          >
            Покинуть страницу
          </button>
        </div>
      </div>
    </div>
  );
}
