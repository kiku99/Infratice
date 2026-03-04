---
id: "kubernetes-018"
title: "StatefulSet Pod 간 DNS 이름 해석이 안되는 문제"
category: "kubernetes"
difficulty: 2
tags: ["statefulset", "headless-service", "dns", "stable-network-identity"]
hints:
  - "StatefulSet Pod의 안정적인 DNS 이름이 어떤 형식인지 확인하세요."
  - "StatefulSet이 DNS 이름을 얻으려면 어떤 종류의 Service가 필요한지 생각해 보세요."
  - "StatefulSet의 `serviceName` 필드와 실제 Service 이름이 일치하는지 확인하세요."
---

## 상황

`dev` Namespace에 분산 데이터베이스 `dns-app`을 StatefulSet으로 배포했습니다. 각 Pod가 `dns-app-0.dns-app`과 같은 안정적인 DNS 이름으로 서로를 찾아야 하지만, DNS 조회가 실패합니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods -n dev

```bash
NAME        READY   STATUS    RESTARTS   AGE
dns-app-0   1/1     Running   0          5m
dns-app-1   1/1     Running   0          4m
dns-app-2   1/1     Running   0          3m
netshoot    1/1     Running   0          10m
```

### DNS 조회 테스트

```bash
$ kubectl exec -it netshoot -n dev -- nslookup dns-app-0.dns-app.dev.svc.cluster.local

Server:    10.96.0.10
Address:   10.96.0.10#53

** server can't find dns-app-0.dns-app.dev.svc.cluster.local: NXDOMAIN
```

### kubectl get svc -n dev

```bash
NAME      TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
dns-app   ClusterIP   10.96.78.123   <none>        80/TCP    5m
```

### kubectl get svc dns-app -n dev -o yaml (발췌)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dns-app
  namespace: dev
spec:
  selector:
    app: dns-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
  clusterIP: 10.96.78.123
```

### kubectl get statefulset dns-app -n dev -o yaml (발췌)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: dns-app
  namespace: dev
spec:
  serviceName: dns-app
  replicas: 3
  selector:
    matchLabels:
      app: dns-app
  template:
    metadata:
      labels:
        app: dns-app
    spec:
      containers:
      - name: app
        image: nginx:alpine
        ports:
        - containerPort: 80
```

## 해설

### 원인 분석

DNS 조회 시 `NXDOMAIN`(도메인 없음)이 반환됩니다. StatefulSet의 `serviceName: dns-app`은 올바르게 설정되어 있고 `dns-app` Service도 존재합니다. 하지만 Service의 `clusterIP: 10.96.78.123`으로 보아 일반 ClusterIP Service입니다.

StatefulSet Pod가 `<pod-name>.<service-name>` 형태의 안정적인 DNS 이름을 가지려면, 반드시 **Headless Service** (`clusterIP: None`)여야 합니다. 일반 ClusterIP Service는 개별 Pod에 대한 DNS A 레코드를 생성하지 않습니다.

### 해결 방법

```bash
# 1. 기존 Service 삭제
kubectl delete svc dns-app -n dev

# 2. Headless Service로 재생성
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: dns-app
  namespace: dev
spec:
  clusterIP: None
  selector:
    app: dns-app
  ports:
  - port: 80
    targetPort: 80
EOF

# 3. StatefulSet Pod 재시작 (DNS 레코드 갱신)
kubectl rollout restart statefulset dns-app -n dev

# 4. DNS 이름 해석 확인
kubectl exec -it netshoot -n dev -- nslookup dns-app-0.dns-app.dev.svc.cluster.local
```

### 실무 팁

StatefulSet을 사용할 때는 항상 `clusterIP: None`인 Headless Service와 함께 배포하세요. StatefulSet의 `serviceName` 필드는 이 Headless Service의 이름과 정확히 일치해야 합니다. 이를 통해 각 Pod는 `<pod-name>.<service-name>.<namespace>.svc.cluster.local` 형태의 예측 가능한 DNS 이름을 갖게 됩니다.
