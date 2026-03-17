---
id: "kubernetes-023"
title: "잘못된 Custom Resource 생성으로 컨트롤러가 종료되는 원인 분석"
category: "kubernetes"
difficulty: 3
tags: ["crd", "schema-validation", "openapiv3schema", "custom-resource"]
hints:
  - "현재 CRD 정의가 `spec` 필드 값을 어디까지 검증하는지 확인하세요."
  - "`spec.size`에 대해 필수 여부와 값 범위가 정의되어 있는지 살펴보세요."
  - "API 서버 단계에서 잘못된 리소스를 막으려면 어떤 제약이 필요한지 생각해 보세요."
---

## 상황

`Widget` CRD를 운영 중인데, 일부 Custom Resource 생성 이후 컨트롤러가 반복적으로 에러를 내며 종료됩니다. 제공된 리소스 예시와 CRD 정의를 분석하여 왜 이런 리소스가 생성될 수 있었는지 파악하고, 동일한 문제가 다시 발생하지 않도록 예방 방법을 제안하세요.

## 데이터

### 컨트롤러 에러 로그

```log
2025-01-15T10:00:01Z [ERROR] Reconcile failed for widget "bad-widget": spec.size is required but was nil
2025-01-15T10:00:01Z [ERROR] Reconcile failed for widget "negative-widget": spec.size must be positive, got -5
2025-01-15T10:00:02Z [FATAL] Too many errors, controller shutting down
```

### kubectl get widgets -n extensions

```bash
NAME              AGE
good-widget       1h
bad-widget        30m
negative-widget   15m
```

### kubectl get widget bad-widget -n extensions -o yaml

```yaml
apiVersion: mycompany.io/v1
kind: Widget
metadata:
  name: bad-widget
  namespace: extensions
spec:
  color: "red"
```

### kubectl get widget negative-widget -n extensions -o yaml

```yaml
apiVersion: mycompany.io/v1
kind: Widget
metadata:
  name: negative-widget
  namespace: extensions
spec:
  color: "blue"
  size: -5
```

### 현재 CRD 정의 (발췌)

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
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              color:
                type: string
              size:
                type: integer
```

### bad-widget.yaml (검증 테스트용)

```yaml
apiVersion: mycompany.io/v1
kind: Widget
metadata:
  name: bad-widget
  namespace: extensions
spec:
  color: "red"
```

## 해설

### 원인 분석

현재 CRD의 `openAPIV3Schema`에서 `spec.size`는 `type: integer`로만 정의되어 있습니다. 두 가지 문제가 있습니다:

1. **필수 필드 미지정**: `spec.size`가 `required`에 포함되지 않아, `size` 필드 없이도 Widget이 생성됩니다(`bad-widget`).
2. **최솟값 미지정**: `minimum` 제약이 없어 음수 값도 허용됩니다(`negative-widget`의 `size: -5`).

이로 인해 컨트롤러가 nil 값이나 음수를 처리하려다 에러가 발생합니다.

### 해결 방법

```bash
# 1. CRD 스키마에 required와 minimum 제약 추가
# spec:
#   type: object
#   required: ["size"]
#   properties:
#     color:
#       type: string
#     size:
#       type: integer
#       minimum: 1

# 2. 수정된 CRD 적용
kubectl apply -f widget-crd.yaml

# 3. 잘못된 기존 리소스 삭제
kubectl delete widget bad-widget negative-widget -n extensions

# 4. 스키마 검증 테스트 - size 없이 생성 시도
kubectl apply -f bad-widget.yaml
# 예상 결과: The Widget "bad-widget" is invalid: spec.size: Required value

# 5. 음수 값으로 생성 시도
kubectl apply -f - <<EOF
apiVersion: mycompany.io/v1
kind: Widget
metadata:
  name: test-widget
  namespace: extensions
spec:
  color: "green"
  size: -1
EOF
# 예상 결과: spec.size: Invalid value: -1: spec.size in body should be greater than or equal to 1
```

### 실무 팁

CRD를 설계할 때 처음부터 엄격한 스키마 검증을 포함하세요. `required`, `minimum`, `maximum`, `enum`, `pattern` 등의 OpenAPI v3 Schema 키워드를 활용하면 API 수준에서 잘못된 입력을 차단할 수 있어, 컨트롤러 코드의 방어 로직을 줄이고 안정성을 높일 수 있습니다. 또한 `x-kubernetes-validations` CEL 표현식을 사용하면 더 복잡한 검증 규칙도 구현할 수 있습니다.
