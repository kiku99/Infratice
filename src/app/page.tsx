import Link from "next/link";
import HeroSection from "@/components/home/HeroSection";
import LatestNoticeBanner from "@/components/home/LatestNoticeBanner";
import ProblemCard from "@/components/home/ProblemCard";
import { getAllProblems } from "@/lib/content";
import { CATEGORY_META, type Category } from "@/types/problem";

const PREVIEW_LIMIT = 6;

export default async function HomePage() {
  const problems = await getAllProblems();

  const categories = [...new Set(problems.map((p) => p.category))];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <LatestNoticeBanner />
      <HeroSection />

      <section id="problems" className="pb-20">
        <h2 className="mb-8 text-xl font-bold text-slate-900 dark:text-white">
          문제 목록
        </h2>

        {categories.map((cat) => {
          const meta = CATEGORY_META[cat as Category];
          const catProblems = problems
            .filter((p) => p.category === cat);
          const preview = catProblems.slice(0, PREVIEW_LIMIT);
          const hasMore = catProblems.length > PREVIEW_LIMIT;
          return (
            <div key={cat} className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${meta.color}`}>
                  {meta.label}
                </h3>
                {hasMore && (
                  <Link
                    href={`/problems?category=${cat}`}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    전체 보기 ({catProblems.length}) →
                  </Link>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {preview.map((p) => (
                  <ProblemCard key={p.id} problem={p} />
                ))}
              </div>
            </div>
          );
        })}

        {problems.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-500">
            아직 등록된 문제가 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}
