"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORY_META, type Category } from "@/types/problem";

const BAR_COLORS: Record<Category, string> = {
  linux: "bg-amber-400",
  kubernetes: "bg-blue-400",
  network: "bg-purple-400",
  cicd: "bg-green-400",
  monitoring: "bg-pink-400",
};

interface Props {
  categoryCounts: Partial<Record<Category, number>>;
}

export default function CategoryProgress({ categoryCounts }: Props) {
  const { user, solvedIds, signInWithGoogle, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 py-16 dark:border-slate-700">
        <p className="text-sm text-slate-500">
          로그인하면 풀이 현황을 확인할 수 있어요
        </p>
        <button
          onClick={signInWithGoogle}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Google로 로그인
        </button>
      </div>
    );
  }

  const categories = (Object.keys(categoryCounts) as Category[]).filter(
    (cat) => (categoryCounts[cat] ?? 0) > 0,
  );
  const totalProblems = Object.values(categoryCounts).reduce(
    (a, b) => a + (b ?? 0),
    0,
  );
  const totalSolved = solvedIds.size;

  const solvedByCategory: Partial<Record<Category, number>> = {};
  for (const id of solvedIds) {
    const dashIdx = id.lastIndexOf("-");
    if (dashIdx === -1) continue;
    const cat = id.substring(0, dashIdx) as Category;
    if (!(cat in categoryCounts)) continue;
    solvedByCategory[cat] = (solvedByCategory[cat] ?? 0) + 1;
  }

  return (
    <div className="space-y-8">
      {/* total summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">전체 진행률</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {totalSolved}
              <span className="text-lg font-normal text-slate-400">
                {" "}
                / {totalProblems}
              </span>
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalProblems > 0
              ? Math.round((totalSolved / totalProblems) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{
              width: `${totalProblems > 0 ? (totalSolved / totalProblems) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* per-category */}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const total = categoryCounts[cat] ?? 0;
          const solved = solvedByCategory[cat] ?? 0;
          const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

          return (
            <Link
              key={cat}
              href={`/problems?category=${cat}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.color} ${meta.bgColor}`}
                >
                  {meta.label}
                </span>
                <span className="text-xs text-slate-400">
                  {solved} / {total}
                </span>
              </div>

              <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[cat]} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-right text-xs font-medium text-slate-500">
                {pct}%
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
