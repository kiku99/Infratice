"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLatestNotice } from "@/lib/notice";
import { formatNoticeDate } from "@/lib/format";
import { createSnapshot } from "@/lib/snapshot";
import type { NoticeItem } from "@/types/notice";

type NoticeStatus = "idle" | "ready" | "hidden";

const latestNotice = createSnapshot<NoticeItem | null>(getLatestNotice);

export default function LatestNoticeBanner() {
  const cached = latestNotice.getSnapshot();
  const [notice, setNotice] = useState<NoticeItem | null>(cached ?? null);
  const [status, setStatus] = useState<NoticeStatus>(() => {
    if (!latestNotice.hasSnapshot()) return "idle";
    return cached ? "ready" : "hidden";
  });

  useEffect(() => {
    if (latestNotice.hasSnapshot()) {
      const snap = latestNotice.getSnapshot() ?? null;
      setNotice(snap);
      setStatus(snap ? "ready" : "hidden");
      return;
    }

    let isMounted = true;

    latestNotice
      .loadOnce()
      .then((result) => {
        if (!isMounted) return;
        if (!result) {
          setStatus("hidden");
          return;
        }
        setNotice(result);
        setStatus("ready");
      })
      .catch(() => {
        if (isMounted) setStatus("hidden");
      });

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
