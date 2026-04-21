---
id: "kubernetes-032"
title: "nodeAffinity 라벨 불일치로 Pod가 Pending 상태인 문제"
category: "kubernetes"
difficulty: 2
tags: ["node-affinity", "scheduling", "pending", "node-labels"]
hints:
  - "kubectl describe pod에서 스케줄링 실패 메시지를 확인하세요."
  - "Pod의 nodeAffinity 규칙에서 요구하는 라벨과 실제 노드 라벨을 비교하세요."
  - "kubectl get nodes --show-labels로 노드에 어떤 라벨이 있는지 확인하세요."
---

## 상황

ML 추론 서비스를 GPU 노드에 배포하기 위해 nodeAffinity를 설정했는데, Pod가 계속 Pending 상태입니다. 클러스터에 GPU가 장착된 노드가 분명히 있는데 스케줄링되지 않습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods 출력

```bash
NAME                           READY   STATUS    RESTARTS   AGE
ml-inference-6f8d9c4b7-x2k5n  0/1     Pending   0          12m
```

### kubectl describe pod ml-inference-6f8d9c4b7-x2k5n (Events 발췌)

```log
Events:
  Type     Reason            Age                From               Message
  ----     ------            ----               ----               -------
  Warning  FailedScheduling  8s (x15 over 12m)  default-scheduler  0/4 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 3 node(s) didn't match Pod's node affinity/selector.
```

### Deployment 스펙 (발췌)

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: gpu-type
                operator: In
                values:
                - nvidia-a100
      containers:
      - name: inference
        image: registry.example.com/ml-inference:v1.0
        resources:
          limits:
            nvidia.com/gpu: 1
```

### kubectl get nodes --show-labels (라벨 발췌)

```bash
NAME          STATUS   ROLES           LABELS
control-01    Ready    control-plane   node-role.kubernetes.io/control-plane=
worker-01     Ready    <none>          accelerator=nvidia-a100,node-pool=gpu
worker-02     Ready    <none>          accelerator=nvidia-a100,node-pool=gpu
worker-03     Ready    <none>          node-pool=general
```

## 해설

### 원인 분석

Pod의 nodeAffinity는 `gpu-type=nvidia-a100` 라벨을 가진 노드를 요구하고 있습니다. 그런데 실제 GPU 노드(worker-01, worker-02)의 라벨은 `accelerator=nvidia-a100`입니다.

**라벨의 key가 다릅니다**: Pod는 `gpu-type`을 찾고 있지만, 노드에는 `accelerator`로 설정되어 있습니다. `requiredDuringSchedulingIgnoredDuringExecution`은 필수 조건이므로, 매칭되는 노드가 없으면 Pod는 영원히 Pending 상태로 남습니다.

### 해결 방법

```bash
# 방법 1: Deployment의 nodeAffinity를 실제 노드 라벨에 맞게 수정
kubectl edit deployment ml-inference
# matchExpressions의 key를 수정:
#   - key: accelerator    # gpu-type → accelerator
#     operator: In
#     values:
#     - nvidia-a100

# 방법 2: 노드에 라벨을 추가하는 방법 (Deployment 수정이 어려운 경우)
kubectl label node worker-01 gpu-type=nvidia-a100
kubectl label node worker-02 gpu-type=nvidia-a100

# 3. Pod 스케줄링 확인
kubectl get pods -w
```

### 실무 팁

nodeAffinity 설정 전에 반드시 `kubectl get nodes --show-labels`로 실제 노드 라벨을 확인하세요. 팀 내에서 노드 라벨 네이밍 규칙을 문서화하고, Helm chart나 Kustomize에서 nodeAffinity의 key를 변수로 관리하면 환경별 라벨 차이로 인한 문제를 예방할 수 있습니다.
