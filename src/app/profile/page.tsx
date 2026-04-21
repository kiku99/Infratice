import type { Metadata } from "next";
import { getAllProblems } from "@/lib/content";
import CategoryProgress from "@/components/profile/CategoryProgress";
import type { Category } from "@/types/problem";

export const metadata: Metadata = {
  title: "내 풀이 현황 — Infratice",
  description: "카테고리별 문제 풀이 진행률을 확인하세요.",
};

export default async function ProfilePage() {
  const problems = await getAllProblems();

  const categoryCounts: Partial<Record<Category, number>> = {};
  for (const p of problems) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
        내 풀이 현황
      </h1>
      <CategoryProgress categoryCounts={categoryCounts} />
    </section>
  );
}
