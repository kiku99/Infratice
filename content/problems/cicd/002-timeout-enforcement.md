---
id: "cicd-002"
title: "GitHub Actions 작업 무한 대기로 인한 러너 점유"
category: "cicd"
difficulty: 1
tags: ["github-actions", "timeout", "runner", "cost"]
hints:
  - "GitHub Actions 작업의 기본 타임아웃 시간이 얼마인지 확인해 보세요."
  - "job 레벨에서 실행 시간을 제한할 수 있는 설정이 있는지 확인해 보세요."
---

## 상황

GitHub Actions를 사용하여 배포 파이프라인을 운영 중입니다. 최근 deploy 작업이 간헐적으로 멈추면서 러너가 6시간 동안 점유되고, 다른 작업이 큐에 밀려 팀 전체 CI/CD가 지연되고 있습니다. 워크플로우 설정을 확인하여 원인을 분석하고 해결하세요.

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
        run: ./scripts/long-running-task.sh

      - name: Notify Slack
        run: |
          curl -X POST "$SLACK_WEBHOOK" \
            -d '{"text": "Deployment completed"}'
```

### GitHub Actions 실행 로그

```log
2024-03-01T09:00:12Z  Run ./scripts/long-running-task.sh
2024-03-01T09:00:13Z  Connecting to deployment server...
2024-03-01T09:00:14Z  Uploading artifacts...
2024-03-01T09:00:15Z  Waiting for deployment to complete...
...
(이후 6시간 동안 출력 없음)
...
2024-03-01T15:00:15Z  Error: The operation was canceled.
2024-03-01T15:00:15Z  ##[error]The runner has received a shutdown signal.
```

## 해설

### 원인 분석

워크플로우에 `timeout-minutes`가 설정되어 있지 않습니다. GitHub Actions의 기본 타임아웃은 **6시간(360분)**으로, 배포 스크립트가 네트워크 문제나 외부 서비스 무응답으로 멈추면 최대 6시간 동안 러너를 점유하게 됩니다.

이는 다음과 같은 문제를 야기합니다:
- 러너 동시 실행 수 제한에 걸려 다른 작업이 대기 상태에 빠짐
- GitHub Actions 사용 시간 기반 과금 시 불필요한 비용 발생

### 해결 방법

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        timeout-minutes: 5
        run: ./scripts/long-running-task.sh

      - name: Notify Slack
        run: |
          curl -X POST "$SLACK_WEBHOOK" \
            -d '{"text": "Deployment completed"}'
```

```bash
# job 레벨: 전체 작업에 대한 타임아웃
timeout-minutes: 10

# step 레벨: 개별 단계에 대한 더 세밀한 타임아웃
timeout-minutes: 5
```

### 실무 팁

모든 GitHub Actions 작업에는 반드시 `timeout-minutes`를 설정하세요. 일반적으로 배포 작업은 5~15분, 빌드 작업은 10~30분이 적절합니다. job 레벨과 step 레벨 모두 설정하면 외부 서비스 무응답에 의한 러너 낭비를 효과적으로 방지할 수 있습니다.
