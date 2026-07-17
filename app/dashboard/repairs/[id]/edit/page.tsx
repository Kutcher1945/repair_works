"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, apiUploadForm } from "../../../../lib/auth";
import type { DrawnGeometry } from "../../../_components/DrawMap";
import { useUnsavedChanges, UnsavedChangesModal } from "../../../_components/UnsavedChangesGuard";

const DrawMap = dynamic(() => import("../../../_components/DrawMap"), { ssr: false });

type District = { id: number; name_ru?: string | null; name_kz?: string | null; name?: string | null };

type ExistingDoc = { id: number; doc_type: string; name: string; file: string; created_at: string };
type ExistingPhoto = { id: number; phase: string; image: string; description?: string | null };

type RepairRequest = {
  id: number;
  title: string;
  description: string;
  district: number | { id: number } | null;
  address: string;
  road_section: string;
  planned_start_date: string;
  planned_end_date: string;
  has_traffic_restriction: boolean;
  traffic_restriction_description?: string | null;
  geometry?: DrawnGeometry | null;
  status: string;
  documents: ExistingDoc[];
  photos: ExistingPhoto[];
};

type FormState = {
  title: string;
  description: string;
  district: string;
  address: string;
  road_section: string;
  planned_start_date: string;
  planned_end_date: string;
  has_traffic_restriction: boolean;
  traffic_restriction_description: string;
  geometry: DrawnGeometry | null;
};

const EDITABLE_STATUSES = ["draft", "needs_revision"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  pending_review: "На проверке",
  needs_revision: "На доработке",
  active: "Активный ремонт",
  completed: "Завершён",
  cancelled: "Аннулирован",
};

