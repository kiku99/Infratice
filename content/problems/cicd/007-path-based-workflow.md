---
id: "cicd-007"
title: "변경 범위와 무관하게 CI가 반복 실행되는 원인 분석"
category: "cicd"
difficulty: 2
tags: ["github-actions", "path-filter", "workflow-trigger", "cost-optimization"]
hints:
  - "워크플로우의 트리거 조건에서 어떤 파일이 변경되었을 때 실행되는지 확인해 보세요."
  - "GitHub Actions `on.push`에 경로 필터를 적용할 수 있는지 알아보세요."
  - "`paths` 키워드를 확인해 보세요."
---

## 상황

인프라 코드(`/infra`)와 문서(`/docs`)가 한 리포지토리에 공존하는 모노레포를 운영 중입니다. 실제 변경 범위와 무관하게 인프라 유효성 검증 워크플로우가 자주 실행되어 월간 GitHub Actions 사용량이 예상의 3배를 초과하고 있습니다. 워크플로우를 분석하여 원인을 파악하세요.

## 데이터

### .github/workflows/infra-check.yml

```yaml
name: Infrastructure Validation

on:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Validate infrastructure
        run: ./validate-infra.sh

      - name: Upload report
        uses: ./.github/actions/upload-artifact
        with:
          name: validation-report
          path: validation-result.txt
```

### 최근 워크플로우 실행 내역

```log
#145  docs: README 업데이트            ✓ 3m 20s  (infra 변경 없음)
#144  docs: API 문서 추가              ✓ 3m 15s  (infra 변경 없음)
#143  infra: EKS 노드 그룹 설정 변경    ✓ 3m 18s
#142  docs: 설치 가이드 수정            ✓ 3m 22s  (infra 변경 없음)
#141  infra: VPC CIDR 범위 변경        ✓ 3m 10s
#140  docs: 트러블슈팅 가이드 추가       ✓ 3m 25s  (infra 변경 없음)
```

### git diff (최근 커밋)

```bash
$ git diff HEAD~1 --stat
 docs/troubleshooting.md | 45 +++++++++++++++++++++++++++++++++
 1 file changed, 45 insertions(+)
```

## 해설

### 원인 분석

워크플로우의 트리거 조건이 `on: push: branches: [main]`으로만 설정되어 있어, main 브랜치에 push되는 **모든 커밋**에서 워크플로우가 실행됩니다. 경로 필터(`paths`)가 없으므로 `/docs` 하위 파일만 변경되어도 인프라 유효성 검증이 불필요하게 실행됩니다.

실행 내역을 보면 6건 중 4건(67%)이 인프라 변경 없이 실행된 것으로, CI 리소스가 낭비되고 있습니다.

### 해결 방법

```yaml
name: Infrastructure Validation

on:
  push:
    branches: [main]
    paths:
      - 'infra/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    container:
      image: node:20-slim
    steps:
      - uses: actions/checkout@v4

      - name: Validate infrastructure
        run: ./validate-infra.sh

      - name: Upload report
        uses: ./.github/actions/upload-artifact
        with:
          name: validation-report
          path: validation-result.txt
```

```bash
# paths: 지정된 경로의 파일이 변경되었을 때만 워크플로우 실행
# paths-ignore: 지정된 경로의 파일 변경을 무시 (반대 접근)

# paths-ignore를 사용하는 대안:
# paths-ignore:
#   - 'docs/**'
#   - '**.md'
```

### 실무 팁

모노레포에서는 `paths` 필터를 적극 활용하여 변경된 컴포넌트에 해당하는 워크플로우만 실행하세요. `paths`와 `paths-ignore`를 동시에 사용할 수 없으므로, 검증 대상이 명확한 경우 `paths`를, 제외 대상이 명확한 경우 `paths-ignore`를 선택합니다. 대규모 모노레포에서는 `dorny/paths-filter` 같은 액션을 활용하면 더 세밀한 조건부 실행이 가능합니다.
