---
id: "cicd-009"
title: "특정 Node.js 버전에서만 발생하는 호환성 오류"
category: "cicd"
difficulty: 2
tags: ["github-actions", "matrix-strategy", "nodejs", "compatibility"]
hints:
  - "CI에서 테스트하는 Node.js 버전과 프로덕션 환경의 버전을 비교해 보세요."
  - "GitHub Actions의 matrix strategy로 여러 버전을 동시에 테스트할 수 있는지 알아보세요."
  - "container 이미지를 활용한 버전 지정 방법을 확인해 보세요."
---

## 상황

프로덕션 환경(Node.js 22)에서 `Array.fromAsync is not a function` 에러가 발생했습니다. CI 파이프라인에서는 모든 테스트가 통과했는데 프로덕션에서만 문제가 발생합니다. 워크플로우 설정과 에러 로그를 분석하여 원인을 찾으세요.

## 데이터

### .github/workflows/pr-tests.yml

```yaml
name: PR Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: ./run-tests.sh
```

### 프로덕션 에러 로그

```log
2024-03-15T08:30:12Z [ERROR] Application startup failed
TypeError: Array.fromAsync is not a function
    at DataLoader.batchLoad (/app/src/loader.js:45:27)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)

Node.js version: v22.1.0
Environment: production (EKS)
```

### CI 테스트 결과

```log
PR Tests #156 - All checks passed ✓

Container: node:20-slim
Node.js version: v20.11.0

Running test suite...
  ✓ loader.test.js (15 tests passed)
  ✓ api.test.js (22 tests passed)
  ✓ auth.test.js (18 tests passed)

Tests: 0 failed, 55 passed, 55 total
```

### Dockerfile (프로덕션)

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["node", "src/index.js"]
```

## 해설

### 원인 분석

CI 환경과 프로덕션 환경의 Node.js 버전이 다릅니다:
- CI: `node:20-slim` (Node.js 20)
- 프로덕션: `node:22-slim` (Node.js 22)

`Array.fromAsync`는 Node.js 22에서 새로 도입된 API로, Node.js 20의 폴리필이나 코드 경로와 다르게 동작할 수 있습니다. CI에서 Node.js 20만 테스트하고 있어 Node.js 22에서만 발생하는 호환성 문제를 사전에 감지하지 못했습니다.

### 해결 방법

```yaml
name: PR Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    container:
      image: node:${{ matrix.node-version }}-slim
    steps:
      - uses: actions/checkout@v4

      - name: Show Node.js version
        run: node --version

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: ./run-tests.sh

      - name: Save version info
        run: echo "Tested on Node.js ${{ matrix.node-version }}" > node-version.txt
```

```bash
# matrix strategy로 Node.js 18, 20, 22에서 병렬 테스트
# 프로덕션에서 사용하는 버전을 반드시 포함해야 함
# fail-fast: false 옵션을 추가하면 한 버전이 실패해도 나머지 테스트 계속 실행
```

### 실무 팁

CI 테스트 환경은 프로덕션 환경과 최대한 일치시켜야 합니다. matrix strategy로 LTS 버전(18, 20)과 프로덕션 버전(22)을 모두 테스트하되, `fail-fast: false`를 설정하면 특정 버전 실패 시에도 다른 버전의 테스트 결과를 확인할 수 있습니다. Dockerfile의 베이스 이미지 버전과 CI 테스트 버전은 항상 동기화해서 관리하세요.
