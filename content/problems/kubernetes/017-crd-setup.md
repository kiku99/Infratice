---
id: "kubernetes-017"
title: "Custom Resource 생성 시 API 그룹을 찾을 수 없는 문제"
category: "kubernetes"
difficulty: 2
tags: ["crd", "custom-resource", "api-group", "extensions"]
hints:
  - "에러 메시지에서 어떤 API 리소스를 찾을 수 없다고 하는지 확인하세요."
  - "Custom Resource를 생성하기 전에 해당 리소스의 CRD(CustomResourceDefinition)가 먼저 등록되어야 합니다."
  - "CRD의 group, version, kind 설정이 Custom Resource 매니페스트와 일치하는지 확인하세요."
---

## 상황

Kubernetes API를 확장하여 `Widget`이라는 커스텀 리소스를 사용하려 합니다. CRD를 등록하고 Custom Resource 인스턴스를 생성했지만 에러가 발생합니다. 제공된 CRD와 Custom Resource 매니페스트를 분석하여 원인을 찾으세요.

## 데이터

### kubectl apply -f sample-widget.yaml 실행 결과

```bash
error: resource mapping not found for name: "sample-widget" namespace: "extensions" from "sample-widget.yaml": no matches for kind "Widget" in version "mycompany.io/v1"
ensure CRDs are installed first
```

### kubectl get crd

```bash
NAME                    CREATED AT
widgets.mycompany.io    2025-01-15T08:00:00Z
```

### widget-crd.yaml

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: widgets.mycompany.io
spec:
  group: mycompany.io
  names:
    plural: widgets
    singular: widget
    kind: Widget
    shortNames:
    - wd
  scope: Namespaced
  versions:
  - name: v1
    served: false
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
```

### sample-widget.yaml

```yaml
apiVersion: mycompany.io/v1
kind: Widget
metadata:
  name: sample-widget
  namespace: extensions
spec:
  color: "blue"
  size: 3
```

## 해설

### 원인 분석

에러 메시지 `no matches for kind "Widget" in version "mycompany.io/v1"`이 핵심입니다. CRD는 등록되어 있지만, `widget-crd.yaml`의 versions 설정에서 `served: false`로 되어 있습니다.

`served: false`는 해당 API 버전이 API 서버에서 클라이언트 요청을 받지 않겠다는 의미입니다. CRD가 존재하더라도 `served`가 `false`이면 해당 버전의 리소스를 생성하거나 조회할 수 없습니다. `served: true`로 변경해야 합니다.

### 해결 방법

```bash
# 1. CRD 매니페스트에서 served: false → served: true 로 수정

# 2. CRD 업데이트
kubectl apply -f widget-crd.yaml

# 3. extensions Namespace 생성 (없는 경우)
kubectl create namespace extensions --dry-run=client -o yaml | kubectl apply -f -

# 4. Custom Resource 생성
kubectl apply -f sample-widget.yaml

# 5. 생성 확인
kubectl get widgets -n extensions
kubectl get wd -n extensions
```

### 실무 팁

CRD의 `served`와 `storage` 필드를 혼동하지 마세요. `served`는 API 서버가 해당 버전의 요청을 수락할지 결정하고, `storage`는 etcd에 저장할 버전을 지정합니다. API 버전을 마이그레이션할 때 이전 버전을 `served: false`로 전환하여 새 리소스 생성을 차단하면서 기존 리소스는 유지할 수 있습니다.