function SectionLabel({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#12345B] text-white text-xs font-bold flex items-center justify-center">
        {num}
      </span>
      <h3 className="text-[15px] font-semibold text-[#1D2939]">{title}</h3>
    </div>
  );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#344054] mb-1.5">
        {label}
        {required && <span className="text-[#D92D20] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = "w-full h-10 px-3.5 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60 disabled:bg-[#F7F9FC]";
const TEXTAREA = "w-full px-3.5 py-2.5 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60 disabled:bg-[#F7F9FC] resize-none";

function SpinnerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#2F80C9] flex-shrink-0" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export default function EditRepairPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const contractRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  const [districts, setDistricts] = useState<District[]>([]);
  const [districtLoading, setDistrictLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");

  const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    district: "",
    address: "",
    road_section: "",
    planned_start_date: "",
    planned_end_date: "",
    has_traffic_restriction: false,
    traffic_restriction_description: "",
    geometry: null,
  });

  const [newDocFiles, setNewDocFiles] = useState<File[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    Promise.all([
      apiFetch<{ results?: District[] } | District[]>("/api/v1/repair-works/ref_district/"),
      apiFetch<RepairRequest>(`/api/v1/road-repair/requests/${id}/`),
    ])
      .then(([districtData, req]) => {
        if (Array.isArray(districtData)) setDistricts(districtData);
        else if ("results" in districtData && Array.isArray(districtData.results)) setDistricts(districtData.results);

        const districtId = req.district
          ? typeof req.district === "object"
            ? String(req.district.id)
            : String(req.district)
          : "";

        setForm({
          title: req.title,
          description: req.description,
          district: districtId,
          address: req.address,
          road_section: req.road_section,
          planned_start_date: req.planned_start_date,
          planned_end_date: req.planned_end_date,
          has_traffic_restriction: req.has_traffic_restriction,
          traffic_restriction_description: req.traffic_restriction_description ?? "",
          geometry: req.geometry ?? null,
        });

        setCurrentStatus(req.status);
        setReadOnly(!EDITABLE_STATUSES.includes(req.status));
        setExistingDocs(req.documents);
        setExistingPhotos(req.photos.filter((p) => p.phase === "before"));
      })
      .catch((e: unknown) => setPageError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => {
        setPageLoading(false);
        setDistrictLoading(false);
      });
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function districtLabel(d: District) {
    return d.name_ru ?? d.name_kz ?? d.name ?? String(d.id);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) { setError("Укажите название заявки"); return; }
    if (!form.district) { setError("Выберите район"); return; }
    if (!form.address.trim()) { setError("Укажите адрес"); return; }
    if (!form.planned_start_date || !form.planned_end_date) { setError("Укажите даты проведения работ"); return; }
    if (new Date(form.planned_end_date) < new Date(form.planned_start_date)) {
      setError("Дата окончания не может быть раньше даты начала");
      return;
    }
    if (!form.geometry) { setError("Нарисуйте геометрию участка на карте"); return; }

    setIsDirty(false);
    setSubmitting(true);
    try {
      setSubmitStep("Сохранение изменений…");
      await apiFetch(`/api/v1/road-repair/requests/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          district: Number(form.district),
          address: form.address.trim(),
          road_section: form.road_section.trim(),
          planned_start_date: form.planned_start_date,
          planned_end_date: form.planned_end_date,
          has_traffic_restriction: form.has_traffic_restriction,
          traffic_restriction_description: form.has_traffic_restriction
            ? form.traffic_restriction_description.trim()
            : "",
          geometry: form.geometry,
        }),
      });

      if (newDocFiles.length > 0) {
        for (let i = 0; i < newDocFiles.length; i++) {
          setSubmitStep(`Загрузка документов (${i + 1}/${newDocFiles.length})…`);
          const fd = new FormData();
          fd.append("request", id);
          fd.append("doc_type", "contract");
          fd.append("name", newDocFiles[i].name);
          fd.append("file", newDocFiles[i]);
          await apiUploadForm("/api/v1/road-repair/documents/", fd);
        }
      }

      if (newPhotoFiles.length > 0) {
        for (let i = 0; i < newPhotoFiles.length; i++) {
          setSubmitStep(`Загрузка фото (${i + 1}/${newPhotoFiles.length})…`);
          const fd = new FormData();
          fd.append("request", id);
          fd.append("phase", "before");
          fd.append("image", newPhotoFiles[i]);
          await apiUploadForm("/api/v1/road-repair/photos/", fd);
        }
      }

      router.replace(`/dashboard/repairs/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
      setSubmitting(false);
      setSubmitStep("");
    }
  }

  async function handleDeleteDoc(docId: number) {
    try {
      await apiFetch(`/api/v1/road-repair/documents/${docId}/`, { method: "DELETE" });
      setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      setError("Не удалось удалить документ");
    }
  }

  async function handleDeletePhoto(photoId: number) {
    try {
      await apiFetch(`/api/v1/road-repair/photos/${photoId}/`, { method: "DELETE" });
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setError("Не удалось удалить фото");
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-[#2F80C9]">
        <SpinnerIcon size={22} />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/repairs" className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#12345B] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Назад к заявкам
        </Link>
        <div className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">{pageError}</div>
      </div>
    );
  }

  const disabled = submitting || readOnly;

  return (
    <div>
      {/* Header */}
      <Link href={`/dashboard/repairs/${id}`} className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#12345B] transition-colors mb-5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        К просмотру заявки
      </Link>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="text-[19px] font-semibold text-[#1D2939]">Редактирование заявки №{id}</h2>
        {currentStatus && (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F2F4F7] text-[#667085]">
            {STATUS_LABELS[currentStatus] ?? currentStatus}
          </span>
        )}
      </div>

      {readOnly && (
        <div className="mb-5 flex items-start gap-3 rounded-[8px] border border-[#F59E42]/40 bg-[#FFFBF0] px-5 py-4 text-sm text-[#B76E00]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>
            Редактирование недоступно — заявка находится в статусе <strong>«{STATUS_LABELS[currentStatus] ?? currentStatus}»</strong>.
            Изменить заявку можно только в статусе «Черновик» или «На доработке».
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* Section 1 */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={1} title="Общая информация" />
          <div className="space-y-4">
            <FieldRow label="Название заявки" required>
              <input
                type="text"
                className={INPUT}
                placeholder="Ремонт дорожного покрытия на ул. …"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                disabled={disabled}
                maxLength={500}
              />
            </FieldRow>
            <FieldRow label="Описание работ" required>
              <textarea
                className={`${TEXTAREA} h-28`}
                placeholder="Опишите суть и объём предполагаемых работ…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                disabled={disabled}
              />
            </FieldRow>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={2} title="Место проведения работ" />
          <div className="space-y-4">
            <FieldRow label="Район" required>
              <select
                className={`${INPUT} appearance-none pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%2398A2B3' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center]`}
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                disabled={disabled || districtLoading}
              >
                <option value="">{districtLoading ? "Загрузка…" : "Выберите район"}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{districtLabel(d)}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Адрес" required>
              <input type="text" className={INPUT} placeholder="ул. Абая, д. 100" value={form.address} onChange={(e) => set("address", e.target.value)} disabled={disabled} maxLength={500} />
            </FieldRow>
            <FieldRow label="Участок дороги">
              <input type="text" className={INPUT} placeholder="от пр. Достык до ул. Фурманова" value={form.road_section} onChange={(e) => set("road_section", e.target.value)} disabled={disabled} maxLength={500} />
            </FieldRow>

            {/* Map */}
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-1.5">
                Геометрия участка
                <span className="text-[#D92D20] ml-0.5">*</span>
              </label>
              <DrawMap
                value={form.geometry}
                onChange={(g) => set("geometry", g)}
                disabled={disabled}
              />
              {form.geometry && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-[#027A48]">
                    ✓ {form.geometry.type === "LineString" ? "Линия сохранена" : form.geometry.type === "Polygon" ? "Полигон сохранён" : "Точка сохранена"}
                  </p>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => set("geometry", null)}
                      className="text-xs text-[#D92D20] hover:underline"
                    >
                      Очистить
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={3} title="Сроки проведения работ" />
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Плановая дата начала" required>
              <input type="date" className={INPUT} value={form.planned_start_date} onChange={(e) => set("planned_start_date", e.target.value)} disabled={disabled} />
            </FieldRow>
            <FieldRow label="Плановая дата окончания" required>
              <input type="date" className={INPUT} value={form.planned_end_date} min={form.planned_start_date || undefined} onChange={(e) => set("planned_end_date", e.target.value)} disabled={disabled} />
            </FieldRow>
          </div>
        </div>

        {/* Section 4 */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={4} title="Ограничение движения" />
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[#D9E0E8] accent-[#12345B] cursor-pointer disabled:cursor-not-allowed"
                checked={form.has_traffic_restriction}
                onChange={(e) => set("has_traffic_restriction", e.target.checked)}
                disabled={disabled}
              />
              <span className="text-sm text-[#344054]">Работы предполагают ограничение дорожного движения</span>
            </label>
            {form.has_traffic_restriction && (
              <FieldRow label="Описание ограничения">
                <textarea className={`${TEXTAREA} h-24`} placeholder="Укажите характер ограничений…" value={form.traffic_restriction_description} onChange={(e) => set("traffic_restriction_description", e.target.value)} disabled={disabled} />
              </FieldRow>
            )}
          </div>
        </div>

        {/* Section 5 — Documents */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={5} title="Договор и документы" />

          {existingDocs.length > 0 && (
            <div className="space-y-2 mb-4">
              {existingDocs.map((doc) => {
                const href = doc.file.startsWith("http") ? doc.file : `${API_URL}${doc.file}`;
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-[#D9E0E8] bg-[#F7F9FC]">
                    <FileIcon />
                    <div className="flex-1 min-w-0">
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#12345B] hover:underline truncate block">{doc.name || doc.file.split("/").pop()}</a>
                      <p className="text-xs text-[#98A2B3]">{new Date(doc.created_at).toLocaleDateString("ru-RU")}</p>
                    </div>
                    {!readOnly && (
                      <button type="button" onClick={() => handleDeleteDoc(doc.id)} className="text-[#98A2B3] hover:text-[#D92D20] transition-colors flex-shrink-0" aria-label="Удалить документ">
                        <XIcon />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!readOnly && (
            <>
              <input
                ref={contractRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                multiple
                className="hidden"
                onChange={(e) => {
                  setNewDocFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                  if (contractRef.current) contractRef.current.value = "";
                }}
              />
              {newDocFiles.length > 0 && (
                <div className="space-y-2 mb-3">
                  {newDocFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-[#D9E0E8] border-dashed bg-[#F7F9FC]">
                      <FileIcon />
                      <span className="text-sm text-[#1D2939] flex-1 min-w-0 truncate">{f.name}</span>
                      <button type="button" onClick={() => setNewDocFiles((prev) => prev.filter((_, j) => j !== i))} className="text-[#98A2B3] hover:text-[#D92D20] transition-colors flex-shrink-0" aria-label="Удалить"><XIcon /></button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => contractRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-6 rounded-[8px] border border-dashed border-[#D9E0E8] text-[#98A2B3] hover:border-[#2F80C9] hover:text-[#2F80C9] transition-colors">
                <UploadIcon />
                <span className="text-sm">{newDocFiles.length > 0 ? `Добавить ещё (${newDocFiles.length} выбрано)` : "Добавить документы"}</span>
                <span className="text-xs">PDF, DOC, DOCX, XLS, XLSX</span>
              </button>
            </>
          )}
        </div>

        {/* Section 6 — Photos */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={6} title="Фотофиксация (до начала работ)" />

          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {existingPhotos.map((photo) => {
                const src = photo.image.startsWith("http") ? photo.image : `${API_URL}${photo.image}`;
                return (
                  <div key={photo.id} className="relative group aspect-square rounded-[6px] overflow-hidden border border-[#D9E0E8]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={photo.description ?? "Фото"} className="w-full h-full object-cover" />
                    {!readOnly && (
                      <button type="button" onClick={() => handleDeletePhoto(photo.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Удалить фото">
                        <XIcon />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!readOnly && (
            <>
              <input ref={photosRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { setNewPhotoFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]); }} />
              {newPhotoFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {newPhotoFiles.map((f, i) => {
                    const url = URL.createObjectURL(f);
                    return (
                      <div key={i} className="relative group aspect-square rounded-[6px] overflow-hidden border border-[#D9E0E8] border-dashed">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={f.name} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setNewPhotoFiles((prev) => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Удалить">
                          <XIcon />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <button type="button" onClick={() => photosRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-6 rounded-[8px] border border-dashed border-[#D9E0E8] text-[#98A2B3] hover:border-[#2F80C9] hover:text-[#2F80C9] transition-colors">
                <UploadIcon />
                <span className="text-sm">{newPhotoFiles.length > 0 ? `Добавить ещё (${newPhotoFiles.length} новых)` : "Загрузить фото"}</span>
                <span className="text-xs">JPG, PNG, WEBP</span>
              </button>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pb-4">
          {!readOnly && (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2.5 h-10 px-6 rounded-[6px] bg-[#12345B] text-white text-sm font-semibold hover:bg-[#0A223D] transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80C9] focus-visible:ring-offset-2"
            >
              {submitting ? (
                <>
                  <SpinnerIcon />
                  {submitStep || "Сохранение…"}
                </>
              ) : (
                "Сохранить изменения"
              )}
            </button>
          )}
          <Link
            href={`/dashboard/repairs/${id}`}
            className="inline-flex items-center h-10 px-5 rounded-[6px] border border-[#D9E0E8] text-sm font-medium text-[#667085] hover:bg-[#F7F9FC] transition-colors"
          >
            {readOnly ? "Вернуться" : "Отмена"}
          </Link>
        </div>

      </form>

      <UnsavedChangesModal
        show={showModal}
        mode="edit"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />
    </div>
  );
}
