---
id: "kubernetes-029"
title: "Ingress 경로 규칙 오류로 404 응답이 반환되는 문제"
category: "kubernetes"
difficulty: 2
tags: ["ingress", "path", "routing", "nginx-ingress", "pathtype"]
hints:
  - "Ingress 리소스의 path 규칙과 실제 요청 경로를 비교하세요."
  - "pathType이 Prefix인지 Exact인지에 따라 매칭 방식이 달라집니다."
  - "Ingress Controller의 로그에서 요청이 어떻게 처리되는지 확인하세요."
---

## 상황

API Gateway로 Nginx Ingress Controller를 사용하고 있습니다. `/api/v1/users`로 요청하면 정상 응답하지만, `/api/v2/users`로 요청하면 404가 반환됩니다. v2 백엔드 서비스는 정상 동작 중이며 직접 ClusterIP로 요청하면 응답합니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### Ingress 리소스

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api/v1(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: api-v1
            port:
              number: 8080
      - path: /api/v2
        pathType: Exact
        backend:
          service:
            name: api-v2
            port:
              number: 8080
```

### 요청 테스트 결과

```bash
$ curl -H "Host: api.example.com" http://ingress-ip/api/v1/users
{"status": "ok", "version": "v1", "data": [...]}

$ curl -H "Host: api.example.com" http://ingress-ip/api/v2/users
<html><body><h1>404 Not Found</h1></body></html>

$ curl http://api-v2.default.svc:8080/users
{"status": "ok", "version": "v2", "data": [...]}
```

### kubectl get svc 출력

```bash
NAME     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
api-v1   ClusterIP   10.96.45.100    <none>        8080/TCP   30d
api-v2   ClusterIP   10.96.45.200    <none>        8080/TCP   5d
```

## 해설

### 원인 분석

두 path 규칙의 차이가 원인입니다.

- `/api/v1` 경로: `pathType: ImplementationSpecific`과 정규식 패턴 `/api/v1(/|$)(.*)`을 사용하여 `/api/v1` 이하 모든 경로를 매칭합니다. `rewrite-target: /$2` 어노테이션으로 캡처 그룹을 활용해 하위 경로를 백엔드에 전달합니다.

- `/api/v2` 경로: `pathType: Exact`로 설정되어 있어 **정확히 `/api/v2`만** 매칭합니다. `/api/v2/users`처럼 하위 경로가 포함된 요청은 매칭되지 않아 404가 반환됩니다. 또한 정규식 캡처 그룹이 없어 `rewrite-target`도 동작하지 않습니다.

### 해결 방법

```bash
# 1. Ingress 리소스 수정
kubectl edit ingress api-gateway

# /api/v2 경로를 v1과 동일한 패턴으로 변경:
#   - path: /api/v2(/|$)(.*)
#     pathType: ImplementationSpecific
#     backend:
#       service:
#         name: api-v2
#         port:
#           number: 8080

# 2. 수정 후 라우팅 확인
curl -H "Host: api.example.com" http://ingress-ip/api/v2/users
```

### 실무 팁

Ingress에서 `pathType`은 매우 중요합니다. `Exact`는 경로 완전 일치, `Prefix`는 접두사 매칭, `ImplementationSpecific`은 컨트롤러 구현에 따라 정규식 등을 지원합니다. 새로운 API 버전 경로를 추가할 때는 기존 정상 동작하는 경로의 패턴을 그대로 복사한 뒤 필요한 부분만 수정하면 실수를 줄일 수 있습니다.
