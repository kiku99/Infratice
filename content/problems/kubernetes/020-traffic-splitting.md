---
id: "kubernetes-020"
title: "카나리 배포 시 트래픽 분배가 되지 않는 문제"
category: "kubernetes"
difficulty: 2
tags: ["canary", "deployment", "service", "traffic-splitting", "label"]
hints:
  - "Service의 selector가 어떤 Pod를 선택하는지 확인하세요."
  - "v1과 v2 Deployment의 Pod label이 Service selector와 일치하는지 비교하세요."
  - "Service는 selector에 매칭되는 모든 Pod에 트래픽을 분배합니다."
---

## 상황

`canary` Namespace에서 기존 `app-v1` Deployment에 대해 카나리 배포를 진행하려 합니다. `app-v2` Deployment를 추가 배포하고 Service를 통해 트래픽을 분배하려 했지만, 모든 트래픽이 v1으로만 가고 v2에는 전혀 도달하지 않습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods -n canary --show-labels

```bash
NAME                      READY   STATUS    RESTARTS   AGE   LABELS
app-v1-7d8f9b6c5-a1b2c   1/1     Running   0          1h    app=my-app,version=v1
app-v1-7d8f9b6c5-d3e4f   1/1     Running   0          1h    app=my-app,version=v1
app-v2-5c6d7e8f9-g5h6i   1/1     Running   0          5m    app=my-app-v2,version=v2
```

### kubectl get svc my-app-svc -n canary -o yaml (발췌)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
  namespace: canary
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 80
```

### kubectl get endpoints my-app-svc -n canary

```bash
NAME          ENDPOINTS                         AGE
my-app-svc    10.244.1.10:80,10.244.2.11:80     1h
```

### app-v2-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-v2
  namespace: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app-v2
      version: v2
  template:
    metadata:
      labels:
        app: my-app-v2
        version: v2
    spec:
      containers:
      - name: app
        image: nginx:1.25
        ports:
        - containerPort: 80
```

## 해설

### 원인 분석

Service `my-app-svc`의 selector는 `app: my-app`입니다. v1 Pod의 label은 `app=my-app`이므로 매칭되지만, v2 Pod의 label은 `app=my-app-v2`로 Service selector와 일치하지 않습니다. `kubectl get endpoints` 결과에서도 v1 Pod IP 2개만 등록되어 있고 v2 Pod는 Endpoint에 포함되지 않았습니다.

Kubernetes의 네이티브 카나리 배포에서는 모든 버전의 Pod가 동일한 Service selector와 매칭되는 label을 가져야 합니다. 트래픽 비율은 각 버전의 replica 수로 조절합니다.

### 해결 방법

```bash
# 1. app-v2 Deployment의 Pod label을 Service selector와 일치시킴
# labels.app: my-app-v2 → my-app
# selector.matchLabels.app: my-app-v2 → my-app

# 2. 수정 후 적용
kubectl apply -f app-v2-deployment.yaml

# 3. Endpoint에 v2 Pod가 추가되었는지 확인
kubectl get endpoints my-app-svc -n canary

# 4. 트래픽 분배 테스트 (v1:v2 = 2:1 비율)
for i in $(seq 1 30); do
  kubectl exec deploy/testpod -n canary -- curl -s my-app-svc | grep -o 'v[12]'
done | sort | uniq -c
```

### 실무 팁

Kubernetes 네이티브 카나리 배포는 replica 수로만 트래픽 비율을 조절할 수 있어 세밀한 제어가 어렵습니다. 정밀한 트래픽 분배(예: 5%만 v2로)가 필요하다면 Istio, Linkerd 같은 서비스 메시 또는 Gateway API의 HTTPRoute 가중치를 활용하세요.
