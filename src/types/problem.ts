export type Category =
  | "linux"
  | "kubernetes"
  | "network"
  | "cicd"
  | "monitoring";

export interface ProblemMeta {
  id: string;
  slug: string;
  title: string;
  category: Category;
  difficulty: 1 | 2 | 3;
  tags: string[];
}

export interface DataBlock {
  label: string;
  language: string;
  content: string;
  highlightedHtml: string;
}

export interface Problem extends ProblemMeta {
  hints: string[];
  scenarioHtml: string;
  scenarioText: string;
  dataBlocks: DataBlock[];
  solutionHtml: string;
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bgColor: string }
> = {
  linux: {
    label: "Linux",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  kubernetes: {
    label: "K8s",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  network: {
    label: "Network",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  cicd: {
    label: "CI/CD",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  monitoring: {
    label: "Monitoring",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
  },
};
