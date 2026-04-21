"use client";

import { useState } from "react";
import type { DataBlock } from "@/types/problem";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
      <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const COPIED_FEEDBACK_MS = 2000;

export default function TerminalBlock({ blocks }: { blocks: DataBlock[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  if (blocks.length === 0) return null;

  const active = blocks[activeTab];

  async function handleCopy() {
    await navigator.clipboard.writeText(active.content);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 dark:border-slate-700 dark:bg-[#0d1117]">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2 dark:bg-[#161b22]">
        <div className="flex shrink-0 items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>

        {/* tabs */}
        <div className="ml-1 flex min-w-0 gap-1 overflow-x-auto">
          {blocks.map((b, i) => (
            <button
              key={b.label}
              onClick={() => {
                setActiveTab(i);
                setCopied(false);
              }}
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                i === activeTab
                  ? "bg-slate-700 text-slate-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* copy */}
        <button
          onClick={handleCopy}
          className="ml-auto shrink-0 rounded p-1 text-slate-500 transition-colors hover:text-slate-300"
          aria-label="코드 복사"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-emerald-400" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* code area */}
      <div className="terminal-scrollbar max-h-[calc(100vh-22rem)] overflow-auto p-4">
        <div
          className="font-mono text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: active.highlightedHtml }}
        />
      </div>
    </div>
  );
}
