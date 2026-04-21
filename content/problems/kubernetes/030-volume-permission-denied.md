---
id: "kubernetes-030"
title: "Volume 쓰기 권한 오류로 컨테이너가 실패하는 문제"
category: "kubernetes"
difficulty: 2
tags: ["volume", "permission", "securitycontext", "fsgroup", "pvc"]
hints:
  - "컨테이너 로그에서 어떤 파일/디렉터리에 대한 권한 오류인지 확인하세요."
  - "컨테이너가 실행되는 사용자(UID)와 볼륨의 소유권을 비교하세요."
  - "Pod의 securityContext에서 fsGroup 설정을 확인해 보세요."
---

## 상황

PostgreSQL을 Kubernetes에 배포했는데, Pod가 시작 직후 CrashLoopBackOff에 빠집니다. PVC는 정상적으로 바인딩되어 있고 이전에는 root로 실행할 때 문제없이 동작했습니다. 보안 정책에 따라 non-root 사용자로 변경한 뒤 문제가 발생했습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl logs postgres-0 출력

```log
PostgreSQL Database directory appears to contain a database; Skipping initialization

2025-01-20 10:30:01.123 UTC [1] FATAL:  data directory "/var/lib/postgresql/data" has wrong ownership
2025-01-20 10:30:01.123 UTC [1] HINT:  The server must be started by the user that owns the data directory.
2025-01-20 10:30:01.124 UTC [1] LOG:  database system is shut down

chmod: changing permissions of '/var/lib/postgresql/data': Operation not permitted
```

### StatefulSet 스펙 (발췌)

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsUser: 999
        runAsGroup: 999
      containers:
      - name: postgres
        image: postgres:16
        volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: pgdata
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### 볼륨 파일 시스템 확인 (임시 디버그 Pod)

```bash
$ ls -la /var/lib/postgresql/
total 12
drwxr-xr-x 3 root root 4096 Jan 15 08:00 .
drwxr-xr-x 1 root root 4096 Jan 20 10:30 ..
drwx------ 19 root root 4096 Jan 15 08:00 data
```

## 해설

### 원인 분석

이전에 root(UID 0)로 실행하며 생성된 데이터 디렉터리의 소유자가 `root:root`입니다. 보안 정책 적용 후 `runAsUser: 999`로 변경했지만, 기존 PVC에 이미 root 소유의 파일이 존재합니다.

PostgreSQL은 데이터 디렉터리의 소유자와 실행 사용자가 일치해야 하며, UID 999로 실행되는 컨테이너가 root 소유 디렉터리에 접근하려 하니 권한 오류가 발생합니다. `securityContext`에 `fsGroup` 설정이 없어 볼륨 마운트 시 그룹 소유권 변경도 이루어지지 않습니다.

### 해결 방법

```bash
# 1. StatefulSet에 fsGroup 추가
kubectl edit statefulset postgres

# securityContext에 fsGroup 추가:
#   securityContext:
#     runAsUser: 999
#     runAsGroup: 999
#     fsGroup: 999

# 2. 기존 데이터 디렉터리 소유권 변경 (initContainer 사용)
# spec.template.spec에 initContainers 추가:
#   initContainers:
#   - name: fix-permissions
#     image: busybox
#     command: ["sh", "-c", "chown -R 999:999 /var/lib/postgresql/data"]
#     securityContext:
#       runAsUser: 0
#     volumeMounts:
#     - name: pgdata
#       mountPath: /var/lib/postgresql/data

# 3. Pod 재시작 후 정상 동작 확인
kubectl rollout status statefulset postgres
kubectl logs postgres-0
```

### 실무 팁

non-root 사용자로 전환할 때는 기존 볼륨의 파일 소유권을 반드시 확인하세요. `fsGroup`을 설정하면 마운트된 볼륨의 그룹 소유권이 자동으로 변경되지만, 기존 파일의 user 소유권까지 바꾸지는 않습니다. 초기 마이그레이션 시 initContainer로 `chown`을 실행하고, 이후에는 `fsGroup`만으로 유지 가능합니다.
