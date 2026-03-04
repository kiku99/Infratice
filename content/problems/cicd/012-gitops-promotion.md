---
id: "cicd-012"
title: "GitOps 파이프라인에서 인프라 레포 이미지 태그 미갱신"
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

세 가지 문제가 있습니다:

1. **Short SHA 미처리**: `GITHUB_SHA`의 전체 40자를 그대로 사용하고 있습니다. `${GITHUB_SHA::7}`로 앞 7자만 추출해야 합니다.

2. **Cross-repo 인증 누락**: 다른 리포지토리(`infra-repo`)를 체크아웃하려면 `token` 파라미터에 해당 리포지토리 접근 권한이 있는 PAT(Personal Access Token)를 전달해야 합니다. 기본 `GITHUB_TOKEN`은 현재 리포지토리에 대한 권한만 가집니다.

3. **sed 변수 치환 오류**: `sed` 명령어 내에서 `$SHORT_SHA`가 셸 변수가 아닌 리터럴 문자열로 처리됩니다. 작은따옴표(`'`) 안에서는 변수 확장이 되지 않으므로 큰따옴표(`"`)를 사용하거나 `${{ env.SHORT_SHA }}`를 사용해야 합니다.

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

      - name: Calculate short SHA
        run: echo "SHORT_SHA=${GITHUB_SHA::7}" >> $GITHUB_ENV

      - name: Build Docker image
        run: docker build -t app:${{ env.SHORT_SHA }} .

      - name: Checkout infra repo
        uses: actions/checkout@v4
        with:
          repository: myorg/infra-repo
          token: ${{ secrets.INFRA_REPO_PAT }}
          path: infra

      - name: Update image tag
        working-directory: infra
        run: |
          sed -i "s/tag: \".*\"/tag: \"${{ env.SHORT_SHA }}\"/" values.yaml
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add values.yaml
          git commit -m "Update tag to ${{ env.SHORT_SHA }}"
          git push
```

```bash
# 주요 수정 사항:
# 1. ${GITHUB_SHA::7} → 7자 short SHA 추출
# 2. token: ${{ secrets.INFRA_REPO_PAT }} → cross-repo 접근 권한
# 3. sed 명령어에서 큰따옴표 사용 + ${{ env.SHORT_SHA }} 참조
# 4. git config 추가 → 커밋 author 설정
```

### 실무 팁

GitOps 파이프라인에서 cross-repo 업데이트 시에는 Fine-grained PAT를 사용하여 최소 권한 원칙을 지키세요. PAT 대신 GitHub App을 생성하여 Installation Token을 사용하면 보안과 감사 추적이 더 용이합니다. 또한 `sed` 대신 `yq`를 사용하면 YAML 구조를 안전하게 수정할 수 있습니다: `yq -i '.image.tag = strenv(SHORT_SHA)' values.yaml`.
