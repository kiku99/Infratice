import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllProblems } from "@/lib/content";
import ProblemListClient from "@/components/problems/ProblemListClient";

export const metadata: Metadata = {
  title: "문제 목록 | Infratice",
  description: "Linux, Kubernetes, Network, CI/CD 등 카테고리별 인프라 트러블슈팅 문제를 풀어보세요.",
};

export default async function ProblemsPage() {
  const problems = await getAllProblems();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">문제 목록</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          키워드로 검색하거나 카테고리를 선택해 문제를 찾아보세요.
        </p>
      </div>

      <Suspense>
        <ProblemListClient problems={problems} />
      </Suspense>
    </div>
  );
}
