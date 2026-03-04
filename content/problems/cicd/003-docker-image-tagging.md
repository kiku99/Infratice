---
id: "cicd-003"
title: "Docker 이미지 latest 태그로 인한 롤백 불가"
category: "cicd"
difficulty: 1
tags: ["docker", "image-tag", "commit-sha", "rollback"]
hints:
  - "Docker 이미지 목록에서 태그가 어떻게 되어 있는지 확인해 보세요."
  - "특정 커밋 시점의 이미지를 식별할 수 있는 태깅 전략을 생각해 보세요."
  - "`GITHUB_SHA` 환경 변수를 활용할 수 있는지 확인해 보세요."
---

## 상황

운영 환경 배포 후 애플리케이션에 심각한 버그가 발견되어 이전 버전으로 롤백해야 합니다. 그러나 Docker 이미지 레지스트리를 확인한 결과 모든 이미지가 동일한 태그로 되어 있어 어떤 커밋 버전의 이미지인지 추적할 수 없습니다. 빌드 워크플로우를 분석하여 원인을 찾으세요.

## 데이터

### .github/workflows/build.yml

```yaml
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:latest .

      - name: Push Docker image
        run: docker push myapp:latest
```

### docker images 출력

```log
REPOSITORY    TAG       IMAGE ID       CREATED          SIZE
myapp         latest    a1b2c3d4e5f6   2 minutes ago    245MB
```

### 배포 히스토리

```log
2024-03-01 09:00  배포 v1 (정상) - myapp:latest
2024-03-02 10:00  배포 v2 (정상) - myapp:latest
2024-03-03 11:00  배포 v3 (장애) - myapp:latest   ← 현재
# v2로 롤백하고 싶지만 해당 이미지를 식별할 수 없음
```

## 해설

### 원인 분석

워크플로우에서 Docker 이미지를 항상 `latest` 태그로만 빌드하고 있습니다. `latest`는 가장 최근 빌드를 가리키는 가변 태그(mutable tag)이므로 새 이미지가 push되면 이전 이미지에 대한 참조가 사라집니다.

이로 인해:
- 특정 커밋에 해당하는 이미지를 식별할 수 없음
- 롤백 시 이전 버전의 이미지를 찾을 수 없음
- 운영 환경에서 실행 중인 이미지가 어떤 코드 버전인지 추적 불가

### 해결 방법

```yaml
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set short SHA
        run: echo "SHORT_SHA=${GITHUB_SHA::7}" >> $GITHUB_ENV

      - name: Build Docker image
        run: |
          docker build \
            -t myapp:${{ env.SHORT_SHA }} \
            -t myapp:latest \
            .

      - name: Push Docker image
        run: |
          docker push myapp:${{ env.SHORT_SHA }}
          docker push myapp:latest
```

```bash
# 롤백 시 특정 커밋의 이미지로 즉시 복구 가능
kubectl set image deployment/myapp myapp=myapp:abc1234
```

### 실무 팁

Docker 이미지 태깅에는 Git commit SHA(short)를 기본으로 사용하고, `latest`는 보조 태그로 함께 붙이는 것이 좋습니다. 추가로 Git 태그 기반 시맨틱 버전(v1.2.3)도 병행하면 릴리스 추적이 용이합니다. 이미지 레이블(`org.opencontainers.image.revision`)에 전체 SHA를 기록하면 감사(audit) 추적에도 도움이 됩니다.
