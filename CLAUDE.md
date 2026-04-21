# CLAUDE.md

## 프로젝트 개요

Infratice — DevOps/인프라 장애 해결 학습 플랫폼. 실제 업무에서 마주치는 로그, 설정 파일, 명령어 출력을 분석하여 원인을 찾고 해결하는 문제 기반 학습(PBL) 사이트.

- **사이트:** https://infratice.co.kr
- **배포:** Cloudflare Pages (정적 빌드)
- **저장소:** https://github.com/kiku99/Infratice

## 명령어

```bash
pnpm dev          # 개발 서버 (localhost:3000)
pnpm build        # 정적 빌드 → out/
pnpm lint         # ESLint 실행
tsc --noEmit      # 타입 체크 (CI에서 빌드 전 실행)
```

## 기술 스택

- **프레임워크:** Next.js 16 (App Router, `output: "export"` 정적 빌드)
- **언어:** TypeScript (strict mode)
- **스타일링:** Tailwind CSS 4
- **인증/DB:** Supabase (Google OAuth, solved_problems/notices 테이블)
- **콘텐츠:** Markdown 파일 (`content/problems/`) + gray-matter + Shiki 구문 강조
- **패키지 매니저:** pnpm

## 프로젝트 구조

```
src/
  app/                    # Next.js App Router 페이지
  components/{feature}/   # 기능별 컴포넌트 (PascalCase 파일명)
  lib/                    # 유틸리티 (content.ts, supabase.ts, notice.ts 등)
  types/                  # TypeScript 타입 정의
  contexts/               # AuthContext (인증 상태 관리)
content/problems/         # 문제 Markdown 파일 (linux/, kubernetes/, network/, cicd/)
```

## 코드 컨벤션

- **임포트 별칭:** `@/*` → `src/*`
- **컴포넌트:** 기본 서버 컴포넌트, 인터랙션 필요 시 `"use client"` 선언
- **스타일:** Tailwind 유틸리티 클래스만 사용 (CSS 모듈 없음)
- **다크 모드:** `<html>` 태그의 `class="dark"` + Tailwind dark variant
- **정적 경로:** `generateStaticParams()` + `generateMetadata()`로 사전 렌더링

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/ko/) 형식 사용:

- `feat(content): ...` — 문제 콘텐츠 추가
- `feat: ...` — 새 기능
- `fix: ...` — 버그 수정
- `refactor: ...` — 리팩터링
- `docs: ...` / `chore: ...` — CHANGELOG에 미포함

버전: MAJOR(아키텍처 변경) / MINOR(기능/문제 추가) / PATCH(버그 수정)

## 콘텐츠 작성 규칙

문제 파일 경로: `content/problems/{category}/{NNN}-{설명}.md`

- 템플릿: `content/problems/TEMPLATE.md` 참고
- 구조: frontmatter → `## 상황` → `## 데이터` → `## 해설` (원인 분석 / 해결 방법 / 실무 팁)
- 카테고리: `linux` | `kubernetes` | `network` | `cicd` | `monitoring`
- 난이도: 1(단일 오류) / 2(2~3개 데이터 교차 분석) / 3(복합 원인/심화 개념)
- 코드 블록 언어: bash, shell, nginx, yaml, json, dockerfile, ini, toml, log, plaintext

## Supabase DB 스키마

```
notices
├── id             uuid        PK, default gen_random_uuid()
├── title          text        NOT NULL
├── summary        text        nullable
├── is_published   boolean     NOT NULL, default false
├── published_at   timestamptz NOT NULL
├── expires_at     timestamptz nullable
├── created_at     timestamptz NOT NULL, default now()
└── updated_at     timestamptz NOT NULL, default now()

solved_problems
├── user_id        uuid        PK (복합), FK → auth.users
└── problem_id     text        PK (복합), 예: "linux-003"

admin_users
└── user_id        uuid        PK, FK → auth.users
```

- **인증:** Google OAuth (Supabase Auth)
- **RLS:** 활성화 — `solved_problems`는 본인만 읽기/쓰기, `notices` 쓰기는 admin만, 읽기는 공개
- 타입 매핑: `NoticeRow` (snake_case, DB) ↔ `NoticeItem` (camelCase, 앱) — `src/lib/notice.ts`의 `mapNoticeRow()`로 변환

## CI/CD

- **release.yml:** `v*.*.*` 태그 → CHANGELOG 생성 → 타입 체크 → 빌드 → Cloudflare Pages 배포
- **preview.yml:** PR 생성/업데이트 → 프리뷰 빌드 → PR에 배포 URL 코멘트
- CHANGELOG는 git-cliff로 자동 생성 (`cliff.toml`)
