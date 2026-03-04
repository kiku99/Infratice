---
id: "kubernetes-009"
title: "PVC 용량 확장이 거부되는 문제"
category: "kubernetes"
difficulty: 1
tags: ["pvc", "storageclass", "volume-expansion", "persistent-volume"]
hints:
  - "에러 메시지에서 어떤 기능이 허용되지 않는다고 하는지 확인하세요."
  - "StorageClass의 `allowVolumeExpansion` 설정을 확인해 보세요."
---

## 상황

운영 중인 애플리케이션의 디스크 사용량이 증가하여 PVC 용량을 `1Gi`에서 `5Gi`로 확장하려고 합니다. `kubectl edit pvc` 명령으로 용량을 수정했지만 에러가 발생합니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl edit pvc data-pvc -n storage 실행 후 에러

```bash
error: persistentvolumeclaims "data-pvc" could not be patched: persistentvolumeclaims "data-pvc" is forbidden: only dynamically provisioned pvc can be resized and the StorageClass that provisions the pvc must support resize
```

### kubectl get pvc -n storage

```bash
NAME       STATUS   VOLUME     CAPACITY   ACCESS MODES   STORAGECLASS    AGE
data-pvc   Bound    pv-abc12   1Gi        RWO            expandable-sc   1d
```

### kubectl get storageclass expandable-sc -o yaml (발췌)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable-sc
provisioner: kubernetes.io/no-provisioner
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

## 해설

### 원인 분석

에러 메시지에서 `StorageClass that provisions the pvc must support resize`가 핵심입니다. StorageClass `expandable-sc`의 YAML을 확인하면 `allowVolumeExpansion` 필드가 설정되어 있지 않습니다. 이 필드가 `true`로 명시되지 않으면 Kubernetes는 해당 StorageClass로 프로비저닝된 PVC의 용량 확장을 거부합니다.

### 해결 방법

```bash
# 1. StorageClass에 allowVolumeExpansion 추가
kubectl patch storageclass expandable-sc -p '{"allowVolumeExpansion": true}'

# 2. PVC 용량 확장
kubectl patch pvc data-pvc -n storage -p '{"spec":{"resources":{"requests":{"storage":"5Gi"}}}}'

# 3. PVC 상태 확인 (Resizing → 완료)
kubectl get pvc data-pvc -n storage

# 4. Pod 내부에서 확장된 용량 확인
kubectl exec app-pod -n storage -- df -h /data
```

### 실무 팁

StorageClass를 생성할 때 `allowVolumeExpansion: true`를 기본으로 포함하는 것이 좋습니다. 다만 모든 프로비저너(provisioner)가 볼륨 확장을 지원하는 것은 아니므로, 사용 중인 스토리지 백엔드의 지원 여부를 확인하세요.
