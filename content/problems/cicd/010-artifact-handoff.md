---
id: "cicd-010"
title: "멀티 잡 파이프라인 아티팩트 전달 실패"
category: "cicd"
difficulty: 2
tags: ["github-actions", "artifact", "multi-job", "pipeline"]
hints:
  - "두 번째 잡에서 아티팩트를 찾지 못하는 에러 메시지를 주의 깊게 확인해 보세요."
  - "upload-artifact와 download-artifact에서 사용하는 아티팩트 이름이 일치하는지 확인해 보세요."
  - "두 번째 잡이 첫 번째 잡 완료 후에 실행되는지 확인해 보세요."
---

## 상황

CI/CD 파이프라인을 두 단계로 구성했습니다. 첫 번째 잡에서 테스트를 실행하고, 두 번째 잡에서 테스트 결과를 다운로드하여 요약 리포트를 생성합니다. 그러나 두 번째 잡이 항상 실패합니다. 워크플로우를 분석하여 원인을 찾으세요.

## 데이터

### .github/workflows/artifact-handoff.yml

```yaml
name: Test and Report

on:
  pull_request:
    branches: [main]

jobs:
  test-job:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: ./run-tests.sh

      - name: Upload results
        uses: ./.github/actions/upload-artifact
        with:
          name: test-output
          path: test-results.txt

  report-job:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Download results
        uses: ./.github/actions/download-artifact
        with:
          name: test-results

      - name: Generate summary
        run: |
          PASS_COUNT=$(grep -c "PASS:" test-results.txt)
          echo "Total Passed Tests: $PASS_COUNT" > summary.txt

      - name: Upload summary
        uses: ./.github/actions/upload-artifact
        with:
          name: test-summary
          path: summary.txt
```

### GitHub Actions 실행 로그

```log
Test and Report #23

Job: test-job    ✓ Passed (2m 10s)   Started: 10:00:00
  > Run tests: 45 passed, 0 failed
  > Upload results: Uploaded 'test-output' (1 file)

Job: report-job  ✗ Failed (0m 15s)   Started: 10:00:00  ← 동시 시작
  > Download results:
  > Error: Unable to find any artifacts for the associated workflow run.
  > Artifact 'test-results' not found.
  > Error: Process completed with exit code 1.
```

## 해설

### 원인 분석

두 가지 문제가 있습니다:

1. **아티팩트 이름 불일치**: `test-job`에서 `test-output`이라는 이름으로 업로드했지만, `report-job`에서는 `test-results`라는 이름으로 다운로드를 시도합니다.

2. **잡 의존성 누락**: `report-job`에 `needs: test-job`이 없어 두 잡이 동시에 시작됩니다. `report-job`이 실행될 때 `test-job`의 아티팩트 업로드가 아직 완료되지 않았을 수 있습니다.

로그에서 두 잡의 시작 시간이 동일(10:00:00)한 것과, 에러 메시지에서 `test-results`를 찾지 못한다는 점이 이를 확인해 줍니다.

### 해결 방법

```yaml
name: Test and Report

on:
  pull_request:
    branches: [main]

jobs:
  test-job:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: ./run-tests.sh

      - name: Upload results
        uses: ./.github/actions/upload-artifact
        with:
          name: test-results
          path: test-results.txt

  report-job:
    runs-on: ubuntu-latest
    needs: test-job
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Download results
        uses: ./.github/actions/download-artifact
        with:
          name: test-results

      - name: Generate summary
        run: |
          PASS_COUNT=$(grep -c "PASS:" test-results.txt)
          echo "Total Passed Tests: $PASS_COUNT" > summary.txt

      - name: Upload summary
        uses: ./.github/actions/upload-artifact
        with:
          name: test-summary
          path: summary.txt
```

```bash
# 수정 사항:
# 1. upload-artifact의 name을 test-output → test-results로 통일
# 2. report-job에 needs: test-job 추가하여 순차 실행 보장
```

### 실무 팁

멀티 잡 파이프라인에서 아티팩트를 전달할 때는 아티팩트 이름을 상수나 환경 변수로 관리하여 불일치를 방지하세요. 또한 `actions/download-artifact`의 결과를 다음 단계에서 사용하기 전에 파일 존재 여부를 검증(`test -f file.txt`)하면 더 명확한 에러 메시지를 얻을 수 있습니다.
