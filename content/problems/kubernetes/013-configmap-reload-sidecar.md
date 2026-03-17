---
id: "kubernetes-013"
title: "ConfigMap 변경이 애플리케이션에 반영되지 않는 문제"
category: "kubernetes"
difficulty: 2
tags: ["configmap", "sidecar", "hot-reload", "volume"]
hints:
  - "ConfigMap을 변경한 후 Pod 내부의 파일이 업데이트되었는지 확인하세요."
  - "애플리케이션이 설정 파일 변경을 감지하는 메커니즘이 있는지 확인하세요."
  - "사이드카 컨테이너를 활용하여 파일 변경을 감지하고 애플리케이션에 알릴 수 있습니다."
---

## 상황

운영 환경에서 `app-pod`의 ConfigMap 값을 변경했지만, 애플리케이션이 새로운 설정을 인식하지 못합니다. Pod를 재시작하지 않고 설정을 반영해야 하는 상황입니다. 현재 Pod 구성을 분석하고 설정 자동 반영 방법을 제안하세요.

## 데이터

### kubectl get configmap app-config -o yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  settings.conf: "debug=false"
```

### app-pod.yaml (현재 구성)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: registry.example.com/debug-app:1.0.0
    volumeMounts:
    - name: config
      mountPath: /etc/config
  volumes:
  - name: config
    configMap:
      name: app-config
```

### kubectl exec app-pod -- cat /etc/config/settings.conf

```plaintext
debug=false
```

### ConfigMap 업데이트 후 확인

```bash
$ kubectl patch configmap app-config -p '{"data":{"settings.conf":"debug=true"}}'
configmap/app-config patched

$ sleep 120

$ kubectl exec app-pod -- cat /etc/config/settings.conf
debug=true

$ kubectl exec app-pod -- curl -s localhost:80/status
{"debug": false}
```

## 해설

### 원인 분석

ConfigMap을 볼륨으로 마운트한 경우, Kubernetes는 일정 시간(기본 약 60~120초) 후 Pod 내부의 파일을 자동으로 업데이트합니다. 실제로 `cat` 명령으로 확인하면 파일 내용은 `debug=true`로 변경되어 있습니다.

하지만 현재 Pod 구성에는 애플리케이션이 파일 변경을 감지하는 로직도, 외부에서 리로드를 트리거할 수 있는 장치도 보이지 않습니다. 따라서 파일은 업데이트되었지만 애플리케이션 프로세스는 여전히 이전 설정을 메모리에 유지한 채 동작하는 것입니다.

즉 현재 데이터가 보여주는 결론은 "`ConfigMap` 볼륨 업데이트"와 "애플리케이션 런타임 반영"이 서로 다른 문제라는 점입니다. Pod 재시작 없이 반영하려면 앱이 직접 파일 변경을 감지하거나, 같은 Pod 안에서 리로드 API/시그널을 안전하게 호출할 수 있는 별도 메커니즘이 필요합니다.

### 해결 방법

```bash
# 1. 앱이 리로드 엔드포인트를 제공하도록 준비
#    예: POST http://127.0.0.1:80/-/reload 호출 시 설정 재적용

# 2. ConfigMap 변경을 감지하는 사이드카 추가
# Pod 매니페스트 예시:
# - name: config-watcher
#   image: busybox:1.36
#   command: ["sh", "-c",
#     "SUM=''; while true; do
#       NEW=$(md5sum /etc/config/settings.conf | cut -d' ' -f1);
#       if [ \"$SUM\" != \"$NEW\" ]; then
#         SUM=$NEW;
#         wget -qO- --post-data='' http://127.0.0.1:80/-/reload || true;
#       fi;
#       sleep 10;
#     done"]
#   volumeMounts:
#   - name: config
#     mountPath: /etc/config

# 3. 위 sidecar 예시를 app-pod.yaml에 반영한 뒤 Pod 재생성
kubectl delete pod app-pod
kubectl apply -f app-pod.yaml

# 4. ConfigMap 변경 후 반영 확인
kubectl patch configmap app-config -p '{"data":{"settings.conf":"debug=true"}}'
kubectl logs app-pod -c config-watcher -f
```

### 실무 팁

프로덕션에서는 Reloader(stakater/reloader) 같은 컨트롤러를 사용해 ConfigMap/Secret 변경 시 관련 워크로드를 롤링 업데이트하는 방식이 가장 단순합니다. Pod 재시작 없이 핫 리로드가 꼭 필요하다면, 애플리케이션이 파일 watcher나 HTTP reload endpoint 같은 재적용 메커니즘을 먼저 제공해야 합니다.
