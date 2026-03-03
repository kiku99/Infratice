"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function MarkAsSolvedButton({ problemId }: { problemId: string }) {
  const { user, solvedIds, markSolved, unmarkSolved, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  const solved = solvedIds.has(problemId);

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
        </svg>
        로그인하면 진도를 저장할 수 있어요
      </button>
    );
  }

  async function handleClick() {
    setLoading(true);
    try {
      if (solved) {
        await unmarkSolved(problemId);
      } else {
        await markSolved(problemId);
      }
    } catch {
      // 에러는 console.error로 이미 출력됨
    } finally {
      setLoading(false);
      setHovering(false);
    }
  }

  if (solved) {
    const showUnmark = hovering && !loading;
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
          showUnmark
            ? "bg-red-500/10 text-red-500 dark:text-red-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {loading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 10h-2a8 8 0 01-8-8z" />
          </svg>
        ) : showUnmark ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
        )}
        {showUnmark ? "완료 취소하기" : "완료됨"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 10h-2a8 8 0 01-8-8z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      )}
      완료로 표시하기
    </button>
  );
}
