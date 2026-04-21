"use client";

import { useState } from "react";

export default function HintAccordion({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(false);

  if (hints.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
      >
        <span className="text-base">💡</span>
        <span>힌트 보기</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {hints.map((hint, i) => (
              <li key={i}>{hint}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
