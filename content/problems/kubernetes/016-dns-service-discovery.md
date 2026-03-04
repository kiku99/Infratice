---
id: "kubernetes-016"
title: "Service DNS가 개별 Pod IP를 반환하지 않는 문제"
category: "kubernetes"
difficulty: 2
tags: ["dns", "headless-service", "clusterip", "service-discovery"]
hints:
  - "nslookup 결과에서 반환된 IP가 몇 개인지, 그것이 어떤 IP인지 확인하세요."
  - "일반 ClusterIP Service와 Headless Service의 DNS 동작 차이를 생각해 보세요."
  - "Service의 `clusterIP` 필드 값을 확인하세요."
---

## 상황

`disco` Namespace의 `discovery-app`은 DNS를 통해 피어 Pod를 발견하여 클러스터를 구성해야 합니다. `discovery-svc` Service로 DNS 조회를 하면 하나의 IP만 반환되어 개별 Pod를 발견하지 못하고 있습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods -n disco -o wide

```bash
NAME                             READY   STATUS    RESTARTS   AGE   IP
discovery-app-7d8f9c6b5-x1a2b   1/1     Running   0          10m   10.244.1.10
discovery-app-7d8f9c6b5-y3c4d   1/1     Running   0          10m   10.244.2.11
discovery-app-7d8f9c6b5-z5e6f   1/1     Running   0          10m   10.244.3.12
```

### kubectl get svc discovery-svc -n disco -o yaml (발췌)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: discovery-svc
  namespace: disco
spec:
  selector:
    app: discovery
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
  clusterIP: 10.96.45.123
```

### nslookup 결과

```bash
$ kubectl exec deploy/testpod -n disco -- nslookup discovery-svc.disco.svc.cluster.local

Server:    10.96.0.10
Address:   10.96.0.10#53

Name:      discovery-svc.disco.svc.cluster.local
Address:   10.96.45.123
```

## 해설

### 원인 분석

nslookup 결과에서 반환된 IP `10.96.45.123`은 Service의 ClusterIP입니다. 일반 ClusterIP Service는 DNS 조회 시 가상 IP(ClusterIP) 하나만 반환하며, 개별 Pod IP를 반환하지 않습니다.

애플리케이션이 피어 Pod를 각각 발견해야 한다면, Service를 **Headless Service**(clusterIP: None)로 설정해야 합니다. Headless Service는 DNS 조회 시 모든 백엔드 Pod의 개별 IP를 A 레코드로 반환합니다.

### 해결 방법

```bash
# 1. Service를 Headless Service로 변경
# spec.clusterIP: None 설정
kubectl patch svc discovery-svc -n disco -p '{"spec":{"clusterIP":"None"}}'
# 주의: clusterIP는 직접 패치가 안 될 수 있으므로 삭제 후 재생성이 필요

kubectl delete svc discovery-svc -n disco
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: discovery-svc
  namespace: disco
spec:
  clusterIP: None
  selector:
    app: discovery
  ports:
  - port: 80
    targetPort: 8080
EOF

# 2. DNS 조회로 개별 Pod IP가 반환되는지 확인
kubectl exec deploy/testpod -n disco -- nslookup discovery-svc.disco.svc.cluster.local
```

### 실무 팁

Headless Service는 StatefulSet, 분산 데이터베이스, 피어 디스커버리가 필요한 애플리케이션에 필수적입니다. `clusterIP: None`을 설정하면 kube-proxy가 로드밸런싱을 하지 않으므로, 클라이언트 측에서 직접 Pod를 선택하는 로직이 필요합니다.
