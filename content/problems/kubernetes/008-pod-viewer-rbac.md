---
id: "kubernetes-008"
title: "ServiceAccount의 Pod 조회 권한이 없는 문제"
category: "kubernetes"
difficulty: 1
tags: ["rbac", "role", "rolebinding", "serviceaccount"]
hints:
  - "에러 메시지의 `cannot` 부분에서 어떤 동작이 거부되었는지 확인하세요."
  - "ServiceAccount에 연결된 Role이나 RoleBinding이 존재하는지 확인해 보세요."
---

## 상황

모니터링 애플리케이션이 `demo` Namespace의 Pod 목록을 조회해야 합니다. 전용 ServiceAccount를 생성했지만, API 호출 시 권한 에러가 발생합니다. 제공된 정보를 분석하여 RBAC 설정의 문제를 찾으세요.

## 데이터

### 모니터링 앱 에러 로그

```log
2025-01-15T10:00:01Z [ERROR] Failed to list pods: pods is forbidden: User "system:serviceaccount:demo:reader-sa" cannot list resource "pods" in API group "" in the namespace "demo"
```

### kubectl get serviceaccount -n demo

```bash
NAME        SECRETS   AGE
default     0         5d
reader-sa   0         1h
```

### kubectl get role,rolebinding -n demo

```bash
No resources found in demo namespace.
```

## 해설

### 원인 분석

에러 메시지 `pods is forbidden: User "system:serviceaccount:demo:reader-sa" cannot list resource "pods"`가 핵심입니다. ServiceAccount `reader-sa`는 생성되었지만, 이 ServiceAccount에 Pod 조회 권한을 부여하는 Role과 RoleBinding이 존재하지 않습니다. `kubectl get role,rolebinding -n demo` 결과가 비어 있는 것이 이를 확인해 줍니다.

Kubernetes RBAC에서 ServiceAccount는 기본적으로 아무런 권한이 없으며, Role(권한 정의)과 RoleBinding(권한 연결)을 명시적으로 생성해야 합니다.

### 해결 방법

```bash
# 1. Pod 조회 권한을 가진 Role 생성
kubectl create role pod-reader -n demo \
  --verb=get,list,watch \
  --resource=pods

# 2. Role을 ServiceAccount에 연결하는 RoleBinding 생성
kubectl create rolebinding pod-reader-binding -n demo \
  --role=pod-reader \
  --serviceaccount=demo:reader-sa

# 3. 권한 확인
kubectl auth can-i list pods -n demo --as=system:serviceaccount:demo:reader-sa
```

### 실무 팁

최소 권한 원칙(Principle of Least Privilege)에 따라 ServiceAccount에는 꼭 필요한 권한만 부여하세요. `kubectl auth can-i` 명령으로 특정 SA의 권한을 미리 테스트할 수 있어, 배포 전에 RBAC 설정을 검증하는 데 유용합니다.
