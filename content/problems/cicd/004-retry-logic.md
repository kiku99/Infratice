---
id: "cicd-004"
title: "일시적 오류로 인한 배포 파이프라인 반복 실패"
category: "cicd"
difficulty: 1
tags: ["github-actions", "retry", "transient-error", "deployment"]
hints:
  - "에러 로그에서 실패 원인이 영구적인 문제인지 일시적인 문제인지 구분해 보세요."
  - "GitHub Actions에서 실패한 단계를 자동으로 재시도할 수 있는 방법이 있는지 찾아보세요."
---

## 상황

GitHub Actions 배포 파이프라인이 최근 자주 실패합니다. 실패 후 수동으로 "Re-run jobs"를 클릭하면 대부분 성공합니다. 팀원들이 매번 수동 재실행을 해야 하는 상황이 반복되고 있습니다. 워크플로우와 에러 로그를 분석하여 원인을 파악하고 해결하세요.

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
        run: ./scripts/deploy.sh
```

### GitHub Actions 실행 로그 (실패)

```log
Run ./scripts/deploy.sh
Authenticating with deployment server...
Uploading build artifacts...
Error: ETIMEDOUT - Connection timed out after 30000ms
  at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
Error: Process completed with exit code 1.
```

### GitHub Actions 실행 로그 (수동 재실행 - 성공)

```log
Run ./scripts/deploy.sh
Authenticating with deployment server...
Uploading build artifacts...
Deploying version abc1234...
Deployment successful!
```

## 해설

### 원인 분석

에러 로그에서 `ETIMEDOUT - Connection timed out`이 확인됩니다. 이는 배포 서버와의 네트워크 연결이 일시적으로 실패한 것으로, 수동 재실행 시 성공하는 전형적인 일시적 오류(transient error) 패턴입니다.

현재 워크플로우에는 재시도 로직이 없어 일시적 네트워크 문제가 발생할 때마다 파이프라인이 실패하고, 팀원이 수동으로 재실행해야 합니다.

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
        uses: nick-fields/retry@v3
        with:
          timeout_minutes: 2
          max_attempts: 3
          command: ./scripts/deploy.sh
```

```bash
# nick-fields/retry 액션의 주요 옵션
# timeout_minutes: 각 시도당 최대 실행 시간
# max_attempts: 최대 재시도 횟수
# retry_wait_seconds: 재시도 간 대기 시간 (기본 10초)
# retry_on: error | timeout | any (재시도 트리거 조건)
```

### 실무 팁

외부 서비스 호출이 포함된 CI/CD 단계에는 재시도 로직을 기본으로 추가하세요. 단, 재시도 대상은 일시적 오류(네트워크 타임아웃, 429 Too Many Requests)에 한정해야 하며, 인증 실패(401)나 리소스 부족(500) 같은 영구적 오류는 재시도해도 해결되지 않으므로 구분이 중요합니다.
