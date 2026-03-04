---
id: "kubernetes-010"
title: "Pod가 OOMKilled로 반복 재시작되는 문제"
category: "kubernetes"
difficulty: 2
tags: ["oomkilled", "memory", "limits", "crashloopbackoff"]
hints:
  - "kubectl describe pod에서 Last State의 Reason을 확인하세요."
  - "컨테이너의 메모리 limits 값과 실제 애플리케이션이 사용하는 메모리를 비교해 보세요."
  - "Exit Code 137은 어떤 의미인지 조사해 보세요."
---

## 상황

`apps` Namespace에서 메모리 집약적인 애플리케이션 `oom-demo`가 `CrashLoopBackOff` 상태에 빠져 있습니다. Pod가 시작되자마자 곧바로 종료되며 반복 재시작됩니다. 제공된 정보를 분석하여 원인을 확인하고 해결하세요.

## 데이터

### kubectl get pods -n apps

```bash
NAME       READY   STATUS             RESTARTS      AGE
oom-demo   0/1     CrashLoopBackOff   5 (30s ago)   4m
```

### kubectl describe pod oom-demo -n apps (발췌)

```yaml
Containers:
  stress:
    Image:       polinux/stress
    Command:     ["stress", "--vm", "1", "--vm-bytes", "50M", "--timeout", "60"]
    Limits:
      memory:  20Mi
    Requests:
      memory:  10Mi
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       OOMKilled
      Exit Code:    137
      Started:      Wed, 15 Jan 2025 10:25:00 +0000
      Finished:     Wed, 15 Jan 2025 10:25:01 +0000
Events:
  Type     Reason     Age                From      Message
  ----     ------     ----               ----      -------
  Normal   Started    30s (x6 over 4m)   kubelet   Started container stress
  Warning  BackOff    10s (x15 over 3m)  kubelet   Back-off restarting failed container
```

### oom-demo-pod.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: oom-demo
  namespace: apps
spec:
  containers:
  - name: stress
    image: polinux/stress
    command: ["stress", "--vm", "1", "--vm-bytes", "50M", "--timeout", "60"]
    resources:
      requests:
        memory: "10Mi"
      limits:
        memory: "20Mi"
```

## 해설

### 원인 분석

`kubectl describe pod`의 `Last State`에서 `Reason: OOMKilled`, `Exit Code: 137`이 핵심 단서입니다. Exit Code 137은 SIGKILL(128+9)을 의미하며, 커널의 OOM Killer에 의해 프로세스가 강제 종료되었음을 나타냅니다.

컨테이너의 `command`에서 `stress --vm-bytes 50M`으로 50MB 메모리를 할당하려 하지만, `resources.limits.memory`가 `20Mi`로 설정되어 있어 컨테이너가 이 한도를 초과하는 순간 커널이 프로세스를 종료합니다.

### 해결 방법

```bash
# 1. Pod 매니페스트에서 메모리 limit을 실제 사용량 이상으로 증가
# resources.limits.memory: "20Mi" → "100Mi"
# resources.requests.memory: "10Mi" → "50Mi"

# 2. 기존 Pod 삭제 후 재배포
kubectl delete pod oom-demo -n apps
kubectl apply -f oom-demo-pod.yaml

# 3. Pod 상태 확인
kubectl get pods oom-demo -n apps

# 4. 메모리 사용량 모니터링
kubectl top pod oom-demo -n apps
```

### 실무 팁

`Exit Code 137`(OOMKilled)이 보이면 메모리 limit이 실제 사용량보다 낮게 설정된 것이 원인입니다. 프로덕션에서는 사전에 부하 테스트를 통해 적절한 메모리 값을 산정하고, Prometheus + Grafana 같은 모니터링 도구로 메모리 사용 추이를 지속 관찰하세요.
