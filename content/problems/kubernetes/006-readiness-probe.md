---
id: "kubernetes-006"
title: "Pod가 Running이지만 트래픽을 받지 못하는 문제"
category: "kubernetes"
difficulty: 1
tags: ["readiness-probe", "service", "endpoint", "pod"]
hints:
  - "Pod가 Running 상태인데 READY 컬럼이 0/1인 이유를 생각해 보세요."
  - "readinessProbe 설정과 컨테이너가 실제로 응답하는 포트/경로가 일치하는지 확인하세요."
---

## 상황

웹 애플리케이션을 배포한 뒤 Service를 통해 접근하려 하지만 응답이 없습니다. Pod는 `Running` 상태이지만 `READY`가 `0/1`로 표시됩니다. 제공된 정보를 분석하여 트래픽이 전달되지 않는 원인을 찾으세요.

## 데이터

### kubectl get pods

```bash
NAME        READY   STATUS    RESTARTS   AGE
web-ready   0/1     Running   0          2m
```

### kubectl describe pod web-ready (발췌)

```yaml
Containers:
  nginx:
    Image:       nginx:latest
    Port:        80/TCP
    Readiness:   http-get http://:8080/ delay=0s timeout=1s period=10s #success=1 #failure=3
    State:       Running
      Started:   Wed, 15 Jan 2025 09:00:00 +0000
    Ready:       False
Events:
  Type     Reason     Age                From      Message
  ----     ------     ----               ----      -------
  Normal   Started    2m                 kubelet   Started container nginx
  Warning  Unhealthy  10s (x12 over 2m)  kubelet   Readiness probe failed: Get "http://10.244.1.5:8080/": dial tcp 10.244.1.5:8080: connect: connection refused
```

### web-ready-pod.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-ready
  labels:
    app: web
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
    readinessProbe:
      httpGet:
        path: /
        port: 8080
      periodSeconds: 10
      failureThreshold: 3
```

## 해설

### 원인 분석

Events에서 `Readiness probe failed: ... dial tcp 10.244.1.5:8080: connect: connection refused` 메시지가 핵심입니다. Nginx 컨테이너는 기본적으로 포트 `80`에서 리스닝하지만, `readinessProbe`가 포트 `8080`을 검사하고 있습니다. 포트 불일치로 인해 readiness 체크가 계속 실패하고, Kubernetes는 이 Pod를 `Ready`로 판단하지 않아 Service의 Endpoint에서 제외합니다.

### 해결 방법

```bash
# 1. Pod 매니페스트에서 readinessProbe의 port를 80으로 수정
# readinessProbe.httpGet.port: 8080 → 80

# 2. Pod 재생성
kubectl delete pod web-ready
kubectl apply -f web-ready-pod.yaml

# 3. READY 상태 확인
kubectl get pods web-ready

# 4. Endpoint에 Pod IP가 등록되었는지 확인
kubectl get endpoints
```

### 실무 팁

`readinessProbe`의 포트와 경로는 반드시 컨테이너가 실제로 응답하는 값과 일치해야 합니다. Readiness probe가 실패하면 Pod는 Running이지만 Service 트래픽을 전혀 받지 못하므로, 장애 상황에서 "Pod는 떠 있는데 왜 접속이 안 되지?" 같은 혼란을 야기합니다.
