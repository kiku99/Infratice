---
id: "cicd-008"
title: "테스트 미통과 코드가 main 브랜치에 머지되는 문제"
category: "cicd"
difficulty: 2
tags: ["github-actions", "pull-request", "test-gate", "branch-protection"]
hints:
  - "워크플로우의 트리거 이벤트가 PR에 대해 동작하는지 확인해 보세요."
  - "`on: push`와 `on: pull_request`의 차이점을 생각해 보세요."
  - "테스트 결과 아티팩트가 실패해도 보존되는지 확인해 보세요."
---

## 상황

팀에서 PR을 통해 코드를 머지하고 있지만, 테스트를 통과하지 못한 코드가 main 브랜치에 머지되어 프로덕션 장애가 반복되고 있습니다. CI 파이프라인이 구성되어 있지만 PR 머지 전에 테스트가 실행되지 않는 것으로 보입니다. 워크플로우를 분석하여 원인을 찾으세요.

## 데이터

### .github/workflows/pr-tests.yml

```yaml
name: PR Tests

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: ./run-tests.sh

      - name: Upload test results
        uses: ./.github/actions/upload-artifact
        with:
          name: test-results
          path: test-results.txt
```

### GitHub 이벤트 로그

```log
Event: pull_request #31 opened (feature/user-auth → main)
  → Workflow triggered: (없음)

Event: pull_request #31 merged
  → main 브랜치에 push 발생
  → Workflow triggered: PR Tests #98
  → Result: ✗ Failed (테스트 3건 실패)
  → 하지만 코드는 이미 main에 머지된 상태
```

### 테스트 실패 로그

```log
Run ./run-tests.sh
Running test suite...
  ✓ auth.test.js (12 tests passed)
  ✗ user.test.js (3 tests failed)
    - should validate email format
    - should hash password before save
    - should prevent duplicate registration
  ✓ api.test.js (8 tests passed)

Tests: 3 failed, 20 passed, 23 total
Error: Process completed with exit code 1.
```

## 해설

### 원인 분석

워크플로우의 트리거가 `on: push: branches: [main]`으로 설정되어 있어, PR이 열릴 때가 아닌 **main에 머지(push)된 후에** 테스트가 실행됩니다. 즉, 테스트가 게이트 역할을 하지 못하고 사후 검증만 수행하는 상태입니다.

이벤트 로그에서 확인할 수 있듯이:
1. PR이 열렸을 때 워크플로우가 트리거되지 않음
2. PR이 머지된 후 push 이벤트로 테스트 실행
3. 테스트 실패가 발견되었지만 코드는 이미 main에 존재

또한 테스트 실패 시 아티팩트 업로드 단계가 실행되지 않아 실패 결과를 확인하기도 어렵습니다.

### 해결 방법

```yaml
name: PR Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: ./run-tests.sh

      - name: Upload test results
        if: always()
        uses: ./.github/actions/upload-artifact
        with:
          name: test-results
          path: test-results.txt
```

```bash
# 주요 변경 사항:
# 1. on: push → on: pull_request 로 변경
#    PR이 열리거나 업데이트될 때 테스트 실행
# 2. if: always() 추가
#    테스트 실패해도 결과 아티팩트가 업로드됨
```

### 실무 팁

워크플로우를 `pull_request` 트리거로 변경한 후, GitHub 리포지토리 Settings > Branches > Branch protection rules에서 `Require status checks to pass before merging`을 활성화하고 해당 워크플로우를 필수 체크로 등록하세요. 이렇게 하면 테스트를 통과하지 못한 PR은 머지 버튼 자체가 비활성화되어 실수로 머지하는 것을 원천 차단할 수 있습니다.
