import type { Metadata } from "next";
import { getAllProblems } from "@/lib/content";
import CategoryProgress from "@/components/profile/CategoryProgress";

export const metadata: Metadata = {
  title: "내 풀이 현황 — Infratice",
};

export default async function ProfilePage() {
  const problems = await getAllProblems();

  const categoryCounts: Record<string, number> = {};
  for (const p of problems) {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
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
