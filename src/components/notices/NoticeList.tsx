"use client";

import { useEffect, useState } from "react";
import { getPublishedNotices } from "@/lib/notice";
import { formatNoticeDate } from "@/lib/format";
import type { NoticeItem } from "@/types/notice";

type NoticeListStatus = "idle" | "ready" | "error";

let publishedNoticesSnapshot: NoticeItem[] | undefined;
let publishedNoticesRequest: Promise<NoticeItem[]> | null = null;

async function loadPublishedNoticesOnce(): Promise<NoticeItem[]> {
  if (publishedNoticesSnapshot !== undefined) {
    return publishedNoticesSnapshot;
  }

  if (!publishedNoticesRequest) {
    publishedNoticesRequest = getPublishedNotices()
      .then((items) => {
        publishedNoticesSnapshot = items;
        return items;
      })
      .catch((error) => {
        publishedNoticesRequest = null;
        throw error;
      });
  }

  return publishedNoticesRequest;
}

export default function NoticeList() {
  const [notices, setNotices] = useState<NoticeItem[]>(publishedNoticesSnapshot ?? []);
  const [status, setStatus] = useState<NoticeListStatus>(() =>
    publishedNoticesSnapshot !== undefined ? "ready" : "idle",
  );

  useEffect(() => {
    if (publishedNoticesSnapshot !== undefined) {
      setNotices(publishedNoticesSnapshot);
      setStatus("ready");
      return;
    }

    let isMounted = true;

    async function loadNotices() {
      try {
        const items = await loadPublishedNoticesOnce();
        if (!isMounted) return;

        setNotices(items);
        setStatus("ready");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    loadNotices();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-300">
        공지 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  if (status === "idle") {
    return null;
  }

  if (notices.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        현재 게시 중인 공지가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <article
          key={notice.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {notice.title}
              </h2>
              {notice.summary && (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {notice.summary}
                </p>
              )}
            </div>
            <time
              dateTime={notice.publishedAt}
              className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              {formatNoticeDate(notice.publishedAt)}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}
