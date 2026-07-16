"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, apiUploadForm } from "../../../lib/auth";

type District = { id: number; name_ru?: string | null; name_kz?: string | null; name?: string | null };

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

const INPUT = "w-full h-10 px-3.5 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60";
const TEXTAREA = "w-full px-3.5 py-2.5 rounded-[6px] border border-[#D9E0E8] bg-white text-sm text-[#1D2939] placeholder:text-[#98A2B3] outline-none transition-[border-color,box-shadow] focus:border-[#2F80C9] focus:ring-2 focus:ring-[#2F80C9]/20 disabled:opacity-60 resize-none";

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

export default function NewRepairPage() {
  const router = useRouter();
  const contractRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  const [districts, setDistricts] = useState<District[]>([]);
  const [districtLoading, setDistrictLoading] = useState(true);

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
  });

  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ results?: District[] } | District[]>("/api/v1/repair-works/ref_district/")
      .then((data) => {
        if (Array.isArray(data)) setDistricts(data);
        else if ("results" in data && Array.isArray(data.results)) setDistricts(data.results);
      })
      .catch(() => {})
      .finally(() => setDistrictLoading(false));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
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

    setSubmitting(true);
    try {
      setSubmitStep("Создание заявки…");
      const payload: Record<string, unknown> = {
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
      };

      const created = await apiFetch<{ id: number }>("/api/v1/road-repair/requests/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (docFiles.length > 0) {
        for (let i = 0; i < docFiles.length; i++) {
          setSubmitStep(`Загрузка документов (${i + 1}/${docFiles.length})…`);
          const fd = new FormData();
          fd.append("request", String(created.id));
          fd.append("doc_type", "contract");
          fd.append("name", docFiles[i].name);
          fd.append("file", docFiles[i]);
          await apiUploadForm("/api/v1/road-repair/documents/", fd);
        }
      }

      if (photoFiles.length > 0) {
        setSubmitStep(`Загрузка фото (0/${photoFiles.length})…`);
        for (let i = 0; i < photoFiles.length; i++) {
          setSubmitStep(`Загрузка фото (${i + 1}/${photoFiles.length})…`);
          const fd = new FormData();
          fd.append("request", String(created.id));
          fd.append("phase", "before");
          fd.append("image", photoFiles[i]);
          await apiUploadForm("/api/v1/road-repair/photos/", fd);
        }
      }

      router.replace("/dashboard/repairs");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
      setSubmitting(false);
      setSubmitStep("");
    }
  }

  return (
    <div>
      {/* Back */}
      <Link
        href="/dashboard/repairs"
        className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#12345B] transition-colors mb-5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Назад к заявкам
      </Link>

      <div className="mb-6">
        <h2 className="text-[19px] font-semibold text-[#1D2939]">Новая заявка на ремонтные работы</h2>
        <p className="text-sm text-[#667085] mt-0.5">Заполните все обязательные поля и отправьте заявку на проверку</p>
      </div>

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
                disabled={submitting}
                maxLength={500}
              />
            </FieldRow>
            <FieldRow label="Описание работ" required>
              <textarea
                className={`${TEXTAREA} h-28`}
                placeholder="Опишите суть и объём предполагаемых работ…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                disabled={submitting}
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
                disabled={submitting || districtLoading}
              >
                <option value="">{districtLoading ? "Загрузка…" : "Выберите район"}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{districtLabel(d)}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="Адрес" required>
              <input
                type="text"
                className={INPUT}
                placeholder="ул. Абая, д. 100"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                disabled={submitting}
                maxLength={500}
              />
            </FieldRow>

            <FieldRow label="Участок дороги">
              <input
                type="text"
                className={INPUT}
                placeholder="от пр. Достык до ул. Фурманова"
                value={form.road_section}
                onChange={(e) => set("road_section", e.target.value)}
                disabled={submitting}
                maxLength={500}
              />
            </FieldRow>

            <div className="rounded-[8px] border border-dashed border-[#D9E0E8] bg-[#F7F9FC] px-4 py-3 text-xs text-[#98A2B3]">
              Рисование трассы на карте будет доступно в следующей версии
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={3} title="Сроки проведения работ" />
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Плановая дата начала" required>
              <input
                type="date"
                className={INPUT}
                value={form.planned_start_date}
                onChange={(e) => set("planned_start_date", e.target.value)}
                disabled={submitting}
              />
            </FieldRow>
            <FieldRow label="Плановая дата окончания" required>
              <input
                type="date"
                className={INPUT}
                value={form.planned_end_date}
                min={form.planned_start_date || undefined}
                onChange={(e) => set("planned_end_date", e.target.value)}
                disabled={submitting}
              />
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
                className="w-4 h-4 rounded border-[#D9E0E8] text-[#12345B] accent-[#12345B] cursor-pointer"
                checked={form.has_traffic_restriction}
                onChange={(e) => set("has_traffic_restriction", e.target.checked)}
                disabled={submitting}
              />
              <span className="text-sm text-[#344054]">
                Работы предполагают ограничение дорожного движения
              </span>
            </label>

            {form.has_traffic_restriction && (
              <FieldRow label="Описание ограничения">
                <textarea
                  className={`${TEXTAREA} h-24`}
                  placeholder="Укажите характер ограничений: полное перекрытие, сужение полос и т.д."
                  value={form.traffic_restriction_description}
                  onChange={(e) => set("traffic_restriction_description", e.target.value)}
                  disabled={submitting}
                />
              </FieldRow>
            )}
          </div>
        </div>

        {/* Section 5 — Documents */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={5} title="Договор и документы" />
          <input
            ref={contractRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (contractRef.current) contractRef.current.value = "";
              setDocFiles((prev) => [...prev, ...picked]);
            }}
          />

          {docFiles.length > 0 && (
            <div className="space-y-2 mb-3">
              {docFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-[#D9E0E8] bg-[#F7F9FC]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#2F80C9] flex-shrink-0" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-[#1D2939] flex-1 min-w-0 truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setDocFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-[#98A2B3] hover:text-[#D92D20] transition-colors flex-shrink-0"
                    aria-label="Удалить файл"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => contractRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-6 rounded-[8px] border border-dashed border-[#D9E0E8] text-[#98A2B3] hover:border-[#2F80C9] hover:text-[#2F80C9] transition-colors"
          >
            <UploadIcon />
            <span className="text-sm">
              {docFiles.length > 0 ? `Добавить ещё документы (${docFiles.length} выбрано)` : "Загрузить документы"}
            </span>
            <span className="text-xs">PDF, DOC, DOCX, XLS, XLSX</span>
          </button>
        </div>

        {/* Section 6 — Before photos */}
        <div className="bg-white border border-[#D9E0E8] rounded-[10px] p-6">
          <SectionLabel num={6} title="Фотофиксация (до начала работ)" />
          <input
            ref={photosRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setPhotoFiles((prev) => [...prev, ...files]);
            }}
          />

          {photoFiles.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {photoFiles.map((f, i) => {
                const url = URL.createObjectURL(f);
                return (
                  <div key={i} className="relative group aspect-square rounded-[6px] overflow-hidden border border-[#D9E0E8] bg-[#F7F9FC]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={f.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Удалить фото"
                    >
                      <XIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => photosRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-6 rounded-[8px] border border-dashed border-[#D9E0E8] text-[#98A2B3] hover:border-[#2F80C9] hover:text-[#2F80C9] transition-colors"
          >
            <UploadIcon />
            <span className="text-sm">
              {photoFiles.length > 0 ? `Добавить ещё фото (${photoFiles.length} загружено)` : "Загрузить фото до начала работ"}
            </span>
            <span className="text-xs">JPG, PNG, WEBP</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-[8px] border border-[#D92D20]/30 bg-[#FFF2F2] px-5 py-4 text-sm text-[#D92D20]">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pb-4">
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
              "Подать заявку"
            )}
          </button>
          <Link
            href="/dashboard/repairs"
            className="inline-flex items-center h-10 px-5 rounded-[6px] border border-[#D9E0E8] text-sm font-medium text-[#667085] hover:bg-[#F7F9FC] transition-colors"
          >
            Отмена
          </Link>
        </div>

      </form>
    </div>
  );
}
