---
id: "kubernetes-014"
title: "이미지를 가져오지 못해 Pod가 시작되지 않는 원인 분석"
category: "kubernetes"
difficulty: 2
tags: ["imagepullbackoff", "imagepullsecrets", "registry", "secret"]
hints:
  - "에러 메시지에서 `unauthorized` 키워드를 주목하세요."
  - "프라이빗 레지스트리에서 이미지를 받으려면 인증 정보가 필요합니다. Deployment에 해당 설정이 있는지 확인하세요."
  - "`imagePullSecrets` 필드를 사용하면 Pod에 레지스트리 인증 정보를 연결할 수 있습니다."
---

## 상황

`dev` Namespace에 배포한 `backend` Deployment의 Pod가 `ImagePullBackOff` 상태에 머물러 있습니다. 제공된 정보를 분석하여 원인을 찾고 해결하세요.

## 데이터

### kubectl get pods -n dev

```bash
NAME                       READY   STATUS             RESTARTS   AGE
backend-6c8d7f9b5-q2w3e    0/1     ImagePullBackOff   0          3m
```

### kubectl describe pod backend-6c8d7f9b5-q2w3e -n dev (발췌)

```bash
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  3m                 default-scheduler  Successfully assigned dev/backend-6c8d7f9b5-q2w3e to node-02
  Normal   Pulling    2m (x3 over 3m)    kubelet            Pulling image "ghcr.io/prepare-sh/alpine:3.23.2"
  Warning  Failed     2m (x3 over 3m)    kubelet            Failed to pull image "ghcr.io/prepare-sh/alpine:3.23.2": rpc error: code = Unknown desc = failed to pull and unpack image "ghcr.io/prepare-sh/alpine:3.23.2": failed to resolve reference: pulling from host ghcr.io failed with status 403: denied
  Warning  Failed     2m (x3 over 3m)    kubelet            Error: ErrImagePull
  Normal   BackOff    30s (x5 over 2m)   kubelet            Back-off pulling image "ghcr.io/prepare-sh/alpine:3.23.2"
```

### backend-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/prepare-sh/alpine:3.23.2
        ports:
        - containerPort: 8080
```

### kubectl get secrets -n dev

```bash
NAME                  TYPE                                  DATA   AGE
default-token-abc12   kubernetes.io/service-account-token   3      5d
```

## 해설

### 원인 분석

Events에서 `status 403: denied` 메시지가 핵심입니다. 이미지가 프라이빗 레지스트리(`ghcr.io`)에 있어 인증이 필요하지만, Deployment 매니페스트에 `imagePullSecrets`가 설정되지 않았고, `dev` Namespace에 레지스트리 인증용 Secret도 존재하지 않습니다.

Kubernetes는 기본적으로 프라이빗 레지스트리에 대한 인증 정보 없이는 이미지를 다운로드할 수 없으며, 이 경우 `ErrImagePull` → `ImagePullBackOff` 상태가 됩니다.

### 해결 방법

```bash
# 1. 레지스트리 인증 Secret 생성
kubectl create secret docker-registry ghcr-secret -n dev \
  --docker-server=ghcr.io \
  --docker-username=preparesh-bot \
  --docker-password=<access-token>

# 2. Deployment에 imagePullSecrets 추가
kubectl patch deployment backend -n dev -p \
  '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-secret"}]}}}}'

# 3. Pod가 정상적으로 Running 상태인지 확인
kubectl get pods -n dev -w
```

### 실무 팁

`imagePullSecrets`를 매번 Deployment에 추가하는 대신, ServiceAccount에 기본 `imagePullSecrets`를 설정하면 해당 Namespace의 모든 Pod에 자동 적용됩니다. 또한 Secret이 올바른 Namespace에 있어야 하며, 레지스트리 토큰의 만료 기간을 관리하여 갑작스런 이미지 풀 실패를 방지하세요.
