---
id: "kubernetes-003"
title: "Namespace가 존재하지 않아 배포 실패"
category: "kubernetes"
difficulty: 1
tags: ["namespace", "deployment", "kubectl"]
hints:
  - "에러 메시지에서 어떤 리소스를 찾을 수 없다고 하는지 확인하세요."
  - "Deployment가 배포될 대상 Namespace가 클러스터에 실제로 존재하는지 확인하세요."
---

## 상황

신규 프로젝트를 위해 애플리케이션을 배포하려고 `kubectl apply` 명령을 실행했지만 에러가 발생하며 배포되지 않습니다. 제공된 매니페스트와 에러 메시지를 분석하여 원인을 찾고 해결하세요.

## 데이터

### kubectl apply -f app-deployment.yaml 출력

```bash
Error from server (NotFound): error when creating "app-deployment.yaml": namespaces "playground" not found
```

### app-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  namespace: playground
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
      - name: app
        image: nginx:1.24
        ports:
        - containerPort: 80
```

### kubectl get namespaces

```bash
NAME              STATUS   AGE
default           Active   30d
kube-system       Active   30d
kube-public       Active   30d
kube-node-lease   Active   30d
```

## 해설

### 원인 분석

에러 메시지 `namespaces "playground" not found`가 핵심입니다. Deployment 매니페스트에서 `namespace: playground`를 지정했지만, 클러스터에 해당 Namespace가 존재하지 않습니다. `kubectl get namespaces` 출력을 보면 기본 Namespace들만 존재하고 `playground`는 없는 것을 확인할 수 있습니다.

Kubernetes에서 리소스를 특정 Namespace에 생성하려면, 해당 Namespace가 먼저 존재해야 합니다.

### 해결 방법

```bash
# 1. playground Namespace 생성
kubectl create namespace playground

# 2. Namespace 생성 확인
kubectl get namespace playground

# 3. 다시 Deployment 배포
kubectl apply -f app-deployment.yaml

# 4. Pod 상태 확인
kubectl get pods -n playground
```

### 실무 팁

Namespace를 포함한 모든 리소스를 하나의 매니페스트 디렉터리에서 관리하면 이런 누락을 방지할 수 있습니다. Helm이나 Kustomize를 사용할 경우 Namespace 리소스를 함께 정의하거나, `createNamespace` 옵션을 활용하세요.
