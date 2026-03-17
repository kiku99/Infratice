---
id: "kubernetes-021"
title: "Namespace 간 허용된 통신만 남기도록 접근 제어 구성하기"
category: "kubernetes"
difficulty: 2
tags: ["networkpolicy", "namespace-isolation", "multi-tenant", "limitrange"]
hints:
  - "현재 어떤 방향의 트래픽이 허용되고 있는지 먼저 정리해 보세요."
  - "Namespace 단위 조건과 Pod 라벨 조건을 함께 사용하면 허용 범위를 세밀하게 좁힐 수 있습니다."
  - "기본 허용 상태를 유지할지, 기본 차단 후 예외만 열지 생각해 보세요."
---

## 상황

두 팀이 하나의 클러스터를 공유하며, `team-a`와 `team-b` Namespace로 분리되어 있습니다. 보안 요구사항에 따라 기본적으로 모든 크로스 Namespace 트래픽을 차단하되, `team-a`에서 `team-b`의 `app=api` Pod 포트 `8080`에만 접근을 허용해야 합니다. 현재는 모든 트래픽이 허용되어 있습니다.

## 데이터

### kubectl get pods -n team-a --show-labels

```bash
NAME      READY   STATUS    RESTARTS   AGE   LABELS
client    1/1     Running   0          10m   app=client
```

### kubectl get pods -n team-b --show-labels

```bash
NAME   READY   STATUS    RESTARTS   AGE   LABELS
api    1/1     Running   0          10m   app=api
web    1/1     Running   0          10m   app=web
```

### 현재 접근 테스트 결과

```bash
$ kubectl exec client -n team-a -- curl -s --max-time 3 api.team-b:8080
{"status": "ok"}

$ kubectl exec client -n team-a -- curl -s --max-time 3 web.team-b:80
<!DOCTYPE html><html>...

$ kubectl exec api -n team-b -- curl -s --max-time 3 client.team-a:80
{"status": "ok"}
```

### kubectl get networkpolicy --all-namespaces

```bash
No resources found
```

## 해설

### 원인 분석

`kubectl get networkpolicy` 결과가 비어 있어 NetworkPolicy가 전혀 설정되지 않았습니다. Kubernetes는 NetworkPolicy가 없으면 모든 Pod 간 트래픽을 허용하는 것이 기본 동작입니다. 따라서 `team-a`에서 `team-b`의 모든 Pod에 접근 가능하고, 그 반대도 마찬가지입니다.

보안 요구사항을 충족하려면: (1) 양쪽 Namespace에 기본 차단 정책 적용, (2) `team-a` → `team-b`의 `api` Pod 8080 포트만 허용하는 정책 추가가 필요합니다.

### 해결 방법

```bash
# 1. team-a에 기본 차단 정책 적용 (모든 ingress/egress 차단)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF

# 2. team-b에 기본 차단 정책 적용
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: team-b
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF

# 3. team-a → team-b api:8080 허용 정책
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-team-a-to-api
  namespace: team-b
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: team-a
    ports:
    - protocol: TCP
      port: 8080
EOF

# 4. team-a의 egress도 허용 (DNS + team-b api)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-to-api
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: team-b
      podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 8080
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
EOF

# 5. 접근 테스트
kubectl exec client -n team-a -- curl -s --max-time 3 api.team-b:8080
kubectl exec client -n team-a -- curl -s --max-time 3 web.team-b:80
```

### 실무 팁

NetworkPolicy는 CNI 플러그인(Calico, Cilium 등)이 지원해야 실제로 작동합니다. 기본 Flannel CNI는 NetworkPolicy를 지원하지 않으므로 주의하세요. 멀티테넌트 환경에서는 반드시 default-deny 정책을 먼저 적용한 뒤, 필요한 트래픽만 화이트리스트로 허용하는 방식이 안전합니다.
