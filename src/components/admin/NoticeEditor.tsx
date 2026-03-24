"use client";

import { useEffect, useMemo, useState } from "react";
import type { NoticeItem, NoticeMutationInput } from "@/types/notice";

interface NoticeEditorProps {
  notice: NoticeItem | null;
  isSaving: boolean;
  isDeleting: boolean;
  onSubmit: (input: NoticeMutationInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onResetSelection: () => void;
}

interface NoticeFormState {
  title: string;
  summary: string;
  isPublished: boolean;
  publishedAt: string;
  expiresAt: string;
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(value: string): string {
  return new Date(value).toISOString();
}

function createDefaultFormState(): NoticeFormState {
  return {
    title: "",
    summary: "",
    isPublished: false,
    publishedAt: toDateTimeLocal(new Date().toISOString()),
    expiresAt: "",
  };
}

function createFormState(notice: NoticeItem | null): NoticeFormState {
  if (!notice) {
    return createDefaultFormState();
  }

  return {
    title: notice.title,
    summary: notice.summary ?? "",
    isPublished: notice.isPublished,
    publishedAt: toDateTimeLocal(notice.publishedAt),
    expiresAt: toDateTimeLocal(notice.expiresAt),
  };
}

export default function NoticeEditor({
  notice,
  isSaving,
  isDeleting,
  onSubmit,
  onDelete,
  onResetSelection,
}: NoticeEditorProps) {
  const [form, setForm] = useState<NoticeFormState>(() => createFormState(notice));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditing = useMemo(() => Boolean(notice), [notice]);

  useEffect(() => {
    setForm(createFormState(notice));
    setErrorMessage(null);
  }, [notice]);

  function updateField<K extends keyof NoticeFormState>(key: K, value: NoticeFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("공지 제목을 입력해 주세요.");
      return;
    }

    if (!form.publishedAt) {
      setErrorMessage("게시일을 입력해 주세요.");
      return;
    }

    setErrorMessage(null);

    await onSubmit({
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      isPublished: form.isPublished,
      publishedAt: toIsoString(form.publishedAt),
      expiresAt: form.expiresAt ? toIsoString(form.expiresAt) : null,
    });
  }

  function handleReset() {
    setForm(createFormState(notice));
    setErrorMessage(null);
  }

  async function handleDelete() {
    if (!notice) return;

    const confirmed = window.confirm(`"${notice.title}" 공지를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    setErrorMessage(null);
    await onDelete();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
            Admin
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            {isEditing ? "공지 수정" : "새 공지 작성"}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-400 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:border-rose-800 dark:hover:text-rose-200"
            >
              {isDeleting ? "삭제 중..." : "공지 삭제"}
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={onResetSelection}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            >
              새 공지로 전환
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          >
            입력 초기화
          </button>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="notice-title">
            제목
          </label>
          <input
            id="notice-title"
            type="text"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="공지 제목을 입력하세요."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="notice-summary">
            요약
          </label>
          <textarea
            id="notice-summary"
            value={form.summary}
            onChange={(event) => updateField("summary", event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="목록과 홈 배너에 노출할 요약을 입력하세요."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="notice-published-at">
              게시일
            </label>
            <input
              id="notice-published-at"
              type="datetime-local"
              value={form.publishedAt}
              onChange={(event) => updateField("publishedAt", event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="notice-expires-at">
              만료일
            </label>
            <input
              id="notice-expires-at"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => updateField("expiresAt", event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(event) => updateField("isPublished", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          저장 후 바로 게시 상태로 노출
        </label>

        {errorMessage && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving || isDeleting}
          className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "저장 중..." : isEditing ? "공지 수정" : "공지 저장"}
        </button>
      </form>
    </section>
  );
}
