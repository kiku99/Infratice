---
id: "kubernetes-009"
title: "PVC 용량 확장이 거부되는 문제"
category: "kubernetes"
difficulty: 1
tags: ["pvc", "storageclass", "volume-expansion", "persistent-volume"]
hints:
  - "에러 메시지에서 어떤 종류의 PVC만 resize 가능하다고 하는지 확인하세요."
  - "StorageClass의 `provisioner`와 `allowVolumeExpansion` 설정을 함께 확인해 보세요."
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

에러 메시지의 핵심은 `only dynamically provisioned pvc can be resized`입니다. 현재 PVC가 사용하는 StorageClass `expandable-sc`는 `provisioner: kubernetes.io/no-provisioner`로 설정되어 있어, 동적 프로비저닝 기반 스토리지가 아니라 정적 PV를 전제로 한 구성입니다.

즉 이 PVC는 Kubernetes가 일반적인 방식으로 용량 확장을 처리할 수 있는 유형이 아닙니다. 또한 StorageClass에 `allowVolumeExpansion: true`도 보이지 않으므로, 설령 확장을 지원하는 프로비저너를 쓰더라도 현재 설정만으로는 resize가 허용되지 않습니다. 따라서 문제의 본질은 단순히 `allowVolumeExpansion` 누락 하나가 아니라, **현재 스토리지 클래스가 PVC 확장 워크플로와 맞지 않는 구성**이라는 점입니다.

### 해결 방법

```bash
# 1. 현재 StorageClass가 동적 프로비저닝/확장을 지원하는지 확인
kubectl get storageclass expandable-sc -o yaml

# 2. 확장이 필요한 경우, volume expansion을 지원하는 CSI StorageClass 준비
# 예: allowVolumeExpansion: true 가 설정된 CSI 기반 StorageClass 사용

# 3. 새 PVC를 더 큰 크기로 생성
kubectl apply -f new-data-pvc.yaml

# 4. 기존 PVC의 데이터를 새 PVC로 마이그레이션
# (예: 임시 Pod를 띄워 rsync 또는 cp로 데이터 복사)

# 5. 워크로드가 새 PVC를 사용하도록 수정 후 배포
kubectl apply -f app-with-new-pvc.yaml
```

### 실무 팁

PVC 확장은 `allowVolumeExpansion: true`만으로 충분하지 않고, 사용하는 프로비저너 자체가 볼륨 확장을 지원해야 합니다. `kubernetes.io/no-provisioner`처럼 정적 볼륨 전제 구성에서는 새 PV/PVC를 만들어 마이그레이션해야 하는 경우가 많습니다. 운영 환경에서는 처음부터 확장 가능한 CSI StorageClass를 표준으로 정해 두는 것이 좋습니다.
