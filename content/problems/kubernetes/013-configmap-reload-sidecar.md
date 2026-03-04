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
    image: nginx:1.24
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

하지만 Nginx(또는 대부분의 애플리케이션)는 시작 시에만 설정 파일을 읽고, 이후 파일 변경을 자동으로 감지하지 않습니다. 따라서 파일은 업데이트되었지만 애플리케이션이 여전히 이전 설정으로 동작하는 것입니다.

### 해결 방법

```bash
# 1. 사이드카 컨테이너를 추가하여 설정 파일 변경 감지 및 리로드
# Pod 매니페스트에 config-watcher 사이드카 추가:
#
# - name: config-watcher
#   image: busybox
#   command: ["sh", "-c",
#     "CHECKSUM=''; while true; do
#       NEW=$(md5sum /etc/config/settings.conf | cut -d' ' -f1);
#       if [ \"$CHECKSUM\" != \"$NEW\" ]; then
#         CHECKSUM=$NEW;
#         echo \"Config changed, reloading nginx...\";
#         wget -qO- http://localhost:80/ > /dev/null;
#         kill -HUP 1 2>/dev/null || true;
#       fi;
#       sleep 10;
#     done"]
#   volumeMounts:
#   - name: config
#     mountPath: /etc/config

# 2. Pod 재생성
kubectl delete pod app-pod
kubectl apply -f app-pod.yaml

# 3. ConfigMap 변경 후 반영 확인
kubectl patch configmap app-config -p '{"data":{"settings.conf":"debug=true"}}'
kubectl logs app-pod -c config-watcher -f
```

### 실무 팁

프로덕션에서는 Reloader(stakater/reloader) 같은 컨트롤러를 사용하면 ConfigMap/Secret 변경 시 자동으로 관련 Deployment를 롤링 업데이트할 수 있습니다. 사이드카 방식은 Pod 재시작 없이 핫 리로드가 필요한 경우에 적합하지만, 애플리케이션이 SIGHUP이나 API를 통한 리로드를 지원해야 합니다.
