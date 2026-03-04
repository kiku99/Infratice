---
id: "kubernetes-007"
title: "Pod 리소스 요청 및 제한 미설정으로 인한 Eviction"
category: "kubernetes"
difficulty: 1
tags: ["resources", "requests", "limits", "eviction"]
hints:
  - "kubectl describe node에서 Conditions와 Allocated resources 섹션을 확인하세요."
  - "리소스 requests/limits가 없는 Pod는 노드 자원 부족 시 어떤 QoS 클래스로 분류되는지 생각해 보세요."
---

## 상황

운영 중인 클러스터에서 특정 Pod가 갑자기 `Evicted` 상태가 되어 재시작됩니다. 노드의 메모리가 부족한 것으로 의심되는 상황입니다. 제공된 Pod 매니페스트와 노드 상태를 분석하여 원인을 찾고 해결하세요.

## 데이터

### kubectl get pods

```bash
NAME           READY   STATUS    RESTARTS   AGE
resource-pod   0/1     Evicted   0          10m
```

### kubectl describe pod resource-pod (발췌)

```bash
Status:    Failed
Reason:    Evicted
Message:   The node was low on resource: memory.
QoS Class: BestEffort
```

### resource-pod.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-pod
spec:
  containers:
  - name: app
    image: nginx:latest
    ports:
    - containerPort: 80
```

### kubectl describe node node-01 (발췌)

```bash
Conditions:
  Type               Status   Reason
  ----               ------   ------
  MemoryPressure     True     KubeletHasInsufficientMemory
  DiskPressure       False    KubeletHasNoDiskPressure
  PIDPressure        False    KubeletHasSufficientPID
  Ready              True     KubeletReady

Allocated resources:
  Resource           Requests    Limits
  --------           --------    ------
  cpu                1800m (90%) 3200m (160%)
  memory             3.5Gi (87%) 5Gi (125%)
```

## 해설

### 원인 분석

`kubectl describe pod`에서 `QoS Class: BestEffort`와 `The node was low on resource: memory`가 핵심입니다. Pod 매니페스트에 `resources.requests`와 `resources.limits`가 전혀 설정되지 않아 QoS 클래스가 `BestEffort`(가장 낮은 우선순위)로 분류됩니다. 노드에 메모리 압박(`MemoryPressure: True`)이 발생하면 kubelet은 `BestEffort` Pod를 가장 먼저 축출(Evict)합니다.

### 해결 방법

```bash
# 1. Pod 매니페스트에 리소스 요청과 제한 추가
# spec.containers[0].resources:
#   requests:
#     cpu: "100m"
#     memory: "64Mi"
#   limits:
#     cpu: "200m"
#     memory: "128Mi"

# 2. Evicted Pod 정리 및 재배포
kubectl delete pod resource-pod
kubectl apply -f resource-pod.yaml

# 3. QoS 클래스가 Burstable 또는 Guaranteed로 변경되었는지 확인
kubectl describe pod resource-pod | grep "QoS Class"
```

### 실무 팁

모든 워크로드에 `resources.requests`와 `resources.limits`를 설정하는 것이 모범 사례입니다. `LimitRange`를 Namespace에 적용하면 리소스 설정을 누락한 Pod에 기본값을 자동 부여할 수 있어, 실수로 인한 `BestEffort` Pod 생성을 방지할 수 있습니다.
