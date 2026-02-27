---
# ────────────────────────────────────────────────────────────
# [필수] id: "{카테고리}-{숫자 3자리}"
#   카테고리: linux | kubernetes | network | cicd | monitoring
#   숫자: 해당 카테고리의 다음 번호 (기존 파일 확인 후 부여)
#   예) linux-003, kubernetes-002
# ────────────────────────────────────────────────────────────
id: "kubernetes-002"

# [필수] 문제 제목 (명사형 또는 동명사형 권장)
# 예) "Nginx 502 Bad Gateway 에러 해결하기"
title: "Pod가 ImagePullBackOff 상태에 빠졌을 때 원인 찾기"

# [필수] linux | kubernetes | network | cicd | monitoring
category: "kubernetes"

# [필수] 난이도: 1(쉬움) | 2(보통) | 3(어려움)
# 기준: 1 = 단일 명령어로 파악 가능 / 2 = 2~3단계 추론 필요 / 3 = 복합 원인 또는 심화 개념 요구
difficulty: 1

# [필수] 관련 키워드 태그 (소문자, 2~5개)
# 예) ["nginx", "502", "reverse-proxy"]
tags: ["pod", "imagepullbackoff", "docker", "registry"]

# [필수] 힌트 (1~3개)
# - 정답을 직접 알려주지 말 것
# - 사용자가 스스로 다음 단계를 떠올릴 수 있도록 방향만 제시
hints:
  - "`kubectl describe pod` 출력 결과의 맨 아래 'Events' 섹션에서 구체적인 에러 메시지를 확인해 보세요."
  - "컨테이너 이미지의 이름과 태그(버전)에 오타가 없는지 확인해 보세요."
---

## 상황

<!--
  [작성 지침]
  - 실제 업무 중 마주칠 법한 구체적인 시나리오로 작성
  - "현재 ~에서 ~문제가 발생합니다. ~하세요." 형식 권장
  - 2~4문장으로 간결하게
  - 개인 정보·실제 도메인·IP는 example.com / 192.168.x.x 등으로 치환
-->

새로운 버전의 웹 애플리케이션 파드를 배포하기 위해 매니페스트를 적용했지만, 파드가 `Running` 상태로 넘어가지 못하고 계속 대기 중입니다. 
`kubectl get pods`를 확인해 보니 상태가 `ImagePullBackOff`로 표시됩니다. 제공된 파드 설정과 이벤트를 분석하여 배포가 실패한 원인을 찾고 해결하세요.

## 데이터

<!--
  [작성 지침]
  - H3(###) 제목으로 각 데이터 탭을 구분
  - 제목은 실제 파일명 또는 명령어 형태로 작성 (예: nginx.conf, kubectl describe pod, error.log)
  - 반드시 코드 펜스(```)와 언어 지정을 함께 사용
    지원 언어: bash, shell, nginx, yaml, json, dockerfile, ini, toml, log, plaintext
  - 데이터는 최소한으로 — 문제 해결에 불필요한 내용은 제거
  - 실제 로그는 핵심 에러 라인만 남기고 나머지는 생략 표시(...) 처리
  - 탭은 2~4개 이내 권장
-->

### kubectl get pods

```bash
NAME                             READY   STATUS             RESTARTS   AGE
web-frontend-7f8d9b4c5d-x2j4k    0/1     ImagePullBackOff   0          5m
```

### web-frontend-deployment.yaml (일부)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: frontend
        image: nginx:1.25.12-alpine
        ports:
        - containerPort: 80
```

### kubectl describe pod web-frontend-7f8d9b4c5d-x2j4k

```bash
Name:         web-frontend-7f8d9b4c5d-x2j4k
Namespace:    default
Status:       Pending
...
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  5m                 default-scheduler  Successfully assigned default/web-frontend-7f8d9b4c5d-x2j4k to node-01
  Normal   Pulling    4m (x3 over 5m)    kubelet            Pulling image "nginx:1.25.12-alpine"
  Warning  Failed     4m (x3 over 5m)    kubelet            Failed to pull image "nginx:1.25.12-alpine": rpc error: code = NotFound desc = failed to pull and unpack image "docker.io/library/nginx:1.25.12-alpine": failed to resolve reference "docker.io/library/nginx:1.25.12-alpine": docker.io/library/nginx:1.25.12-alpine: not found
  Warning  Failed     4m (x3 over 5m)    kubelet            Error: ErrImagePull
  Normal   BackOff    3m (x4 over 4m)    kubelet            Back-off pulling image "nginx:1.25.12-alpine"
  Warning  Failed     3m (x4 over 4m)    kubelet            Error: ImagePullBackOff
```

## 해설

<!--
  [작성 지침]
  - 아래 3개 H3 섹션을 반드시 유지할 것
  - 독자가 혼자 이 해설만 읽어도 이해할 수 있도록 작성
-->

### 원인 분석

`kubectl describe pod`의 `Events` 로그를 보면 kubelet이 `nginx:1.25.12-alpine` 이미지를 다운로드(Pull)하려고 시도했으나 실패(`Failed to pull image`)한 것을 알 수 있습니다.

가장 핵심적인 에러 메시지는 `docker.io/library/nginx:1.25.12-alpine: not found` 입니다. 이는 Docker Hub 레지스트리에 해당 이름과 태그를 가진 이미지가 존재하지 않음을 의미합니다. 실제로 Nginx의 공식 버전 중 `1.25.12`라는 버전은 존재하지 않으며, 존재하지 않는 버전을 입력하여 발생한 오타(Typo) 에러입니다.

### 해결 방법

배포 매니페스트(`yaml`) 파일에서 컨테이너 이미지의 태그를 실제로 존재하는 올바른 버전(예: `1.25.4-alpine` 또는 `latest`)으로 수정해야 합니다.

```bash
# 1. Deployment 매니페스트 파일 수정
# image: nginx:1.25.12-alpine 부분을 올바른 태그(예: nginx:1.25.4-alpine)로 변경합니다.
vi web-frontend-deployment.yaml

# 2. 수정된 매니페스트를 클러스터에 다시 적용합니다.
kubectl apply -f web-frontend-deployment.yaml

# 3. 파드가 정상적으로 Running 상태가 되는지 확인합니다.
kubectl get pods -w
```

### 실무 팁

이러한 `ImagePullBackOff` 에러는 오타 외에도 프라이빗 레지스트리(Private Registry) 인증 정보(`imagePullSecrets`)가 누락되었을 때 실무에서 아주 빈번하게 발생합니다. 파드가 뜨지 않을 때는 가장 먼저 `kubectl describe pod` 명령어의 맨 아래 `Events` 섹션을 확인하는 습관을 들여야 합니다.
