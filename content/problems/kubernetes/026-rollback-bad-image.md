---
id: "kubernetes-026"
title: "잘못된 이미지 배포 후 롤링 업데이트 실패 복구"
category: "kubernetes"
difficulty: 1
tags: ["deployment", "rollback", "rollout", "image", "rolling-update"]
hints:
  - "kubectl rollout status 명령으로 현재 롤아웃 상태를 확인하세요."
  - "kubectl rollout history로 이전 배포 이력을 확인할 수 있습니다."
  - "정상이었던 이전 revision으로 롤백하는 방법을 찾아보세요."
---

## 상황

프로덕션 환경에서 API 서버 이미지를 `v2.4.0`에서 `v2.5.0`으로 업데이트했는데, 새 Pod들이 모두 ImagePullBackOff 상태입니다. 기존 v2.4.0 Pod는 아직 살아 있지만 점차 교체되고 있어 빠른 조치가 필요합니다. 제공된 정보를 분석하여 상황을 파악하세요.

## 데이터

### kubectl get pods -l app=api-server 출력

```bash
NAME                          READY   STATUS             RESTARTS   AGE
api-server-7b8c9d6f5-h4k2n   1/1     Running            0          2d
api-server-7b8c9d6f5-j9m3p   1/1     Running            0          2d
api-server-5a3f8e7d2-w2x4q   0/1     ImagePullBackOff   0          4m
api-server-5a3f8e7d2-v6y8r   0/1     ImagePullBackOff   0          4m
```

### kubectl rollout status deployment/api-server 출력

```log
Waiting for deployment "api-server" rollout to finish: 2 old replicas are pending termination...
```

### kubectl rollout history deployment/api-server 출력

```bash
REVISION  CHANGE-CAUSE
1         initial deployment v2.3.0
2         image update to v2.4.0
3         image update to v2.5.0
```

### kubectl describe pod api-server-5a3f8e7d2-w2x4q (Events 발췌)

```log
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  4m                 default-scheduler  Successfully assigned production/api-server-5a3f8e7d2-w2x4q
  Normal   Pulling    2m (x3 over 4m)    kubelet            Pulling image "registry.example.com/api-server:v2.5.O"
  Warning  Failed     2m (x3 over 4m)    kubelet            Failed to pull image "registry.example.com/api-server:v2.5.O": tag does not exist
  Warning  Failed     2m (x3 over 4m)    kubelet            Error: ImagePullBackOff
```

## 해설

### 원인 분석

Events의 이미지 태그를 주의 깊게 보면 `v2.5.O`로 되어 있습니다. 마지막 문자가 숫자 `0`(영)이 아니라 영문 대문자 `O`입니다. 존재하지 않는 태그이므로 이미지 풀에 실패합니다.

롤링 업데이트 전략에 의해 새 Pod가 Ready가 될 때까지 기존 Pod를 유지하고 있지만, `maxUnavailable` 설정에 따라 기존 Pod도 곧 제거될 수 있어 빠른 롤백이 필요합니다.

### 해결 방법

```bash
# 1. 즉시 이전 정상 버전으로 롤백
kubectl rollout undo deployment/api-server --to-revision=2

# 2. 롤백 완료 확인
kubectl rollout status deployment/api-server

# 3. 모든 Pod가 정상 Running인지 확인
kubectl get pods -l app=api-server

# 4. 이후 올바른 태그로 재배포
kubectl set image deployment/api-server api=registry.example.com/api-server:v2.5.0
```

### 실무 팁

이미지 태그 오타는 발견하기 어려운 실수입니다. CI/CD 파이프라인에서 이미지 태그를 변수로 관리하고, 배포 전에 `docker manifest inspect` 또는 레지스트리 API로 태그 존재 여부를 검증하는 단계를 추가하면 예방할 수 있습니다. 또한 `kubectl rollout undo` 명령을 숙지해 두면 장애 시 빠른 복구가 가능합니다.
