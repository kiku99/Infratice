---
id: "kubernetes-012"
title: "ConfigMap 마운트로 인한 컨테이너 설정 디렉터리 덮어쓰기 문제"
category: "kubernetes"
difficulty: 2
tags: ["configmap", "subpath", "volume-mount", "crashloopbackoff"]
hints:
  - "컨테이너 로그에서 어떤 파일을 찾지 못한다고 하는지 확인하세요."
  - "ConfigMap을 디렉터리에 마운트하면 해당 디렉터리의 기존 파일에 어떤 일이 발생하는지 생각해 보세요."
  - "`subPath`를 사용하면 특정 파일만 마운트할 수 있습니다."
---

## 상황

`prod` Namespace에 배포된 `webapp` Deployment의 Pod가 `CrashLoopBackOff` 상태에 빠져 있습니다. 애플리케이션의 `/config` 디렉터리에 설정 파일을 주입하기 위해 ConfigMap을 마운트했는데, 그 이후로 Pod가 시작되지 않습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get pods -n prod

```bash
NAME                      READY   STATUS             RESTARTS      AGE
webapp-5d8f9b7c6-k3m2n    0/1     CrashLoopBackOff   4 (20s ago)   3m
```

### kubectl logs webapp-5d8f9b7c6-k3m2n -n prod

```log
2025-01-15T09:00:01Z [INFO]  Starting webapp v3.2.0...
2025-01-15T09:00:01Z [ERROR] Configuration file not found: /config/defaults.yaml
2025-01-15T09:00:01Z [FATAL] Cannot start without default configuration. Exiting.
```

### webapp-deployment.yaml (발췌)

```yaml
spec:
  containers:
  - name: webapp
    image: myregistry/webapp:v3.2.0
    volumeMounts:
    - name: extra-config
      mountPath: /config
  volumes:
  - name: extra-config
    configMap:
      name: webapp-extra
```

### kubectl get configmap webapp-extra -n prod -o yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webapp-extra
  namespace: prod
data:
  override.yaml: |
    feature_flags:
      dark_mode: true
      beta_api: false
```

## 해설

### 원인 분석

로그에서 `/config/defaults.yaml` 파일을 찾을 수 없다는 에러가 핵심입니다. 컨테이너 이미지에는 원래 `/config/defaults.yaml`이 포함되어 있지만, ConfigMap `webapp-extra`를 `/config` 디렉터리에 통째로 마운트하면서 기존 디렉터리 내용이 모두 덮어쓰기되었습니다.

Kubernetes에서 ConfigMap을 디렉터리에 마운트하면 해당 디렉터리의 기존 파일을 완전히 대체합니다. 그 결과 `defaults.yaml`은 사라지고 ConfigMap의 `override.yaml`만 남게 됩니다.

### 해결 방법

```bash
# 1. Deployment 매니페스트에서 subPath를 사용하여 개별 파일만 마운트
# volumeMounts:
# - name: extra-config
#   mountPath: /config/override.yaml
#   subPath: override.yaml

# 2. 수정된 매니페스트 적용
kubectl apply -f webapp-deployment.yaml

# 3. Pod 상태 확인
kubectl get pods -n prod

# 4. 기존 파일과 새 파일이 모두 존재하는지 확인
kubectl exec deploy/webapp -n prod -- ls /config/
```

### 실무 팁

ConfigMap을 마운트할 때 기존 디렉터리에 파일을 추가해야 한다면 반드시 `subPath`를 사용하세요. 단, `subPath`를 사용하면 ConfigMap 업데이트 시 자동으로 반영되지 않는 점에 유의해야 합니다. 자동 반영이 필요하다면 별도의 빈 디렉터리에 마운트하고 애플리케이션이 해당 경로를 참조하도록 구성하세요.
