import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";

export default function GNB() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Infratice
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/problems"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            문제 목록
          </Link>
          <a
            href="https://github.com/kiku99/Infratice/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            문제 기여하기
          </a>
          <ThemeToggle />
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
