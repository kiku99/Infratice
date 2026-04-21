---
id: "kubernetes-024"
title: "Init Container가 완료되지 않아 Pod가 시작되지 않는 문제"
category: "kubernetes"
difficulty: 1
tags: ["init-container", "pending", "pod", "debugging"]
hints:
  - "kubectl describe pod 출력에서 Init Containers 섹션의 State를 확인하세요."
  - "Init Container의 로그를 확인해 어떤 명령이 실행 중인지 살펴보세요."
  - "Init Container가 대기하는 대상 서비스가 실제로 존재하는지 확인하세요."
---

## 상황

신규 마이크로서비스를 배포했는데 Pod가 `Init:0/1` 상태에서 멈춰 있습니다. 메인 컨테이너가 시작되지 않아 서비스 전체가 동작하지 않습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods 출력

```bash
NAME                            READY   STATUS     RESTARTS   AGE
order-service-5c8d7f9b6-tn4k2  0/1     Init:0/1   0          8m
order-service-5c8d7f9b6-gx7m3  0/1     Init:0/1   0          8m
```

### kubectl describe pod order-service-5c8d7f9b6-tn4k2 (발췌)

```yaml
Init Containers:
  wait-for-db:
    Image:   busybox:1.36
    Command:
      - sh
      - -c
      - until nslookup postgres-primary.database.svc.cluster.local; do echo "Waiting for DB..."; sleep 2; done
    State:       Running
      Started:   Mon, 20 Jan 2025 09:10:00 +0000
    Ready:       False
Containers:
  order-api:
    Image:   registry.example.com/order-service:v3.0.1
    State:   Waiting
      Reason: PodInitializing
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  8m    default-scheduler  Successfully assigned default/order-service-5c8d7f9b6-tn4k2
  Normal  Pulled     8m    kubelet            Container image "busybox:1.36" already present on machine
  Normal  Created    8m    kubelet            Created container wait-for-db
  Normal  Started    8m    kubelet            Started container wait-for-db
```

### kubectl logs order-service-5c8d7f9b6-tn4k2 -c wait-for-db (최근 출력)

```log
Server:    10.96.0.10
Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local

nslookup: can't resolve 'postgres-primary.database.svc.cluster.local'
Waiting for DB...
nslookup: can't resolve 'postgres-primary.database.svc.cluster.local'
Waiting for DB...
nslookup: can't resolve 'postgres-primary.database.svc.cluster.local'
Waiting for DB...
```

### kubectl get svc -n database 출력

```bash
NAME              TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
postgres-main     ClusterIP   10.96.45.120   <none>        5432/TCP   30d
```

## 해설

### 원인 분석

Init Container `wait-for-db`는 `postgres-primary.database.svc.cluster.local` DNS가 해석될 때까지 무한 대기하도록 설정되어 있습니다. 그러나 `database` 네임스페이스의 실제 Service 이름은 `postgres-main`이지 `postgres-primary`가 아닙니다.

Init Container가 존재하지 않는 Service를 찾고 있어 DNS 조회가 계속 실패하고, Init Container가 영원히 완료되지 않으므로 메인 컨테이너도 시작되지 않습니다.

### 해결 방법

```bash
# 1. database 네임스페이스의 실제 Service 이름 확인
kubectl get svc -n database

# 2. Deployment의 Init Container 명령을 올바른 서비스 이름으로 수정
kubectl edit deployment order-service
# Init Container의 nslookup 대상을 수정:
# postgres-primary.database.svc.cluster.local
# → postgres-main.database.svc.cluster.local

# 3. 롤아웃 상태 확인
kubectl rollout status deployment order-service

# 4. Pod가 정상 Running인지 확인
kubectl get pods
```

### 실무 팁

Init Container로 의존 서비스 대기 패턴을 구현할 때는, 서비스 이름을 하드코딩하지 말고 환경 변수나 ConfigMap으로 관리하세요. 또한 무한 대기 대신 타임아웃을 설정하면(`timeout 120 sh -c 'until ...'`) Init Container가 영원히 멈추는 것을 방지할 수 있습니다.
