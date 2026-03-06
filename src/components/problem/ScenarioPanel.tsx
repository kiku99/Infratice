"use client";

import { useEffect, useRef } from "react";
import { CATEGORY_META, type Problem } from "@/types/problem";
import TerminalBlock from "./TerminalBlock";
import HintAccordion from "./HintAccordion";

export default function ScenarioPanel({ problem }: { problem: Problem }) {
  const meta = CATEGORY_META[problem.category];
  const number = problem.slug.split("-")[0];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    containerRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [problem.id]);

  return (
    <div ref={containerRef} className="flex h-full flex-col overflow-y-auto p-5 sm:p-6">
      {/* header */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.color} ${meta.bgColor}`}
          >
            {meta.label}
          </span>
          <span className="font-mono text-xs text-slate-500">#{number}</span>
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          {problem.title}
        </h1>
        {problem.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {problem.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-2 py-1 text-[0.7rem] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* scenario */}
      <div className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          상황
        </h2>
        <div
          className="prose-problem text-sm leading-relaxed text-slate-700 dark:text-slate-300"
          dangerouslySetInnerHTML={{ __html: problem.scenarioHtml }}
        />
      </div>

      {/* data */}
      {problem.dataBlocks.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            제공 데이터
          </h2>
          <TerminalBlock blocks={problem.dataBlocks} />
        </div>
      )}

      {/* hints */}
      <div className="mt-auto pt-4">
        <HintAccordion hints={problem.hints} />
      </div>
    </div>
  );
}
