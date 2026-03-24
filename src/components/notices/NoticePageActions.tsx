"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function NoticePageActions() {
  const { loading, isAdmin } = useAuth();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Link
      href="/admin/notices"
      className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
    >
      공지 작성
    </Link>
  );
}
