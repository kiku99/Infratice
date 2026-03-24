"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLatestNotice } from "@/lib/notice";
import type { NoticeItem } from "@/types/notice";

type NoticeStatus = "idle" | "ready" | "hidden";

let latestNoticeSnapshot: NoticeItem | null | undefined;
let latestNoticeRequest: Promise<NoticeItem | null> | null = null;

function formatNoticeDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function loadLatestNoticeOnce(): Promise<NoticeItem | null> {
  if (latestNoticeSnapshot !== undefined) {
    return latestNoticeSnapshot;
  }

  if (!latestNoticeRequest) {
    latestNoticeRequest = getLatestNotice()
      .then((notice) => {
        latestNoticeSnapshot = notice;
        return notice;
      })
      .catch((error) => {
        latestNoticeRequest = null;
        throw error;
      });
  }

  return latestNoticeRequest;
}

export default function LatestNoticeBanner() {
  const [notice, setNotice] = useState<NoticeItem | null>(latestNoticeSnapshot ?? null);
  const [status, setStatus] = useState<NoticeStatus>(() => {
    if (latestNoticeSnapshot === undefined) return "idle";
    return latestNoticeSnapshot ? "ready" : "hidden";
  });

  useEffect(() => {
    if (latestNoticeSnapshot !== undefined) {
      setNotice(latestNoticeSnapshot ?? null);
      setStatus(latestNoticeSnapshot ? "ready" : "hidden");
      return;
    }

    let isMounted = true;

    async function loadNotice() {
      try {
        const latestNotice = await loadLatestNoticeOnce();
        if (!isMounted) return;

        if (!latestNotice) {
          setStatus("hidden");
          return;
        }

        setNotice(latestNotice);
        setStatus("ready");
      } catch {
        if (isMounted) {
          setStatus("hidden");
        }
      }
    }

    loadNotice();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "hidden" || !notice) {
    return null;
  }

  return (
    <section aria-label="공지사항" className="py-3">
      <Link
        href="/notices"
        className="block rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 transition-colors hover:bg-amber-100/80 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                공지사항
              </span>
              <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {notice.title}
              </h2>
            </div>
            {notice.summary && (
              <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
                {notice.summary}
              </p>
            )}
          </div>

          <time
            dateTime={notice.publishedAt}
            className="shrink-0 text-[0.7rem] font-medium text-amber-700/80 dark:text-amber-300/80"
          >
            {formatNoticeDate(notice.publishedAt)}
          </time>
        </div>
      </Link>
    </section>
  );
}
