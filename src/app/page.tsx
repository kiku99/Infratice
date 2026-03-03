import HeroSection from "@/components/home/HeroSection";
import ProblemCard from "@/components/home/ProblemCard";
import { getAllProblems } from "@/lib/content";
import { CATEGORY_META, type Category } from "@/types/problem";

export default async function HomePage() {
  const problems = await getAllProblems();

  const categories = [...new Set(problems.map((p) => p.category))];

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6">
      <HeroSection />

      <section id="problems" className="pb-20">
        <h2 className="mb-8 text-xl font-bold text-slate-900 dark:text-white">
          문제 목록
        </h2>

        {categories.map((cat) => {
          const meta = CATEGORY_META[cat as Category];
          const catProblems = problems
            .filter((p) => p.category === cat)
            .sort((a, b) => a.difficulty - b.difficulty);
          return (
            <div key={cat} className="mb-10">
              <h3
                className={`mb-4 text-sm font-semibold uppercase tracking-wider ${meta.color}`}
              >
                {meta.label}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catProblems.map((p) => (
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
    </main>
  );
}
