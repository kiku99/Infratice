import { CATEGORY_META, type Problem } from "@/types/problem";
import TerminalBlock from "./TerminalBlock";
import HintAccordion from "./HintAccordion";

export default function ScenarioPanel({ problem }: { problem: Problem }) {
  const meta = CATEGORY_META[problem.category];
  const number = problem.slug.split("-")[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 sm:p-6">
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
