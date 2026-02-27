---
id: "cicd-001"
title: "GitHub Actions 빌드 실패 로그 분석"
category: "cicd"
difficulty: 1
tags: ["github-actions", "npm", "dependency", "ci"]
hints:
  - "에러 메시지에서 어떤 패키지가 문제를 일으키는지 확인하세요."
  - "package.json의 의존성 버전 범위(^, ~)가 어떤 영향을 주는지 생각해 보세요."
  - "lockfile(package-lock.json)이 커밋되어 있는지 확인하세요."
---

## 상황

팀원이 코드를 push한 후 GitHub Actions CI 파이프라인이 실패했습니다. 로컬 환경에서는 정상적으로 빌드가 되지만, CI에서만 실패합니다. 빌드 로그를 분석하여 원인을 찾으세요.

## 데이터

### GitHub Actions 빌드 로그

```log
Run npm ci
npm warn deprecated @types/react@17.0.80: This is a stub types definition. react provides its own type definitions.

npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: react-beautiful-dnd@13.1.1
npm error Found: react@19.0.0
npm error node_modules/react
npm error   react@"^19.0.0" from the root project
npm error
npm error Could not resolve dependency:
npm error peer react@"^16.8.5 || ^17.0.0 || ^18.0.0" from react-beautiful-dnd@13.1.1
npm error node_modules/react-beautiful-dnd
npm error   react-beautiful-dnd@"^13.1.1" from the root project
npm error
npm error Conflicting peer dependency: react@18.3.1
npm error Fix the upstream dependency conflict, or retry
npm error this command with --legacy-peer-deps
npm error
npm error See /home/runner/.npm/eresolve-report.txt for a full report.

npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2024-01-15T10_30_00_000Z-debug-0.log
Error: Process completed with exit code 1.
```

### package.json (발췌)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^15.0.0",
    "react-beautiful-dnd": "^13.1.1",
    "axios": "^1.6.0",
    "zustand": "^4.5.0"
  }
}
```

### .github/workflows/ci.yml (발췌)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test
```

## 해설

### 원인 분석

빌드 실패 원인은 **peer dependency 충돌**입니다.

- 프로젝트는 `react@^19.0.0`을 사용하고 있습니다.
- `react-beautiful-dnd@13.1.1`은 peer dependency로 `react@"^16.8.5 || ^17.0.0 || ^18.0.0"`을 요구합니다.
- React 19는 이 범위에 포함되지 않으므로 `npm ci`가 `ERESOLVE` 에러로 실패합니다.

로컬에서는 이전에 `npm install --legacy-peer-deps`로 설치했거나, 기존 `node_modules`가 남아있어 에러가 발생하지 않았을 수 있습니다. CI는 매번 클린 설치하므로 충돌이 즉시 드러납니다.

### 해결 방법

```bash
# 방법 1: (권장) React 19를 지원하는 대체 라이브러리로 교체
npm uninstall react-beautiful-dnd
npm install @hello-pangea/dnd
# react-beautiful-dnd의 포크로, React 19를 지원합니다.

# 방법 2: (임시) .npmrc 파일에 설정 추가
echo "legacy-peer-deps=true" > .npmrc
# CI와 로컬 모두에서 일관된 동작을 보장합니다.

# 방법 3: (주의 필요) React 버전을 낮추기
# 다른 라이브러리와의 호환성 확인 필요
npm install react@18 react-dom@18
```

### 실무 팁

CI와 로컬 환경의 차이를 줄이려면 반드시 `package-lock.json`(또는 `pnpm-lock.yaml`)을 커밋하고, CI에서 `npm ci`(또는 `pnpm install --frozen-lockfile`)를 사용하세요. 새 의존성 추가 시에는 peer dependency 호환성을 사전에 확인하는 것이 중요합니다.
