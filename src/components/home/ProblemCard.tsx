import Link from "next/link";
import { CATEGORY_META, type ProblemMeta } from "@/types/problem";

function SolvedBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-600 dark:text-emerald-400">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
      </svg>
      완료
    </span>
  );
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`난이도 ${level}`}>
      {[1, 2, 3].map((n) => (
        <svg
          key={n}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 ${
            n <= level
              ? "text-amber-400"
              : "text-slate-300 dark:text-slate-700"
          }`}
        >
          <path
            fillRule="evenodd"
            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
            clipRule="evenodd"
          />
        </svg>
      ))}
    </span>
  );
}

export default function ProblemCard({
  problem,
  solved = false,
  highlightQuery = "",
}: {
  problem: ProblemMeta;
  solved?: boolean;
  highlightQuery?: string;
}) {
  const meta = CATEGORY_META[problem.category];
  const number = problem.slug.split("-")[0];

  return (
    <Link
      href={`/problems/${problem.category}/${problem.slug}`}
      className={`group relative flex flex-col rounded-xl border p-5 transition-all hover:shadow-lg ${
        solved
          ? "border-emerald-300/60 bg-emerald-50/50 hover:border-emerald-400 hover:shadow-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:hover:border-emerald-500/40"
          : "border-slate-200 bg-white hover:border-emerald-500/40 hover:shadow-emerald-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/30"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${meta.color} ${meta.bgColor}`}
        >
          {meta.label}
        </span>
        <div className="flex items-center gap-2">
          {solved && <SolvedBadge />}
          <span className="font-mono text-xs text-slate-400 dark:text-slate-600">
            #{number}
          </span>
        </div>
      </div>

      <h3 className={`mb-3 flex-1 text-sm font-semibold leading-snug ${
        solved
          ? "text-slate-500 group-hover:text-emerald-600 dark:text-slate-400 dark:group-hover:text-emerald-400"
          : "text-slate-900 group-hover:text-emerald-600 dark:text-slate-200 dark:group-hover:text-emerald-400"
      }`}>
        {problem.title}
      </h3>

      <div className="flex items-center justify-between">
        <DifficultyStars level={problem.difficulty} />
        <div className="flex flex-wrap gap-1">
          {problem.tags.slice(0, 3).map((tag) => {
            const isMatch = highlightQuery && tag.toLowerCase().includes(highlightQuery.toLowerCase());
            return (
              <span
                key={tag}
                className={`rounded px-1.5 py-0.5 text-[0.65rem] ${
                  isMatch
                    ? "bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
