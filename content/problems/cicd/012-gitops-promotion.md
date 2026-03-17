---
id: "cicd-012"
title: "이미지 빌드 후 GitOps 배포 반영이 멈추는 원인 분석"
category: "cicd"
difficulty: 3
tags: ["github-actions", "gitops", "cross-repo", "image-tag", "argocd"]
hints:
  - "워크플로우에서 인프라 레포를 체크아웃하는 부분이 올바르게 설정되어 있는지 확인해 보세요."
  - "`sed` 명령어로 `values.yaml`의 태그를 치환할 때 변수가 제대로 전달되는지 확인해 보세요."
  - "Cross-repo checkout 시 필요한 인증 설정을 확인해 보세요."
---

## 상황

GitOps 방식으로 배포를 운영 중입니다. 앱 코드 리포지토리(`app-repo`)에서 push가 발생하면 Docker 이미지를 빌드하고, 인프라 리포지토리(`infra-repo`)의 `values.yaml`에서 이미지 태그를 자동 갱신하도록 파이프라인을 구성했습니다. 그러나 이미지 빌드는 성공하는데 인프라 레포의 태그가 갱신되지 않아 ArgoCD가 새 버전을 배포하지 않습니다. 워크플로우를 분석하여 원인을 찾으세요.

## 데이터

### app-repo/.github/workflows/promote.yml

```yaml
name: Build and Promote

on:
  push:
    branches: [main]

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Calculate short SHA
        run: echo "SHORT_SHA=${GITHUB_SHA}" >> $GITHUB_ENV

      - name: Build Docker image
        run: docker build -t app:${{ env.SHORT_SHA }} .

      - name: Checkout infra repo
        uses: actions/checkout@v4
        with:
          repository: myorg/infra-repo
          path: infra

      - name: Update image tag
        working-directory: infra
        run: |
          sed -i 's/tag: ".*"/tag: "$SHORT_SHA"/' values.yaml
          git add values.yaml
          git commit -m "Update tag to $SHORT_SHA"
          git push
```

### infra-repo/values.yaml

```yaml
image:
  repository: app
  tag: "previous-sha"
replicaCount: 3
```

### GitHub Actions 실행 로그

```log
Build and Promote #34

✓ Calculate short SHA
  > SHORT_SHA=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2

✓ Build Docker image
  > docker build -t app:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 .
  > Successfully built image

✗ Checkout infra repo
  > Error: fatal: could not read Username for 'https://github.com':
  > terminal prompts disabled
```

## 해설

### 원인 분석

현재 실행 로그에서 직접 확인되는 실패 지점은 `Checkout infra repo` 단계입니다. `fatal: could not read Username for 'https://github.com'` 에러는 `infra-repo`를 체크아웃할 때 필요한 인증 정보가 전달되지 않았음을 의미합니다.

즉 이번 실행에서 이미지 태그 갱신이 이루어지지 않은 직접 원인은 **cross-repo checkout 인증 누락**입니다. `SHORT_SHA` 처리 방식이나 `sed` 치환 방식에도 개선 여지는 있지만, 제공된 로그만 기준으로 하면 이번 런은 그 단계까지 도달하지 못했으므로 장애 원인으로 단정할 수는 없습니다.

### 해결 방법

```yaml
name: Build and Promote

on:
  push:
    branches: [main]

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Calculate image tag
        run: echo "IMAGE_TAG=${GITHUB_SHA}" >> $GITHUB_ENV

      - name: Build Docker image
        run: docker build -t app:${{ env.IMAGE_TAG }} .

      - name: Checkout infra repo
        uses: actions/checkout@v4
        with:
          repository: myorg/infra-repo
          token: ${{ secrets.INFRA_REPO_PAT }}
          path: infra

      - name: Update image tag
        working-directory: infra
        run: |
          sed -i "s/tag: \".*\"/tag: \"${{ env.IMAGE_TAG }}\"/" values.yaml
          git add values.yaml
          git commit -m "Update tag to ${{ env.IMAGE_TAG }}"
          git push
```

```bash
# 이번 장애 기준 핵심 수정 사항:
# 1. token: ${{ secrets.INFRA_REPO_PAT }} → infra-repo checkout 인증 추가
# 2. checkout 성공 후 values.yaml 갱신과 push 진행
#
# 추가 개선:
# - IMAGE_TAG 형식(short SHA 등) 표준화
# - sed 대신 yq 사용으로 YAML 안전 수정
```

### 실무 팁

GitOps 파이프라인에서 cross-repo 업데이트 시에는 Fine-grained PAT를 사용하여 최소 권한 원칙을 지키세요. PAT 대신 GitHub App을 생성하여 Installation Token을 사용하면 보안과 감사 추적이 더 용이합니다. 또한 `sed` 대신 `yq`를 사용하면 YAML 구조를 안전하게 수정할 수 있습니다: `yq -i '.image.tag = strenv(SHORT_SHA)' values.yaml`.
