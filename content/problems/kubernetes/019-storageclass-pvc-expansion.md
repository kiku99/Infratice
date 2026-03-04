---
id: "kubernetes-019"
title: "StorageClass 미설정으로 PVC가 Pending 상태에 머무는 문제"
category: "kubernetes"
difficulty: 2
tags: ["storageclass", "pvc", "persistent-volume", "dynamic-provisioning"]
hints:
  - "PVC의 Events에서 어떤 에러가 발생하는지 확인하세요."
  - "PVC가 요청하는 StorageClass가 클러스터에 존재하는지 확인하세요."
  - "StorageClass가 없으면 동적 프로비저닝이 작동하지 않습니다."
---

## 상황

`storage` Namespace에서 애플리케이션이 사용할 PVC를 생성했지만, PVC가 `Pending` 상태에 머물러 있어 Pod도 시작되지 못하고 있습니다. 제공된 정보를 분석하여 PVC가 바인딩되지 않는 원인을 찾으세요.

## 데이터

### kubectl get pvc -n storage

```bash
NAME         STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
expand-pvc   Pending                                      fast-sc        5m
```

### kubectl describe pvc expand-pvc -n storage (발췌)

```bash
Events:
  Type     Reason                Age                From                         Message
  ----     ------                ----               ----                         -------
  Warning  ProvisioningFailed    10s (x15 over 5m)  persistentvolume-controller  storageclass.storage.k8s.io "fast-sc" not found
```

### kubectl get storageclass

```bash
NAME                 PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
standard (default)   rancher.io/local-path   Delete          WaitForFirstConsumer   false                  30d
```

### expand-pvc.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: expand-pvc
  namespace: storage
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-sc
  resources:
    requests:
      storage: 1Gi
```

## 해설

### 원인 분석

`kubectl describe pvc` Events에서 `storageclass.storage.k8s.io "fast-sc" not found`가 핵심입니다. PVC가 `fast-sc`라는 StorageClass를 요청하지만, 클러스터에는 `standard`라는 StorageClass만 존재합니다. 존재하지 않는 StorageClass를 지정하면 동적 프로비저닝이 작동하지 않아 PVC가 영구적으로 `Pending` 상태에 머물게 됩니다.

### 해결 방법

```bash
# 1. 필요한 StorageClass 생성 (볼륨 확장도 함께 활성화)
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-sc
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF

# 2. PVC 상태 확인 (Pending → Bound)
kubectl get pvc -n storage

# 3. Pod 배포 후 마운트 확인
kubectl apply -f storage-pod.yaml
kubectl get pods -n storage
```

### 실무 팁

클러스터에 기본(default) StorageClass가 설정되어 있다면, PVC에서 `storageClassName`을 생략하면 기본 StorageClass가 자동 적용됩니다. 팀 내에서 사용할 StorageClass를 표준화하고 문서화하면, 잘못된 StorageClass 참조로 인한 PVC Pending 문제를 예방할 수 있습니다.
