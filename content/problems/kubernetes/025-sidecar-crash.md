---
id: "kubernetes-025"
title: "사이드카 컨테이너 크래시로 Pod 전체가 불안정한 문제"
category: "kubernetes"
difficulty: 2
tags: ["sidecar", "multi-container", "crashloopbackoff", "logs"]
hints:
  - "Pod 안에 컨테이너가 여러 개일 때 kubectl logs -c 옵션으로 특정 컨테이너 로그를 확인하세요."
  - "사이드카 컨테이너의 마운트 경로와 메인 컨테이너의 로그 경로가 일치하는지 확인하세요."
  - "사이드카가 참조하는 볼륨이 Pod 스펙에 정의되어 있는지 살펴보세요."
---

## 상황

로그 수집을 위해 Fluentd 사이드카를 추가한 뒤 Pod가 반복적으로 재시작됩니다. 메인 애플리케이션 컨테이너는 정상이지만 사이드카 컨테이너가 CrashLoopBackOff 상태입니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods 출력

```bash
NAME                          READY   STATUS             RESTARTS      AGE
web-app-6f9d8c4b7-r2p5k      1/2     CrashLoopBackOff   4 (18s ago)   3m
```

### kubectl describe pod web-app-6f9d8c4b7-r2p5k (발췌)

```yaml
Containers:
  app:
    Image:       nginx:1.25
    State:       Running
    Ready:       True
    Mounts:
      /var/log/nginx from app-logs (rw)
  log-collector:
    Image:       fluent/fluentd:v1.16
    State:       Waiting
      Reason:    CrashLoopBackOff
    Last State:  Terminated
      Reason:    Error
      Exit Code: 1
    Mounts:
      /var/log/app from nginx-logs (ro)
Volumes:
  app-logs:
    Type: EmptyDir
Events:
  Warning  BackOff  12s (x8 over 2m40s)  kubelet  Back-off restarting failed container log-collector
```

### kubectl logs web-app-6f9d8c4b7-r2p5k -c log-collector

```log
2025-01-20 09:15:01 +0000 [info]: init supervisor logger path=nil rotate_age=nil rotate_size=nil
2025-01-20 09:15:01 +0000 [info]: parsing config file is succeeded path="/fluentd/etc/fluent.conf"
2025-01-20 09:15:01 +0000 [error]: config error file="/fluentd/etc/fluent.conf" error_class=Errno::ENOENT error="No such file or directory @ rb_sysopen - /var/log/app/access.log"
2025-01-20 09:15:01 +0000 [error]: Worker 0 finished with error. Shutting down.
```

## 해설

### 원인 분석

두 가지 문제가 동시에 발생하고 있습니다.

1. **볼륨 이름 불일치**: 메인 컨테이너 `app`은 `app-logs` 볼륨을 `/var/log/nginx`에 마운트하고 있지만, 사이드카 `log-collector`는 `nginx-logs`라는 **존재하지 않는 볼륨**을 마운트하려 합니다. Pod 스펙의 Volumes에는 `app-logs`만 정의되어 있습니다.

2. **경로 불일치**: 메인 컨테이너는 `/var/log/nginx`에 로그를 쓰고, 사이드카는 `/var/log/app`에서 읽으려 합니다. 같은 볼륨을 공유하더라도 경로가 달라 파일을 찾지 못합니다.

결과적으로 사이드카가 로그 파일을 찾지 못해 시작 직후 크래시합니다.

### 해결 방법

```bash
# 1. Deployment 수정
kubectl edit deployment web-app

# 사이드카의 볼륨 마운트를 수정:
# - 볼륨 이름: nginx-logs → app-logs (실제 존재하는 볼륨)
# - 마운트 경로: /var/log/app → /var/log/nginx (메인 컨테이너와 동일)

# 수정 후 사이드카 컨테이너 스펙:
#   volumeMounts:
#     - name: app-logs        # 올바른 볼륨 이름
#       mountPath: /var/log/nginx  # 메인 컨테이너와 동일한 경로
#       readOnly: true

# 2. Fluentd 설정도 경로에 맞게 확인
# fluent.conf의 path가 /var/log/nginx/access.log를 가리키도록 수정

# 3. 롤아웃 확인
kubectl rollout status deployment web-app
kubectl get pods
```

### 실무 팁

멀티 컨테이너 Pod에서 볼륨을 공유할 때는 모든 컨테이너가 **동일한 볼륨 이름**을 참조하는지 반드시 확인하세요. 또한 Fluentd 같은 로그 수집기 사이드카는 경로가 없을 때 즉시 종료하지 않도록 `read_from_head true`와 `follow_inodes true` 옵션을 설정하는 것이 안정적입니다.
