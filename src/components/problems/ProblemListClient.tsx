"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ProblemCard from "@/components/home/ProblemCard";
import { CATEGORY_META, type Category, type ProblemMeta } from "@/types/problem";
import { useAuth } from "@/contexts/AuthContext";

type SortKey = "id" | "difficulty";
type SortDir = "asc" | "desc";

const ALL = "all" as const;
type FilterCategory = Category | typeof ALL;

const VALID_CATEGORIES = new Set<string>(["all", "linux", "kubernetes", "network", "cicd", "monitoring"]);
const VALID_SORT_KEYS = new Set<string>(["id", "difficulty"]);

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 18;

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isNaN(page) || page < 1 ? 1 : page;
}

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function matchesQuery(problem: ProblemMeta, query: string): boolean {
  const q = query.toLowerCase();
  if (problem.title.toLowerCase().includes(q)) return true;
  return problem.tags.some((tag) => tag.toLowerCase().includes(q));
}

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawCat = searchParams.get("category") ?? "all";
  const rawSort = searchParams.get("sort") ?? "id";
  const rawDir = searchParams.get("dir") ?? "asc";
  const rawQuery = searchParams.get("q") ?? "";
  const rawPage = searchParams.get("page");

  const category: FilterCategory = VALID_CATEGORIES.has(rawCat) ? (rawCat as FilterCategory) : ALL;
  const sortKey: SortKey = VALID_SORT_KEYS.has(rawSort) ? (rawSort as SortKey) : "id";
  const sortDir: SortDir = rawDir === "desc" ? "desc" : "asc";
  const requestedPage = parsePage(rawPage);

  const [searchInput, setSearchInput] = useState(rawQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (
          (k === "category" && v === "all") ||
          (k === "sort" && v === "id") ||
          (k === "dir" && v === "asc") ||
          (k === "q" && v === "") ||
          (k === "page" && v === "1")
        ) {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    setSearchInput(rawQuery);
  }, [rawQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value.trim(), page: "1" });
    }, SEARCH_DEBOUNCE_MS);
  }

  function clearSearch() {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateParams({ q: "", page: "1" });
  }

  function setCategory(value: FilterCategory) {
    updateParams({ category: value, page: "1" });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      updateParams({ dir: sortDir === "asc" ? "desc" : "asc", page: "1" });
    } else {
      updateParams({ sort: key, dir: "asc", page: "1" });
    }
  }

  function setPage(page: number) {
    updateParams({ page: String(page) });
  }

  const filtered = useMemo(() => {
    let base = category === ALL ? problems : problems.filter((p) => p.category === category);

    if (rawQuery) {
      base = base.filter((p) => matchesQuery(p, rawQuery));
    }

    return [...base].sort((a, b) => {
      let diff = 0;
      if (sortKey === "id") {
        diff = a.id.localeCompare(b.id);
      } else {
        diff = a.difficulty - b.difficulty;
      }
      return sortDir === "asc" ? diff : -diff;
    });
  }, [problems, category, sortKey, sortDir, rawQuery]);

  const countOf = (cat: FilterCategory) => {
    const catProblems = cat === ALL ? problems : problems.filter((p) => p.category === cat);
    return rawQuery ? catProblems.filter((p) => matchesQuery(p, rawQuery)).length : catProblems.length;
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedProblems = filtered.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const pageStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const pageEnd = Math.min(filtered.length, pageStartIndex + PAGE_SIZE);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  useEffect(() => {
    if (rawPage && String(currentPage) !== rawPage) {
      updateParams({ page: String(currentPage) });
    }
  }, [rawPage, currentPage, updateParams]);

  return (
    <div>
      {/* ── search ──────────────────────────────────────────────── */}
      <div className="relative mb-5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="제목 또는 태그로 검색 (예: disk, kubectl, DNS)"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── toolbar ─────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ value, label }) => {
            const count = countOf(value);
            if (count === 0 && value !== ALL && !rawQuery) return null;
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
        {rawQuery ? (
          <>
            <span className="font-medium text-slate-700 dark:text-slate-300">&ldquo;{rawQuery}&rdquo;</span>
            {" "}검색 결과 {filtered.length}개
          </>
        ) : (
          <>{filtered.length}개 문제</>
        )}
        {filtered.length > 0 && (
          <>
            {" · "}현재 {pageStart}-{pageEnd}
          </>
        )}
      </p>

      {/* ── grid ────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProblems.map((p) => (
              <ProblemCard key={p.id} problem={p} solved={solvedIds.has(p.id)} highlightQuery={rawQuery} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="문제 목록 페이지네이션"
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
            >
              <p className="text-xs text-slate-500 dark:text-slate-600">
                {currentPage} / {totalPages} 페이지
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  이전
                </button>

                {visiblePages[0] > 1 && (
                  <>
                    <button
                      onClick={() => setPage(1)}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      1
                    </button>
                    {visiblePages[0] > 2 && (
                      <span className="px-1 text-sm text-slate-400 dark:text-slate-600">...</span>
                    )}
                  </>
                )}

                {visiblePages.map((page) => {
                  const active = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => setPage(page)}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <>
                    {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                      <span className="px-1 text-sm text-slate-400 dark:text-slate-600">...</span>
                    )}
                    <button
                      onClick={() => setPage(totalPages)}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  다음
                </button>
              </div>
            </nav>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          {rawQuery ? (
            <>
              <p className="text-slate-500 dark:text-slate-500">
                &ldquo;{rawQuery}&rdquo;에 대한 검색 결과가 없습니다.
              </p>
              <button
                onClick={clearSearch}
                className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                검색 초기화
              </button>
            </>
          ) : (
            <p className="text-slate-500 dark:text-slate-600">
              해당 카테고리에 등록된 문제가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
