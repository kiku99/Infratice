import { Suspense } from "react";
import type { Metadata } from "next";
import NoticeList from "@/components/notices/NoticeList";
import NoticePageActions from "@/components/notices/NoticePageActions";

export const metadata: Metadata = {
  title: "공지 | Infratice",
  description: "Infratice 운영 공지와 업데이트 내역을 확인할 수 있습니다.",
};

export default function NoticesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-6">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              공지
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              서비스 운영, 점검 일정, 기능 업데이트 같은 최근 공지를 시간순으로 확인할 수 있습니다.
            </p>
          </div>

          <NoticePageActions />
        </div>
      </section>

      <section className="mt-8">
        <Suspense fallback={null}>
          <NoticeList />
        </Suspense>
      </section>
    </div>
  );
}
