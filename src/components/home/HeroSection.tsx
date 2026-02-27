import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* decorative grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
          DevOps Troubleshooting Practice
        </p>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          AI와 함께 푸는
          <br />
          인프라 트러블슈팅 챌린지
        </h1>

        <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
          무거운 서버 구성 없이, 실무 수준의 인프라 장애 시나리오를 마주하고
          <br className="hidden sm:block" />
          해결 능력을 키워보세요.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/problems"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
          >
            <span>문제 풀러가기</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
