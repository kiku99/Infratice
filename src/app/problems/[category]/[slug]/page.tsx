import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProblems, getProblem } from "@/lib/content";
import SplitView from "@/components/problem/SplitView";
import ScenarioPanel from "@/components/problem/ScenarioPanel";
import SolutionPanel from "@/components/problem/SolutionPanel";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  const problems = await getAllProblems();
  return problems.map((p) => ({ category: p.category, slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const problem = await getProblem(category, slug);
  return {
    title: `${problem.title} | Infratice`,
    description: problem.scenarioText.slice(0, 155),
    openGraph: {
      title: problem.title,
      description: problem.scenarioText.slice(0, 155),
      type: "article",
    },
  };
}

export default async function ProblemPage({ params }: PageProps) {
  const { category, slug } = await params;

  let problem;
  try {
    problem = await getProblem(category, slug);
  } catch {
    notFound();
  }

  return (
    <SplitView
      left={<ScenarioPanel key={`scenario-${problem.id}`} problem={problem} />}
      right={<SolutionPanel key={`solution-${problem.id}`} problem={problem} />}
    />
  );
}
