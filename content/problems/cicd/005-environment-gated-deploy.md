---
id: "cicd-005"
title: "스테이징 검증 없이 프로덕션 배포되는 파이프라인"
category: "cicd"
difficulty: 2
tags: ["github-actions", "environment", "approval", "deployment-strategy"]
hints:
  - "두 배포 작업 간의 의존 관계가 설정되어 있는지 확인해 보세요."
  - "GitHub Actions의 Environment 기능으로 수동 승인 게이트를 구성할 수 있는지 알아보세요."
  - "`needs` 키워드와 `environment` 설정을 함께 살펴보세요."
---

## 상황

CI/CD 파이프라인이 코드 push 시 스테이징과 프로덕션에 동시에 배포되고 있습니다. 어제 불안정한 코드가 스테이징 검증 없이 바로 프로덕션에 배포되어 서비스 장애가 발생했습니다. 워크플로우를 분석하여 문제를 파악하세요.

## 데이터

### .github/workflows/deploy.yml

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: ./deploy.sh staging

  production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: ./deploy.sh production
```

### GitHub Actions 실행 결과

```log
Deploy Pipeline #47 - triggered by push to main

Job: staging     ✓ Completed (2m 13s)   Started: 09:00:00
Job: production  ✓ Completed (1m 58s)   Started: 09:00:00  ← 동시 시작

# 스테이징에서 E2E 테스트 실패가 확인되었으나,
# 프로덕션은 이미 배포 완료된 상태
```

### 서비스 장애 타임라인

```log
09:00:00  push → 스테이징/프로덕션 동시 배포 시작
09:01:58  프로덕션 배포 완료
09:02:13  스테이징 배포 완료, E2E 테스트 실패 감지
09:02:30  프로덕션 500 에러 알림 발생
09:15:00  수동 롤백 완료
```

## 해설

### 원인 분석

`staging`과 `production` 작업 사이에 의존 관계(`needs`)가 설정되어 있지 않아 두 작업이 **병렬로 동시 실행**됩니다. 또한 프로덕션 배포에 수동 승인 게이트가 없어 스테이징 검증 결과와 무관하게 프로덕션에 즉시 배포됩니다.

이로 인해:
- 스테이징에서 발견된 버그가 프로덕션에도 동일하게 배포됨
- 스테이징 검증이 사실상 무의미해짐

### 해결 방법

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: ./deploy.sh staging

  production:
    runs-on: ubuntu-latest
    needs: staging
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: ./deploy.sh production
```

```bash
# 1. needs: staging → 스테이징 성공 후에만 프로덕션 작업 시작
# 2. environment: production → GitHub 리포지토리 Settings > Environments에서
#    "production" 환경에 Required reviewers를 설정하면 수동 승인 필요
```

### 실무 팁

프로덕션 배포에는 반드시 Environment 보호 규칙을 설정하세요. `Required reviewers`로 승인자를 지정하고, `Wait timer`로 배포 전 대기 시간을 추가하면 스테이징 검증 결과를 확인할 시간을 확보할 수 있습니다. 추가로 `Deployment branches` 규칙으로 특정 브랜치에서만 프로덕션 배포가 가능하도록 제한하는 것도 좋은 방법입니다.
