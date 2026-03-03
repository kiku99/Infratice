"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadNote, saveNote } from "@/lib/local-storage";

interface Props {
  problemId: string;
  onNoteRef?: (getter: () => string) => void;
}

export default function MarkdownEditor({ problemId, onNoteRef }: Props) {
  const [value, setValue] = useState("");
  const valueRef = useRef(value);

  useEffect(() => {
    const saved = loadNote(problemId);
    setValue(saved);
    valueRef.current = saved;
  }, [problemId]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onNoteRef?.(() => valueRef.current);
  }, [onNoteRef]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setValue(v);
      saveNote(problemId, v);
    },
    [problemId],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-500">
          해결 노트
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="장애 원인에 대한 가설과, 이를 해결하기 위한 시나리오를 작성해 보세요."
        spellCheck={false}
        className="flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-600"
      />
    </div>
  );
}
