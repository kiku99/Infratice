---
id: "kubernetes-031"
title: "runAsNonRoot 정책 위반으로 Pod가 시작되지 않는 문제"
category: "kubernetes"
difficulty: 2
tags: ["securitycontext", "nonroot", "pod-security", "container-security"]
hints:
  - "Pod Events에서 컨테이너가 시작되지 않는 구체적인 사유를 확인하세요."
  - "컨테이너 이미지가 기본적으로 어떤 사용자로 실행되는지 확인하세요."
  - "securityContext의 runAsNonRoot와 runAsUser 설정의 관계를 이해하세요."
---

## 상황

보안 팀의 요구에 따라 모든 Pod에 `runAsNonRoot: true` 정책을 적용했습니다. 그 뒤 일부 워크로드의 Pod가 시작되지 않고 `CreateContainerConfigError` 상태로 멈춰 있습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods 출력

```bash
NAME                            READY   STATUS                       RESTARTS   AGE
nginx-proxy-7c9d8f6b5-k4m2n    0/1     CreateContainerConfigError   0          5m
nginx-proxy-7c9d8f6b5-j8p3r    0/1     CreateContainerConfigError   0          5m
app-backend-5a3f7d8c2-w2x4q    1/1     Running                      0          5m
```

### kubectl describe pod nginx-proxy-7c9d8f6b5-k4m2n (Events 발췌)

```log
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  5m                 default-scheduler  Successfully assigned default/nginx-proxy-7c9d8f6b5-k4m2n
  Normal   Pulled     5m                 kubelet            Successfully pulled image "nginx:1.25"
  Warning  Failed     3s (x12 over 5m)   kubelet            Error: container has runAsNonRoot and image will run as root (pod: "nginx-proxy-7c9d8f6b5-k4m2n_default(uid)", container: nginx-proxy)
```

### nginx-proxy Deployment 스펙 (발췌)

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
      containers:
      - name: nginx-proxy
        image: nginx:1.25
        ports:
        - containerPort: 80
```

### app-backend Deployment 스펙 (발췌, 정상 동작)

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
      containers:
      - name: backend
        image: registry.example.com/app-backend:v2.0
        securityContext:
          runAsUser: 1000
        ports:
        - containerPort: 8080
```

## 해설

### 원인 분석

에러 메시지가 명확합니다:

> `container has runAsNonRoot and image will run as root`

Pod 레벨에서 `runAsNonRoot: true`를 설정하면, 컨테이너가 root(UID 0)로 실행되려 할 때 Kubernetes가 시작을 차단합니다. 공식 `nginx:1.25` 이미지는 기본 사용자가 **root**입니다. 따라서 `runAsNonRoot` 정책과 충돌합니다.

반면 `app-backend`는 컨테이너 레벨에서 `runAsUser: 1000`을 명시했기 때문에 정상 동작합니다. nginx-proxy에는 이 설정이 없어 이미지 기본값(root)이 사용됩니다.

### 해결 방법

```bash
# 1. Deployment 수정 — 컨테이너에 runAsUser 지정
kubectl edit deployment nginx-proxy

# containers[0]에 securityContext 추가:
#   securityContext:
#     runAsUser: 101    # nginx 이미지의 'nginx' 사용자 UID
#     allowPrivilegeEscalation: false

# 2. 단, 표준 nginx는 80 포트 바인딩에 root가 필요하므로
#    unprivileged 포트(8080)로 변경하거나 nginx-unprivileged 이미지 사용:
#   image: nginxinc/nginx-unprivileged:1.25

# 3. Pod 재생성 확인
kubectl rollout status deployment nginx-proxy
kubectl get pods
```

### 실무 팁

`runAsNonRoot: true` 정책을 적용할 때는 사용하는 모든 컨테이너 이미지의 기본 실행 사용자를 확인해야 합니다. `docker inspect <image> --format='{{.Config.User}}'`로 확인할 수 있으며, 값이 비어 있으면 root입니다. nginx처럼 root가 기본인 이미지는 `nginxinc/nginx-unprivileged` 같은 대체 이미지를 사용하는 것이 가장 깔끔합니다.
