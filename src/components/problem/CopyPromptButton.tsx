"use client";

import { useState } from "react";
import { buildPrompt } from "@/lib/prompt-builder";
import type { DataBlock } from "@/types/problem";

interface Props {
  scenarioText: string;
  dataBlocks: DataBlock[];
  getUserNote: () => string;
}

export default function CopyPromptButton({
  scenarioText,
  dataBlocks,
  getUserNote,
}: Props) {
  const [toast, setToast] = useState(false);

  async function handleCopy() {
    const note = getUserNote();
    const prompt = buildPrompt(scenarioText, dataBlocks, note);
    await navigator.clipboard.writeText(prompt);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-[0.98]"
      >
        내 답변 AI에게 검토받기
      </button>

      {toast && (
        <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white shadow-xl dark:bg-slate-700">
          클립보드에 프롬프트가 복사되었습니다! ChatGPT나 Claude에 붙여넣으세요
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
}
