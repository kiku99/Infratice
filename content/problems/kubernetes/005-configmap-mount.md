---
id: "kubernetes-005"
title: "ConfigMap 키가 파일로 마운트되지 않는 문제"
category: "kubernetes"
difficulty: 1
tags: ["configmap", "volume", "mount", "pod"]
hints:
  - "Pod 매니페스트에서 volume과 volumeMount 설정이 서로 올바르게 연결되어 있는지 확인하세요."
  - "ConfigMap의 키 이름과 마운트 경로가 일치하는지 살펴보세요."
---

## 상황

애플리케이션에 필요한 설정값을 ConfigMap으로 만들어 Pod에 파일로 마운트하려고 합니다. 그런데 Pod 내부에서 마운트 경로를 확인하면 파일이 비어 있거나 예상한 파일이 없습니다. 제공된 ConfigMap과 Pod 매니페스트를 분석하여 원인을 찾으세요.

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

### kubectl describe pod config-pod (발췌)

```bash
Events:
  Type     Reason       Age   From               Message
  ----     ------       ----  ----               -------
  Normal   Scheduled    10s   default-scheduler  Successfully assigned default/config-pod to node-01
  Warning  FailedMount  5s    kubelet            MountVolume.SetUp failed for volume "config-volume": configMap "settings" not found
```

## 해설

### 원인 분석

`kubectl describe pod`의 Events에서 `MountVolume.SetUp failed for volume "config-volume"` 에러가 발생합니다. Pod 매니페스트를 자세히 보면, `volumeMounts`에서는 `name: config-volume`을 참조하고 있지만, `volumes` 섹션에서는 `name: config-vol`로 정의되어 있습니다. 이름이 불일치(`config-volume` vs `config-vol`)하여 Kubernetes가 볼륨을 찾지 못하는 것입니다.

### 해결 방법

```bash
# 1. Pod 매니페스트에서 volumes의 name을 volumeMounts와 일치시킴
# volumes.name: config-vol → config-volume 으로 수정

# 2. 기존 Pod 삭제 후 재생성
kubectl delete pod config-pod
kubectl apply -f config-pod.yaml

# 3. Pod 내부에서 마운트된 파일 확인
kubectl exec config-pod -- ls /etc/config
kubectl exec config-pod -- cat /etc/config/MODE
```

### 실무 팁

`volumeMounts.name`과 `volumes.name`은 반드시 동일해야 합니다. YAML을 작성할 때 복사-붙여넣기로 인한 이름 불일치가 자주 발생하므로, `kubectl apply --dry-run=client` 또는 IDE의 YAML 검증 플러그인을 활용하면 배포 전에 이러한 오류를 잡을 수 있습니다.
