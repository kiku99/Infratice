"use client";

import { useState } from "react";

export default function SolutionToggle({
  solutionHtml,
}: {
  solutionHtml: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        {open ? "모범 답안 닫기" : "출제자 모범 답안 보기"}
      </button>

      {open && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div
            className="prose-problem text-sm text-slate-700 dark:text-slate-300"
            dangerouslySetInnerHTML={{ __html: solutionHtml }}
          />
        </div>
      )}
    </div>
  );
}
