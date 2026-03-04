---
id: "cicd-011"
title: "배포 실패 후 자동 롤백이 동작하지 않는 파이프라인"
category: "cicd"
difficulty: 2
tags: ["github-actions", "rollback", "deployment", "values-yaml"]
hints:
  - "rollback 잡의 실행 조건과 의존 관계를 확인해 보세요."
  - "`needs`가 설정된 잡의 기본 실행 조건이 무엇인지 생각해 보세요."
  - "이전 커밋의 파일을 복원하는 Git 명령어를 확인해 보세요."
---

## 상황

배포 파이프라인에 자동 롤백 메커니즘을 구성했습니다. 배포가 실패하면 `values.yaml`을 이전 커밋 상태로 자동 복원하도록 설계했는데, 실제 배포 실패 시 rollback 잡이 실행되지 않습니다. 워크플로우를 분석하여 원인을 찾으세요.

## 데이터

### .github/workflows/deploy.yml

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: ./deploy.sh

  rollback:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Restore previous values
        run: git checkout HEAD~1 -- values.yaml

      - name: Commit rollback
        run: |
          git config user.name "CI Bot"
          git config user.email "ci-bot@example.com"
          git add values.yaml
          git commit -m "chore: automatic rollback due to deployment failure"
          git push
```

### values.yaml

```yaml
image:
  repository: myapp
  tag: "abc1234"
pullPolicy: IfNotPresent
```

### GitHub Actions 실행 로그

```log
Deploy #67 - triggered by push to main

Job: deploy    ✗ Failed (1m 30s)
  > ./deploy.sh
  > Deploying image myapp:abc1234...
  > Error: Health check failed - container not ready after 60s
  > Error: Process completed with exit code 1.

Job: rollback  ⊘ Skipped
  > This job was skipped because its dependency 'deploy' did not succeed.
```

## 해설

### 원인 분석

`rollback` 잡에 `needs: deploy`가 설정되어 있지만, **실행 조건(`if`)이 지정되어 있지 않습니다**. `needs`를 사용한 잡의 기본 동작은 의존하는 잡이 **성공했을 때만** 실행되는 것입니다.

따라서 `deploy`가 실패하면 `rollback`은 자동으로 `Skipped` 처리됩니다. 롤백은 배포 실패 시에만 실행되어야 하므로 `if: failure()` 조건이 필요합니다.

### 해결 방법

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: ./deploy.sh

  rollback:
    runs-on: ubuntu-latest
    needs: deploy
    if: failure()
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Restore previous values
        run: git checkout HEAD~1 -- values.yaml

      - name: Commit rollback
        run: |
          git config user.name "CI Bot"
          git config user.email "ci-bot@example.com"
          git add values.yaml
          git commit -m "chore: automatic rollback due to deployment failure"
          git push
```

```bash
# if: failure() → needs에 지정된 잡이 실패했을 때만 실행
# if: always()  → 성공/실패 관계없이 항상 실행
# if: success() → (기본값) 성공했을 때만 실행
```

### 실무 팁

`needs`와 `if` 조건을 함께 사용할 때 기본 동작을 반드시 이해해야 합니다. 롤백 외에도 실패 알림 발송(`if: failure()`), 정리 작업(`if: always()`) 등 다양한 후속 작업에 조건부 실행이 활용됩니다. 롤백 커밋이 다시 워크플로우를 트리거하지 않도록 커밋 메시지에 `[skip ci]`를 포함하거나 별도 조건을 추가하는 것도 고려하세요.
