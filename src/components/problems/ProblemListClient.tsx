"use client";

import { useState, useMemo } from "react";
import ProblemCard from "@/components/home/ProblemCard";
import { CATEGORY_META, type Category, type ProblemMeta } from "@/types/problem";
import { useAuth } from "@/contexts/AuthContext";

type SortKey = "id" | "difficulty";
type SortDir = "asc" | "desc";

const ALL = "all" as const;
type FilterCategory = Category | typeof ALL;

const CATEGORIES: { value: FilterCategory; label: string }[] = [
  { value: ALL, label: "전체" },
  { value: "linux", label: CATEGORY_META.linux.label },
  { value: "kubernetes", label: CATEGORY_META.kubernetes.label },
  { value: "network", label: CATEGORY_META.network.label },
  { value: "cicd", label: CATEGORY_META.cicd.label },
  { value: "monitoring", label: CATEGORY_META.monitoring.label },
];

function SortIcon({ dir }: { dir: SortDir }) {
  return dir === "asc" ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
    </svg>
  );
}

export default function ProblemListClient({ problems }: { problems: ProblemMeta[] }) {
  const { solvedIds } = useAuth();
  const [category, setCategory] = useState<FilterCategory>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const base = category === ALL ? problems : problems.filter((p) => p.category === category);

    return [...base].sort((a, b) => {
      let diff = 0;
      if (sortKey === "id") {
        diff = a.id.localeCompare(b.id);
      } else {
        diff = a.difficulty - b.difficulty;
      }
      return sortDir === "asc" ? diff : -diff;
    });
  }, [problems, category, sortKey, sortDir]);

  // count per category (excluding 'all')
  const countOf = (cat: FilterCategory) =>
    cat === ALL ? problems.length : problems.filter((p) => p.category === cat).length;

  return (
    <div>
      {/* ── toolbar ─────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ value, label }) => {
            const count = countOf(value);
            if (count === 0 && value !== ALL) return null;
            const active = category === value;
            const color = value !== ALL ? CATEGORY_META[value as Category].color : "";
            return (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {active && value !== ALL && (
                  <span className={`h-1.5 w-1.5 rounded-full ${color.replace("text-", "bg-")}`} />
                )}
                {label}
                <span
                  className={`rounded px-1 py-0.5 font-mono text-[0.6rem] ${
                    active
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* sort controls */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-slate-500 dark:text-slate-500">정렬</span>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {(["id", "difficulty"] as SortKey[]).map((key) => {
              const active = sortKey === key;
              return (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800"
                  }`}
                >
                  {key === "id" ? "번호" : "난이도"}
                  {active && <SortIcon dir={sortDir} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── result info ─────────────────────────────────────────── */}
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-600">
        {filtered.length}개 문제
      </p>

      {/* ── grid ────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProblemCard key={p.id} problem={p} solved={solvedIds.has(p.id)} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 dark:text-slate-600">
          해당 카테고리에 등록된 문제가 없습니다.
        </div>
      )}
    </div>
  );
}
