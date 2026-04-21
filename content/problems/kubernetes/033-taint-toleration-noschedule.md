---
id: "kubernetes-033"
title: "Taint가 설정된 노드에 Pod가 스케줄링되지 않는 문제"
category: "kubernetes"
difficulty: 2
tags: ["taint", "toleration", "scheduling", "noschedule", "dedicated-node"]
hints:
  - "kubectl describe node에서 Taints 항목을 확인하세요."
  - "스케줄링 실패 메시지의 'untolerated taint'를 주목하세요."
  - "Pod에 해당 taint를 허용하는 toleration을 추가해야 합니다."
---

## 상황

클러스터에 노드 3대가 있고, 데이터 처리 전용 노드에 taint를 설정해 일반 워크로드가 스케줄링되지 않도록 했습니다. 그런데 데이터 처리 파이프라인 Pod조차 스케줄링되지 않아 Pending 상태입니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods 출력

```bash
NAME                                READY   STATUS    RESTARTS   AGE
data-pipeline-6d8f9c4b7-k3m2n      0/1     Pending   0          8m
data-pipeline-6d8f9c4b7-r8n5p      0/1     Pending   0          8m
```

### kubectl describe pod data-pipeline-6d8f9c4b7-k3m2n (Events 발췌)

```log
Events:
  Type     Reason            Age                From               Message
  ----     ------            ----               ----               -------
  Warning  FailedScheduling  5s (x12 over 8m)   default-scheduler  0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 node(s) had untolerated taint {workload: data-processing}.
```

### kubectl describe node worker-01 (Taints 발췌)

```bash
Taints:   workload=data-processing:NoSchedule
```

### Deployment 스펙 (발췌)

```yaml
spec:
  template:
    spec:
      nodeSelector:
        node-pool: data
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "data"
        effect: "NoSchedule"
      containers:
      - name: pipeline
        image: registry.example.com/data-pipeline:v2.1
```

### kubectl get nodes --show-labels (발췌)

```bash
NAME          TAINTS                                       LABELS
control-01    node-role.kubernetes.io/control-plane:NoSchedule   ...
worker-01     workload=data-processing:NoSchedule          node-pool=data
worker-02     workload=data-processing:NoSchedule          node-pool=data
```

## 해설

### 원인 분석

스케줄링 실패 메시지에서 `untolerated taint {workload: data-processing}`이 핵심입니다.

노드의 taint value는 `data-processing`이지만, Pod의 toleration value는 `data`입니다. `operator: Equal`은 key와 value가 **정확히 일치**해야 매칭됩니다. `data`와 `data-processing`은 다른 값이므로 toleration이 taint를 허용하지 못하고, Pod가 스케줄링되지 않습니다.

nodeSelector `node-pool: data`는 올바르게 설정되어 있지만, taint 허용이 먼저 통과해야 스케줄링이 진행됩니다.

### 해결 방법

```bash
# 1. Deployment의 toleration value를 실제 taint value와 일치시킴
kubectl edit deployment data-pipeline

# tolerations 수정:
#   tolerations:
#   - key: "workload"
#     operator: "Equal"
#     value: "data-processing"   # data → data-processing
#     effect: "NoSchedule"

# 2. Pod 스케줄링 확인
kubectl get pods -w

# 3. 정상 동작 확인
kubectl get pods -o wide
```

### 실무 팁

Taint와 toleration에서 value 불일치는 찾기 어려운 실수입니다. `operator: Exists`를 사용하면 value를 비교하지 않고 key만 매칭하므로 더 유연하지만, 보안상 정확한 매칭이 필요할 때는 `Equal`을 사용하세요. taint 설정 시 팀 위키에 정확한 key-value 쌍을 문서화하면 이런 불일치를 예방할 수 있습니다.
