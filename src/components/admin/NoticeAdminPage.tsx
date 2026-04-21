"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createNotice, deleteNotice, getAdminNotices, updateNotice } from "@/lib/notice";
import { formatNoticeDatetime } from "@/lib/format";
import type { NoticeItem, NoticeMutationInput } from "@/types/notice";
import { useAuth } from "@/contexts/AuthContext";
import NoticeEditor from "@/components/admin/NoticeEditor";

type AdminListStatus = "loading" | "ready" | "error";

function isExpiredNotice(notice: NoticeItem): boolean {
  if (!notice.expiresAt) return false;
  return new Date(notice.expiresAt).getTime() <= Date.now();
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3">
        <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/80" />
        <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/80" />
      </div>
    </div>
  );
}

export default function NoticeAdminPage() {
  const { user, loading, authReady, isAdmin, signInWithGoogle } = useAuth();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [status, setStatus] = useState<AdminListStatus>("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const selectedNotice = useMemo(
    () => notices.find((notice) => notice.id === selectedNoticeId) ?? null,
    [notices, selectedNoticeId],
  );

  const loadAdminNotices = useCallback(async () => {
    setStatus("loading");
    try {
      const items = await getAdminNotices();
      setNotices(items);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    void loadAdminNotices();
  }, [authReady, user, isAdmin, loadAdminNotices]);

  async function handleSubmit(input: NoticeMutationInput) {
    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      if (selectedNotice) {
        const updatedNotice = await updateNotice(selectedNotice.id, input);
        setFeedbackMessage("공지를 수정했습니다.");
        setSelectedNoticeId(updatedNotice.id);
      } else {
        const createdNotice = await createNotice(input);
        setFeedbackMessage("새 공지를 저장했습니다.");
        setSelectedNoticeId(createdNotice.id);
      }

      await loadAdminNotices();
    } catch {
      setFeedbackMessage("공지 저장에 실패했습니다. 권한 정책과 테이블 설정을 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedNotice) return;

    setIsDeleting(true);
    setFeedbackMessage(null);

    try {
      await deleteNotice(selectedNotice.id);
      setSelectedNoticeId(null);
      setFeedbackMessage("공지를 삭제했습니다.");
      await loadAdminNotices();
    } catch {
      setFeedbackMessage("공지 삭제에 실패했습니다. 권한 정책과 테이블 설정을 확인해 주세요.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading || !authReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <LoadingCard />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">공지 관리자</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            공지 작성과 수정은 관리자 로그인 후 사용할 수 있습니다.
          </p>
          <button
            onClick={signInWithGoogle}
            className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Google로 로그인
          </button>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 dark:border-amber-900/60 dark:bg-amber-950/20">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">접근 권한이 없습니다</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            현재 계정은 공지 관리자 권한이 없습니다. `admin_users` 테이블에 사용자 ID가 등록되어 있어야
            합니다.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          공지 관리
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          공지를 작성하고 게시 상태를 조정할 수 있습니다. 저장 권한은 Supabase RLS로 제한됩니다.
        </p>
      </div>

      {feedbackMessage && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {feedbackMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <NoticeEditor
          notice={selectedNotice}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onResetSelection={() => setSelectedNoticeId(null)}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">등록된 공지</h2>
            <button
              type="button"
              onClick={() => setSelectedNoticeId(null)}
              className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              새 공지
            </button>
          </div>

          {status === "loading" && <LoadingCard />}

          {status === "error" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300">
              공지 목록을 불러오지 못했습니다.
            </div>
          )}

          {status === "ready" && notices.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              아직 등록된 공지가 없습니다.
            </div>
          )}

          {status === "ready" && notices.length > 0 && (
            <div className="space-y-3">
              {notices.map((notice) => {
                const isSelected = notice.id === selectedNoticeId;
                const isExpired = isExpiredNotice(notice);

                return (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => setSelectedNoticeId(notice.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {notice.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                          notice.isPublished
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {notice.isPublished ? "게시중" : "비공개"}
                      </span>
                      {isExpired && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          만료됨
                        </span>
                      )}
                    </div>
                    {notice.summary && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {notice.summary}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      게시일 {formatNoticeDatetime(notice.publishedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
