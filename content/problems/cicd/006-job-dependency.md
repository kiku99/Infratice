---
id: "cicd-006"
title: "병렬 실행되는 CI 작업 간 의존성 누락"
category: "cicd"
difficulty: 2
tags: ["github-actions", "needs", "job-dependency", "pipeline"]
hints:
  - "세 작업의 시작 시간을 비교하여 실행 순서를 확인해 보세요."
  - "GitHub Actions에서 작업 간 순서를 지정하는 키워드가 있는지 확인해 보세요."
  - "lint 실패에도 불구하고 build가 성공한 이유를 생각해 보세요."
---

## 상황

CI 파이프라인에 lint, test, build 세 가지 작업이 구성되어 있습니다. lint 단계에서 코드 스타일 에러가 발견되었지만 build가 성공으로 완료되었고, 이 코드가 머지되어 프로덕션에 배포되었습니다. 파이프라인 설정을 확인하여 원인을 분석하세요.

## 데이터

### .github/workflows/pipeline.yml

```yaml
name: CI Pipeline

on:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

### GitHub Actions 실행 결과

```log
CI Pipeline #82 - triggered by push to main

Job: lint   ✗ Failed  (1m 05s)   Started: 14:00:00
  > npm run lint
  > ESLint found 3 errors:
  >   src/api.ts:15 - no-unused-vars
  >   src/api.ts:23 - @typescript-eslint/no-explicit-any
  >   src/utils.ts:8 - no-unused-vars
  > Error: Process completed with exit code 1.

Job: test   ✓ Passed  (2m 30s)   Started: 14:00:00  ← 동시 시작
Job: build  ✓ Passed  (1m 45s)   Started: 14:00:00  ← 동시 시작

Workflow Status: Failure (lint failed)
# 하지만 build artifact는 이미 생성됨
```

## 해설

### 원인 분석

세 작업(`lint`, `test`, `build`)이 모두 **동시에 시작**(14:00:00)되고 있습니다. 작업 간 `needs` 키워드가 설정되어 있지 않아 GitHub Actions가 모든 작업을 병렬로 실행합니다.

이로 인해:
- `lint`가 실패해도 `test`와 `build`는 독립적으로 실행되어 성공함
- lint 에러가 있는 코드로 빌드 아티팩트가 생성됨
- 워크플로우 전체 상태는 실패이지만, build 결과물은 이미 만들어진 상태

### 해결 방법

```yaml
name: CI Pipeline

on:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

```bash
# 실행 순서: lint → test → build
# lint 실패 시 test와 build는 자동으로 skipped 처리됨
```

### 실무 팁

`needs`로 순차 실행을 구성하면 실패 시 빠르게 피드백을 받을 수 있어 전체 CI 시간을 오히려 줄일 수 있습니다. 단, lint와 test처럼 서로 독립적인 검증 단계는 병렬로 실행하고 build만 이 둘에 의존하도록 구성(`needs: [lint, test]`)하면 속도와 안전성을 모두 확보할 수 있습니다.
