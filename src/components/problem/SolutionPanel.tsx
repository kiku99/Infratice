"use client";

import { useCallback, useRef } from "react";
import type { Problem } from "@/types/problem";
import MarkdownEditor from "./MarkdownEditor";
import CopyPromptButton from "./CopyPromptButton";
import SolutionToggle from "./SolutionToggle";
import MarkAsSolvedButton from "./MarkAsSolvedButton";

export default function SolutionPanel({ problem }: { problem: Problem }) {
  const noteGetterRef = useRef<(() => string) | null>(null);

  const handleNoteRef = useCallback((getter: () => string) => {
    noteGetterRef.current = getter;
  }, []);

  const getUserNote = useCallback(() => {
    return noteGetterRef.current?.() ?? "";
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden p-5 sm:p-6">
      {/* editor */}
      <div className="min-h-0 flex-1">
        <MarkdownEditor problemId={problem.id} onNoteRef={handleNoteRef} />
      </div>

      {/* actions */}
      <div className="mt-4 flex flex-col gap-3">
        <CopyPromptButton
          scenarioText={problem.scenarioText}
          dataBlocks={problem.dataBlocks}
          getUserNote={getUserNote}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <SolutionToggle solutionHtml={problem.solutionHtml} />
          </div>
        </div>
        <MarkAsSolvedButton problemId={problem.id} />
      </div>
    </div>
  );
}
