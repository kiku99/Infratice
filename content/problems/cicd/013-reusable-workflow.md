---
id: "cicd-013"
title: "재사용 워크플로우 호출 시 입력 파라미터 전달 오류"
category: "cicd"
difficulty: 3
tags: ["github-actions", "reusable-workflow", "workflow-call", "dry"]
hints:
  - "재사용 워크플로우의 트리거 이벤트가 올바른지 확인해 보세요."
  - "caller 워크플로우에서 `uses`로 다른 워크플로우를 호출할 때의 문법을 확인해 보세요."
  - "재사용 워크플로우에서 `inputs`를 참조하는 방법이 일반 `env`와 다른지 확인해 보세요."
---

## 상황

여러 애플리케이션(frontend, backend, worker)이 동일한 빌드-테스트-아티팩트 업로드 과정을 거칩니다. 중복 코드를 줄이기 위해 공통 빌드 로직을 재사용 워크플로우로 분리했으나, caller 워크플로우에서 호출 시 에러가 발생합니다. 워크플로우 파일들을 분석하여 원인을 찾으세요.

## 데이터

### .github/workflows/shared-build.yml (재사용 워크플로우)

```yaml
name: Shared Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Build application
        run: ./build.sh ${{ env.APP_NAME }}

      - name: Upload artifact
        uses: ./.github/actions/upload-artifact
        with:
          name: build-${{ env.APP_NAME }}
          path: dist/
```

### .github/workflows/deploy.yml (caller 워크플로우)

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build:
    uses: ./.github/workflows/shared-build.yml
    with:
      app-name: "frontend"
```

### GitHub Actions 실행 로그

```log
Deploy Frontend #12

✗ build
  > Error: ./.github/workflows/shared-build.yml is not a reusable workflow.
  > A reusable workflow must have a 'workflow_call' trigger.

  > Additionally: Input 'app-name' is not defined in the called workflow.
```

## 해설

### 원인 분석

세 가지 문제가 있습니다:

1. **트리거 이벤트 오류**: 재사용 워크플로우(`shared-build.yml`)의 트리거가 `on: push`로 되어 있습니다. 재사용 워크플로우는 반드시 `on: workflow_call` 트리거를 사용해야 다른 워크플로우에서 호출할 수 있습니다.

2. **입력 파라미터 미정의**: `workflow_call`에 `inputs`가 정의되어 있지 않아 caller에서 전달하는 `app-name` 파라미터를 받을 수 없습니다.

3. **입력값 참조 방식 오류**: 재사용 워크플로우 내부에서 `${{ env.APP_NAME }}`으로 참조하고 있지만, `workflow_call`의 입력값은 `${{ inputs.app-name }}`으로 접근해야 합니다.

### 해결 방법

```yaml
# .github/workflows/shared-build.yml (재사용 워크플로우)
name: Shared Build

on:
  workflow_call:
    inputs:
      app-name:
        required: true
        type: string

jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Build application
        run: ./build.sh ${{ inputs.app-name }}

      - name: Upload artifact
        uses: ./.github/actions/upload-artifact
        with:
          name: build-${{ inputs.app-name }}
          path: dist/
```

```yaml
# .github/workflows/deploy.yml (caller 워크플로우)
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build:
    uses: ./.github/workflows/shared-build.yml
    with:
      app-name: "frontend"
```

```bash
# 주요 수정 사항:
# 1. on: push → on: workflow_call (재사용 워크플로우 트리거)
# 2. inputs 블록 추가 (app-name 파라미터 정의)
# 3. env.APP_NAME → inputs.app-name (입력값 참조 방식)
```

### 실무 팁

재사용 워크플로우는 `inputs`(일반 파라미터)와 `secrets`(민감 정보)를 별도로 정의해야 합니다. `secrets: inherit`를 caller에서 사용하면 모든 시크릿을 자동 전달할 수 있어 편리합니다. 재사용 워크플로우에는 `on: workflow_call`과 `on: push`를 함께 정의할 수 있어, 독립 실행과 호출 모두 가능하게 구성할 수도 있습니다.
