"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../lib/auth";
import type { User } from "../../../lib/auth";
import type { DrawnGeometry } from "../../_components/DrawMap";

const DrawMap = dynamic(() => import("../../_components/DrawMap"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_LABELS: Record<string, string> = {
  draft:          "Черновик",
  pending_review: "На проверке",
  needs_revision: "На доработке",
  active:         "Активный ремонт",
  completed:      "Завершён",
  cancelled:      "Аннулирован",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:          { bg: "#F2F4F7", text: "#667085" },
  pending_review: { bg: "#FFF7E6", text: "#B76E00" },
  needs_revision: { bg: "#FFF2F2", text: "#D92D20" },
  active:         { bg: "#E6F6EF", text: "#027A48" },
  completed:      { bg: "#DCECF8", text: "#12345B" },
  cancelled:      { bg: "#F2F4F7", text: "#98A2B3" },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  contract:        "Договор",
  additional:      "Доп. соглашение",
  completion_act:  "Акт выполненных работ",
  extension_doc:   "Документ о продлении",
};

const PHOTO_PHASE_LABELS: Record<string, string> = {
  before:  "До начала работ",
  current: "В процессе",
  after:   "После завершения",
};

type Document = {
  id: number;
  doc_type: string;
  name: string;
  file: string;
  comment?: string | null;
  created_at: string;
};

type Photo = {
  id: number;
  phase: string;
  image: string;
  description?: string | null;
  taken_at?: string | null;
  created_at: string;
};

type StatusHistoryEntry = {
  id: number;
  from_status: string | null;
  to_status: string;
  comment?: string | null;
  created_at: string;
};

type Comment = {
  id: number;
  author: number;
  is_codd_comment: boolean;
  text: string;
  created_at: string;
};

type RepairRequest = {
  id: number;
  title: string;
  description: string;
  organization_name: string;
  district: number | { id: number; name_ru?: string | null; name_kz?: string | null } | null;
  address: string;
  road_section: string;
  planned_start_date: string;
  planned_end_date: string;
  current_end_date?: string | null;
  has_traffic_restriction: boolean;
  traffic_restriction_description?: string | null;
  is_work_finished: boolean;
  actual_end_date?: string | null;
  completion_comment?: string | null;
  geometry?: DrawnGeometry | null;
  status: string;
  is_available_on_map: boolean;
  approved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  days_remaining: number;
  days_overdue: number;
  is_overdue: boolean;
  documents: Document[];
  photos: Photo[];
  status_history: StatusHistoryEntry[];
  comments: Comment[];
};

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function resolveDistrictName(d: RepairRequest["district"]): string {
  if (!d) return "—";
  if (typeof d === "object") return d.name_ru ?? d.name_kz ?? String(d.id);
  return String(d);
}

function SpinnerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#D9E0E8] rounded-[10px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F2F4F7]">
        <h3 className="text-sm font-semibold text-[#1D2939]">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-2.5 border-b border-[#F7F9FC] last:border-b-0">
      <span className="text-sm text-[#667085]">{label}</span>
      <span className="text-sm text-[#1D2939]">{value ?? "—"}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] ?? { bg: "#F2F4F7", text: "#667085" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function RepairDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [request, setRequest] = useState<RepairRequest | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [statusAction, setStatusAction] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch<RepairRequest>(`/api/v1/road-repair/requests/${id}/`),
      apiFetch<User>("/api/v1/common/auth/me/"),
    ])
      .then(([req, me]) => { setRequest(req); setCurrentUser(me); })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Ошибка загрузки";
        if (msg.includes("404") || msg.includes("HTTP 404")) {
          setError("Заявка не найдена или у вас нет доступа к ней");
        } else {
          setError(msg);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  async function changeStatus(newStatus: string) {
    if (!request) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (statusComment.trim()) body.comment = statusComment.trim();
      const updated = await apiFetch<RepairRequest>(`/api/v1/road-repair/requests/${id}/change_status/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setRequest(updated);
      setStatusAction(null);
      setStatusComment("");
    } catch (e: unknown) {
      setStatusError(e instanceof Error ? e.message : "Ошибка при смене статуса");
    } finally {
      setStatusLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-[#2F80C9]">
        <SpinnerIcon />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/repairs" className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#12345B] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Назад к заявкам
        </Link>
        <div className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">
          {error ?? "Заявка не найдена"}
        </div>
      </div>
    );
  }

  const photosByPhase: Record<string, Photo[]> = {};
  for (const p of request.photos) {
    if (!photosByPhase[p.phase]) photosByPhase[p.phase] = [];
    photosByPhase[p.phase].push(p);
  }

  const effectiveEndDate = request.current_end_date ?? request.planned_end_date;

  function clientDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const daysRemaining = request.days_remaining ?? clientDaysRemaining(effectiveEndDate);
  const daysOverdue = request.days_overdue ?? Math.max(0, -clientDaysRemaining(effectiveEndDate));
  const isOverdue = request.is_overdue || daysOverdue > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Link href="/dashboard/repairs" className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#12345B] transition-colors mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Назад к заявкам
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[19px] font-semibold text-[#1D2939]">{request.title}</h2>
            <StatusBadge status={request.status} />
            {isOverdue && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF2F2] text-[#D92D20]">
                Просрочено на {daysOverdue} дн.
              </span>
            )}
          </div>
          <p className="text-sm text-[#667085] mt-1">
            Заявка №{request.id} · создана {formatDateTime(request.created_at)}
          </p>
        </div>

        <Link
          href={`/dashboard/repairs/${id}/edit`}
          className="flex-shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-[6px] border border-[#D9E0E8] text-sm font-medium text-[#667085] hover:bg-[#F7F9FC] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Редактировать
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5 items-start">

        {/* Left column */}
        <div className="space-y-5">

          {/* General info */}
          <SectionCard title="Общая информация">
            <Field label="Организация" value={request.organization_name || "—"} />
            <Field label="Описание" value={
              <span className="whitespace-pre-wrap leading-relaxed">{request.description || "—"}</span>
            } />
          </SectionCard>

          {/* Location */}
          <SectionCard title="Место проведения работ">
            <Field label="Район" value={resolveDistrictName(request.district)} />
            <Field label="Адрес" value={request.address} />
            <Field label="Участок дороги" value={request.road_section || "—"} />
          </SectionCard>

          {/* Geometry map */}
          <SectionCard title="Геометрия участка">
            {request.geometry ? (
              <DrawMap
                value={request.geometry}
                onChange={() => {}}
                disabled
              />
            ) : (
              <p className="text-sm text-[#98A2B3] py-2">Геометрия не указана</p>
            )}
          </SectionCard>

          {/* Traffic */}
          <SectionCard title="Ограничение движения">
            <Field
              label="Ограничение движения"
              value={
                <span className={request.has_traffic_restriction ? "text-[#D92D20]" : "text-[#027A48]"}>
                  {request.has_traffic_restriction ? "Да — ограничение предусмотрено" : "Нет ограничений"}
                </span>
              }
            />
            {request.has_traffic_restriction && (
              <Field label="Описание" value={request.traffic_restriction_description || "—"} />
            )}
          </SectionCard>

          {/* Documents */}
          <SectionCard title={`Документы (${request.documents.length})`}>
            {request.documents.length === 0 ? (
              <p className="text-sm text-[#98A2B3] py-2">Документы не прикреплены</p>
            ) : (
              <div className="space-y-2">
                {request.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file.startsWith("http") ? doc.file : `${API_URL}${doc.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-[#D9E0E8] hover:border-[#2F80C9] hover:bg-[#F7F9FC] transition-colors group"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#2F80C9] flex-shrink-0" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1D2939] group-hover:text-[#2F80C9] truncate transition-colors">{doc.name}</p>
                      <p className="text-xs text-[#98A2B3]">{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type} · {formatDate(doc.created_at)}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#98A2B3] group-hover:text-[#2F80C9] flex-shrink-0 transition-colors" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Photos */}
          {Object.keys(photosByPhase).length > 0 && (
            <SectionCard title={`Фотоматериалы (${request.photos.length})`}>
              <div className="space-y-5">
                {(["before", "current", "after"] as const).map((phase) => {
                  const photos = photosByPhase[phase];
                  if (!photos?.length) return null;
                  return (
                    <div key={phase}>
                      <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide mb-3">
                        {PHOTO_PHASE_LABELS[phase]}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {photos.map((photo) => {
                          const src = photo.image.startsWith("http") ? photo.image : `${API_URL}${photo.image}`;
                          return (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={() => setSelectedPhoto(src)}
                              className="aspect-square rounded-[6px] overflow-hidden border border-[#D9E0E8] hover:border-[#2F80C9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80C9]"
                              aria-label="Открыть фото"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt={photo.description ?? "Фото"} className="w-full h-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Status history */}
          {request.status_history.length > 0 && (
            <SectionCard title="История статусов">
              <div className="space-y-3">
                {[...request.status_history].reverse().map((entry) => (
                  <div key={entry.id} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-[#D9E0E8] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.from_status && (
                          <>
                            <StatusBadge status={entry.from_status} />
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#98A2B3]" aria-hidden="true">
                              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </>
                        )}
                        <StatusBadge status={entry.to_status} />
                      </div>
                      {entry.comment && <p className="text-xs text-[#667085] mt-1">{entry.comment}</p>}
                      <p className="text-xs text-[#98A2B3] mt-0.5">{formatDateTime(entry.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Comments */}
          {request.comments.length > 0 && (
            <SectionCard title={`Комментарии (${request.comments.length})`}>
              <div className="space-y-3">
                {request.comments.map((c) => (
                  <div key={c.id} className={[
                    "px-4 py-3 rounded-[8px] border text-sm",
                    c.is_codd_comment
                      ? "border-[#DCECF8] bg-[#F7FAFF]"
                      : "border-[#D9E0E8] bg-[#F7F9FC]",
                  ].join(" ")}>
                    {c.is_codd_comment && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2F80C9] mb-1">ЦОДД</p>
                    )}
                    <p className="text-[#1D2939] leading-relaxed">{c.text}</p>
                    <p className="text-xs text-[#98A2B3] mt-1.5">{formatDateTime(c.created_at)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Status card */}
          <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide">Статус заявки</p>
            <StatusBadge status={request.status} />

            {request.approved_at && (
              <div className="text-xs text-[#667085]">
                <span className="text-[#98A2B3]">Одобрена: </span>
                {formatDateTime(request.approved_at)}
              </div>
            )}
            {request.closed_at && (
              <div className="text-xs text-[#667085]">
                <span className="text-[#98A2B3]">Закрыта: </span>
                {formatDateTime(request.closed_at)}
              </div>
            )}
          </div>

          {/* Status management */}
          {(() => {
            const isAdmin = currentUser?.role === "admin" || currentUser?.role === undefined;
            const actions: { label: string; status: string; style: string; needsComment?: boolean }[] = [];

            if (isAdmin) {
              if (request.status === "draft") {
                actions.push({ label: "Отправить на проверку", status: "pending_review", style: "bg-[#12345B] text-white hover:bg-[#0A223D]" });
                actions.push({ label: "Аннулировать", status: "cancelled", style: "border border-[#D92D20] text-[#D92D20] hover:bg-[#FFF2F2]", needsComment: true });
              }
              if (request.status === "pending_review") {
                actions.push({ label: "Одобрить", status: "active", style: "bg-[#027A48] text-white hover:bg-[#015c36]" });
                actions.push({ label: "На доработку", status: "needs_revision", style: "border border-[#F59E42] text-[#B76E00] hover:bg-[#FFFBF0]", needsComment: true });
                actions.push({ label: "Аннулировать", status: "cancelled", style: "border border-[#D92D20] text-[#D92D20] hover:bg-[#FFF2F2]", needsComment: true });
              }
              if (request.status === "needs_revision") {
                actions.push({ label: "Одобрить", status: "active", style: "bg-[#027A48] text-white hover:bg-[#015c36]" });
                actions.push({ label: "Аннулировать", status: "cancelled", style: "border border-[#D92D20] text-[#D92D20] hover:bg-[#FFF2F2]", needsComment: true });
              }
              if (request.status === "active") {
                actions.push({ label: "Завершить", status: "completed", style: "bg-[#12345B] text-white hover:bg-[#0A223D]", needsComment: true });
                actions.push({ label: "Аннулировать", status: "cancelled", style: "border border-[#D92D20] text-[#D92D20] hover:bg-[#FFF2F2]", needsComment: true });
              }
            } else {
              // employee: can only submit their draft for review
              if (request.status === "draft") {
                actions.push({ label: "Отправить на проверку", status: "pending_review", style: "bg-[#12345B] text-white hover:bg-[#0A223D]" });
              }
            }

            if (!actions.length) return null;

            const activeAction = actions.find((a) => a.status === statusAction);

            return (
              <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-4 space-y-2.5">
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide">Управление</p>

                {!statusAction ? (
                  <div className="flex flex-col gap-2">
                    {actions.map((a) => (
                      <button
                        key={a.status}
                        type="button"
                        onClick={() => { setStatusError(null); setStatusComment(""); setStatusAction(a.status); }}
                        className={`w-full h-9 px-3 rounded-[6px] text-sm font-medium transition-colors ${a.style}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-sm text-[#344054] font-medium">{activeAction?.label}</p>
                    {activeAction?.needsComment && (
                      <textarea
                        className="w-full px-3 py-2 rounded-[6px] border border-[#D9E0E8] text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 resize-none"
                        rows={3}
                        placeholder="Комментарий (необязательно)…"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        disabled={statusLoading}
                      />
                    )}
                    {statusError && (
                      <p className="text-xs text-[#D92D20]">{statusError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => changeStatus(statusAction)}
                        disabled={statusLoading}
                        className={`flex-1 h-9 px-3 rounded-[6px] text-sm font-medium transition-colors disabled:opacity-60 ${activeAction?.style}`}
                      >
                        {statusLoading ? "…" : "Подтвердить"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStatusAction(null); setStatusComment(""); setStatusError(null); }}
                        disabled={statusLoading}
                        className="h-9 px-3 rounded-[6px] border border-[#D9E0E8] text-sm text-[#667085] hover:bg-[#F7F9FC] transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dates card */}
          <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide">Сроки</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#98A2B3]">Начало</span>
                <span className="text-[#1D2939] font-medium">{formatDate(request.planned_start_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#98A2B3]">Окончание</span>
                <span className="text-[#1D2939] font-medium">{formatDate(effectiveEndDate)}</span>
              </div>
              {request.current_end_date && request.current_end_date !== request.planned_end_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#98A2B3]">По плану</span>
                  <span className="text-[#98A2B3] line-through">{formatDate(request.planned_end_date)}</span>
                </div>
              )}
            </div>

            {request.status !== "completed" && request.status !== "cancelled" && (
              <div className={[
                "mt-1 px-3 py-2 rounded-[6px] text-xs font-medium text-center",
                isOverdue ? "bg-[#FFF2F2] text-[#D92D20]" : "bg-[#E6F6EF] text-[#027A48]",
              ].join(" ")}>
                {isOverdue
                  ? `Просрочено на ${daysOverdue} дн.`
                  : `До окончания: ${daysRemaining} дн.`}
              </div>
            )}

            {request.actual_end_date && (
              <div className="flex justify-between text-sm pt-2 border-t border-[#F2F4F7]">
                <span className="text-[#98A2B3]">Фактически</span>
                <span className="text-[#027A48] font-medium">{formatDate(request.actual_end_date)}</span>
              </div>
            )}
          </div>

          {/* Map visibility */}
          <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-4">
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide mb-2.5">Карта</p>
            <div className={[
              "inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full",
              request.is_available_on_map
                ? "bg-[#E6F6EF] text-[#027A48]"
                : "bg-[#F2F4F7] text-[#98A2B3]",
            ].join(" ")}>
              <span className={[
                "w-1.5 h-1.5 rounded-full",
                request.is_available_on_map ? "bg-[#027A48]" : "bg-[#D0D5DD]",
              ].join(" ")} />
              {request.is_available_on_map ? "Отображается на карте" : "Не отображается"}
            </div>
          </div>

          {/* Work completion */}
          {(request.status === "active" || request.status === "completed") && (
            <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-4">
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide mb-2.5">Завершение работ</p>
              <div className="flex items-center gap-2 text-sm">
                <span className={[
                  "w-4 h-4 rounded flex items-center justify-center flex-shrink-0",
                  request.is_work_finished ? "bg-[#027A48]" : "bg-[#F2F4F7]",
                ].join(" ")}>
                  {request.is_work_finished && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-[#667085]">
                  {request.is_work_finished ? "Работы выполнены" : "В процессе выполнения"}
                </span>
              </div>
              {request.completion_comment && (
                <p className="text-xs text-[#667085] mt-2 leading-relaxed">{request.completion_comment}</p>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-4 space-y-2">
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide mb-1">Системная информация</p>
            <div className="flex justify-between text-xs">
              <span className="text-[#98A2B3]">Создана</span>
              <span className="text-[#667085]">{formatDateTime(request.created_at)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#98A2B3]">Обновлена</span>
              <span className="text-[#667085]">{formatDateTime(request.updated_at)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Закрыть"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhoto}
            alt="Фото"
            className="max-w-[90vw] max-h-[90vh] rounded-[8px] shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
