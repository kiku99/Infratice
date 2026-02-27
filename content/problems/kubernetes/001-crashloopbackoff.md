---
id: "kubernetes-001"
title: "Pod CrashLoopBackOff 상태 디버깅"
category: "kubernetes"
difficulty: 2
tags: ["pod", "crashloopbackoff", "logs", "describe"]
hints:
  - "kubectl describe pod 출력의 Events 섹션과 Last State를 확인하세요."
  - "컨테이너가 종료된 이유(Exit Code)를 분석해 보세요."
  - "환경 변수와 ConfigMap 설정이 올바른지 검토하세요."
---

## 상황

프로덕션 클러스터에 새 버전의 API 서버를 배포했더니 Pod가 `CrashLoopBackOff` 상태에 빠졌습니다. 이전 버전은 정상적으로 동작하고 있었습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods 출력

```bash
NAME                          READY   STATUS             RESTARTS      AGE
api-server-7d4f8b6c9-x2k8p   0/1     CrashLoopBackOff   5 (30s ago)   3m
api-server-7d4f8b6c9-m9n3q   0/1     CrashLoopBackOff   5 (28s ago)   3m
api-server-6b5c9d8f7-j4h2l   1/1     Running             0             2d
```

### kubectl describe pod api-server-7d4f8b6c9-x2k8p (발췌)

```yaml
Containers:
  api:
    Image:       registry.example.com/api-server:v2.1.0
    Port:        8080/TCP
    Environment:
      DB_HOST:       <set to the key 'host' in secret 'db-credentials'>
      DB_PORT:       <set to the key 'port' in secret 'db-credentials'>
      DB_NAME:       <set to the key 'name' of config map 'api-config'>
      REDIS_URL:     <set to the key 'redis_url' of config map 'api-config'>
      NEW_FEATURE:   <set to the key 'new_feature_flag' of config map 'api-config'>  OPTIONAL: optional
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Error
      Exit Code:    1
      Started:      Mon, 15 Jan 2024 10:25:00 +0000
      Finished:     Mon, 15 Jan 2024 10:25:02 +0000
Events:
  Type     Reason     Age                   From               Message
  ----     ------     ----                  ----               -------
  Normal   Scheduled  3m                    default-scheduler  Successfully assigned default/api-server-7d4f8b6c9-x2k8p
  Normal   Pulled     65s (x5 over 3m)      kubelet            Container image pulled
  Normal   Created    65s (x5 over 3m)      kubelet            Created container api
  Normal   Started    65s (x5 over 3m)      kubelet            Started container api
  Warning  BackOff    22s (x10 over 2m50s)  kubelet            Back-off restarting failed container
```

### kubectl logs api-server-7d4f8b6c9-x2k8p 출력

```log
2024-01-15T10:25:00Z [INFO]  Starting API server v2.1.0...
2024-01-15T10:25:01Z [INFO]  Connecting to database at db-primary.internal:5432...
2024-01-15T10:25:01Z [INFO]  Database connection established.
2024-01-15T10:25:01Z [INFO]  Connecting to Redis at redis-master.internal:6379...
2024-01-15T10:25:02Z [INFO]  Redis connection established.
2024-01-15T10:25:02Z [ERROR] Failed to load configuration: required environment variable "CACHE_TTL" is not set
2024-01-15T10:25:02Z [FATAL] Application startup failed. Exiting.
```

## 해설

### 원인 분석

Pod 로그의 마지막 부분에서 핵심 원인을 확인할 수 있습니다:

> `Failed to load configuration: required environment variable "CACHE_TTL" is not set`

v2.1.0에서 새로 추가된 기능이 `CACHE_TTL` 환경 변수를 필수로 요구하지만, ConfigMap(`api-config`)에 해당 키가 추가되지 않았습니다. 애플리케이션은 시작 시 필수 환경 변수 검증에 실패하여 Exit Code 1로 종료되고, Kubernetes가 반복 재시작을 시도하며 `CrashLoopBackOff`에 빠진 것입니다.

### 해결 방법

```bash
# 1. ConfigMap에 누락된 환경 변수 추가
kubectl edit configmap api-config
# 또는 패치 명령:
kubectl patch configmap api-config --type merge \
  -p '{"data":{"cache_ttl":"300"}}'

# 2. Deployment에 환경 변수 매핑 추가
kubectl edit deployment api-server
# env 섹션에 추가:
#   - name: CACHE_TTL
#     valueFrom:
#       configMapKeyRef:
#         name: api-config
#         key: cache_ttl

# 3. 롤아웃 재시작
kubectl rollout restart deployment api-server

# 4. 정상 동작 확인
kubectl rollout status deployment api-server
kubectl get pods -l app=api-server
```

### 실무 팁

새 버전 배포 시 필요한 환경 변수가 추가되었다면, 배포 매니페스트와 ConfigMap/Secret을 함께 업데이트해야 합니다. Helm이나 Kustomize를 사용하면 이를 하나의 릴리스로 관리할 수 있어 누락을 방지할 수 있습니다. 또한 애플리케이션에서 선택적(optional) 환경 변수에는 기본값을 설정하는 것이 안정적입니다.
