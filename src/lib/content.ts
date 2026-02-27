import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { createHighlighter, type Highlighter } from "shiki";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import type { Category, DataBlock, Problem, ProblemMeta } from "@/types/problem";

const CONTENT_DIR = path.join(process.cwd(), "content/problems");

let highlighter: Highlighter | null = null;

async function getShikiHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark"],
      langs: [
        "bash",
        "shell",
        "nginx",
        "yaml",
        "json",
        "dockerfile",
        "ini",
        "toml",
        "log",
        "python",
        "javascript",
        "typescript",
        "plaintext",
      ],
    });
  }
  return highlighter;
}

async function highlightCode(
  code: string,
  lang: string,
): Promise<string> {
  const hl = await getShikiHighlighter();
  const supported = hl.getLoadedLanguages();
  const resolvedLang = supported.includes(lang) ? lang : "plaintext";
  return hl.codeToHtml(code, { lang: resolvedLang, theme: "github-dark" });
}

async function markdownToHtml(md: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(md);
  return result.toString();
}

function parseSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const parts = body.split(/^## /m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIdx = part.indexOf("\n");
    const heading = part.slice(0, newlineIdx).trim();
    const content = part.slice(newlineIdx + 1).trim();
    sections[heading] = content;
  }
  return sections;
}

function extractDataBlocks(dataSection: string): Omit<DataBlock, "highlightedHtml">[] {
  const blocks: Omit<DataBlock, "highlightedHtml">[] = [];
  const parts = dataSection.split(/^### /m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIdx = part.indexOf("\n");
    const label = part.slice(0, newlineIdx).trim();
    const rest = part.slice(newlineIdx + 1).trim();
    const match = rest.match(/```(\w*)\n([\s\S]*?)```/);
    if (match) {
      blocks.push({
        label,
        language: match[1] || "plaintext",
        content: match[2].trimEnd(),
      });
    }
  }
  return blocks;
}

export async function getAllProblems(): Promise<ProblemMeta[]> {
  const problems: ProblemMeta[] = [];

  if (!fs.existsSync(CONTENT_DIR)) return problems;

  const categories = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const category of categories) {
    const dir = path.join(CONTENT_DIR, category);
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      const slug = file.replace(/\.md$/, "");

      problems.push({
        id: data.id,
        slug,
        title: data.title,
        category: data.category as Category,
        difficulty: data.difficulty,
        tags: data.tags ?? [],
      });
    }
  }

  return problems;
}

export async function getProblem(
  category: string,
  slug: string,
): Promise<Problem> {
  const filePath = path.join(CONTENT_DIR, category, `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const sections = parseSections(content);

  const scenarioText = sections["상황"] ?? "";
  const scenarioHtml = await markdownToHtml(scenarioText);

  const rawBlocks = extractDataBlocks(sections["데이터"] ?? "");
  const dataBlocks: DataBlock[] = await Promise.all(
    rawBlocks.map(async (b) => ({
      ...b,
      highlightedHtml: await highlightCode(b.content, b.language),
    })),
  );

  const solutionHtml = await markdownToHtml(sections["해설"] ?? "");

  return {
    id: data.id,
    slug,
    title: data.title,
    category: data.category as Category,
    difficulty: data.difficulty,
    tags: data.tags ?? [],
    hints: data.hints ?? [],
    scenarioHtml,
    scenarioText,
    dataBlocks,
    solutionHtml,
  };
}
