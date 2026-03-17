---
id: "kubernetes-005"
title: "ConfigMap 설정을 Pod에 마운트하지 못하는 원인 분석"
category: "kubernetes"
difficulty: 1
tags: ["configmap", "volume", "mount", "pod"]
hints:
  - "Pod 매니페스트에서 volume과 volumeMount 설정이 서로 올바르게 연결되어 있는지 확인하세요."
  - "`volumeMounts.name`과 `volumes.name`이 정확히 같은지 살펴보세요."
---

## 상황

애플리케이션에 필요한 설정값을 ConfigMap으로 만들어 Pod에 파일로 마운트하려고 합니다. 그런데 Pod 생성 단계에서 설정 마운트가 제대로 연결되지 않습니다. 제공된 ConfigMap과 Pod 매니페스트, 생성 오류를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get configmap settings -o yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: settings
  namespace: default
data:
  MODE: "dev"
  VERSION: "1.0"
```

### config-pod.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-pod
spec:
  containers:
  - name: app
    image: busybox:latest
    command: ["sleep", "3600"]
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-vol
    configMap:
      name: settings
```

### kubectl apply -f config-pod.yaml

```bash
Error from server (Invalid): error when creating "config-pod.yaml":
Pod "config-pod" is invalid: spec.containers[0].volumeMounts[0].name: Not found: "config-volume"
```

## 해설

### 원인 분석

`kubectl apply` 오류에서 핵심은 `volumeMounts[0].name: Not found: "config-volume"`입니다. Pod 매니페스트를 보면 `volumeMounts`에서는 `name: config-volume`을 참조하지만, `volumes` 섹션에서는 `name: config-vol`로 정의되어 있습니다.

즉 ConfigMap 자체가 없는 것이 아니라, `volumeMounts.name`과 `volumes.name`이 서로 달라 Pod가 참조할 볼륨을 찾지 못하는 것이 원인입니다. ConfigMap `settings`는 실제로 존재하므로, 현재 문제는 ConfigMap 내용이 아니라 Pod 매니페스트의 볼륨 이름 불일치입니다.

### 해결 방법

```bash
# 1. Pod 매니페스트에서 volumes의 name을 volumeMounts와 일치시킴
# volumes.name: config-vol → config-volume 으로 수정

# 2. 수정된 매니페스트 다시 적용
kubectl apply -f config-pod.yaml

# 3. Pod 내부에서 마운트된 파일 확인
kubectl exec config-pod -- ls /etc/config
kubectl exec config-pod -- cat /etc/config/MODE
```

### 실무 팁

`volumeMounts.name`과 `volumes.name`은 반드시 동일해야 합니다. YAML을 작성할 때 복사-붙여넣기로 인한 이름 불일치가 자주 발생하므로, `kubectl apply --dry-run=client` 또는 IDE의 YAML 검증 플러그인을 활용하면 배포 전에 이러한 오류를 잡을 수 있습니다.
