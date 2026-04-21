---
id: "kubernetes-028"
title: "Service에 연결된 Endpoint가 없어 트래픽이 전달되지 않는 문제"
category: "kubernetes"
difficulty: 1
tags: ["service", "selector", "endpoints", "label"]
hints:
  - "Service의 selector 라벨과 Pod의 라벨이 정확히 일치하는지 비교하세요."
  - "kubectl get endpoints 명령으로 Service에 연결된 Pod가 있는지 확인하세요."
  - "라벨의 key와 value 모두 대소문자까지 일치해야 합니다."
---

## 상황

새로 배포한 백엔드 서비스에 ClusterIP Service를 생성했지만, 프론트엔드에서 백엔드로 요청 시 연결이 거부됩니다. Pod는 정상 Running이고 직접 Pod IP로 요청하면 응답합니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get svc backend 출력

```bash
NAME      TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
backend   ClusterIP   10.96.32.150   <none>        8080/TCP   10m
```

### kubectl describe svc backend (발췌)

```yaml
Name:              backend
Selector:          app=Backend
Port:              http  8080/TCP
TargetPort:        8080/TCP
Endpoints:         <none>
```

### kubectl get pods -l app=backend --show-labels 출력

```bash
NAME                       READY   STATUS    RESTARTS   AGE   LABELS
backend-6d8f9c4b7-k3m2n   1/1     Running   0          10m   app=backend,version=v1
backend-6d8f9c4b7-r8n5p   1/1     Running   0          10m   app=backend,version=v1
```

### 프론트엔드에서 요청 시 에러

```log
$ curl http://backend.default.svc:8080/api/health
curl: (7) Failed to connect to backend.default.svc port 8080: Connection refused
```

## 해설

### 원인 분석

`kubectl describe svc backend`의 `Endpoints: <none>`이 핵심입니다. Service에 매칭되는 Pod가 없다는 뜻입니다.

Service의 selector는 `app=Backend`(대문자 B)이고, 실제 Pod의 라벨은 `app=backend`(소문자 b)입니다. Kubernetes의 라벨 매칭은 **대소문자를 구분**하므로, `Backend`와 `backend`는 다른 값으로 취급됩니다. 결과적으로 Service가 어떤 Pod에도 연결되지 않아 트래픽이 전달되지 않습니다.

### 해결 방법

```bash
# 1. Service의 selector를 Pod 라벨과 일치하도록 수정
kubectl patch svc backend -p '{"spec":{"selector":{"app":"backend"}}}'

# 2. Endpoints가 생성되었는지 확인
kubectl get endpoints backend

# 3. 트래픽 전달 확인
kubectl exec -it frontend-pod -- curl http://backend.default.svc:8080/api/health
```

### 실무 팁

Service와 Pod의 라벨 매칭 문제는 흔한 실수입니다. `kubectl get endpoints <서비스명>`을 먼저 확인하면 Service-Pod 연결 상태를 바로 파악할 수 있습니다. 라벨 네이밍 규칙을 팀 내 컨벤션으로 정해 두면(예: 항상 소문자 사용) 이런 불일치를 예방할 수 있습니다.
