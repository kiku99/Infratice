---
id: "kubernetes-015"
title: "Job이 Kubernetes API 호출 시 권한 거부되는 문제"
category: "kubernetes"
difficulty: 2
tags: ["job", "rbac", "serviceaccount", "role", "rolebinding"]
hints:
  - "Job의 Pod 로그에서 어떤 API 호출이 실패했는지 확인하세요."
  - "Job이 사용하는 ServiceAccount에 필요한 권한(Role)이 바인딩되어 있는지 확인하세요."
  - "Role의 verbs와 resources가 실제 API 호출과 일치하는지 확인하세요."
---

## 상황

`ops` Namespace에서 `data-loader` Job이 Kubernetes API를 호출하여 Pod 목록을 조회해야 하지만, 권한 에러로 실패합니다. ServiceAccount와 RBAC 설정이 되어 있다고 하는데, 제공된 정보를 분석하여 문제를 찾으세요.

## 데이터

### kubectl get jobs -n ops

```bash
NAME          COMPLETIONS   DURATION   AGE
data-loader   0/1           2m         2m
```

### kubectl logs job/data-loader -n ops

```log
Connecting to Kubernetes API...
Error: pods is forbidden: User "system:serviceaccount:ops:loader-sa" cannot list resource "pods" in API group "" in the namespace "ops"
```

### kubectl get serviceaccount loader-sa -n ops -o yaml (발췌)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: loader-sa
  namespace: ops
```

### kubectl get role,rolebinding -n ops

```bash
NAME                         CREATED AT
role.rbac.authorization.k8s.io/loader-role   2025-01-15T08:00:00Z

NAME                                   ROLE                AGE
rolebinding.rbac.authorization.k8s.io/loader-binding   Role/loader-role   30m
```

### kubectl get role loader-role -n ops -o yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: loader-role
  namespace: ops
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get"]
```

### kubectl get rolebinding loader-binding -n ops -o yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: loader-binding
  namespace: ops
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: loader-role
subjects:
- kind: ServiceAccount
  name: loader-sa
  namespace: ops
```

### data-loader-job.yaml (발췌)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-loader
  namespace: ops
spec:
  template:
    spec:
      serviceAccountName: loader-sa
      restartPolicy: Never
      containers:
      - name: loader
        image: bitnami/kubectl:latest
        command: ["kubectl", "get", "pods", "-n", "ops"]
```

## 해설

### 원인 분석

에러 메시지에서 `cannot list resource "pods"`가 핵심입니다. Job은 `kubectl get pods` 명령을 실행하는데, 이 명령은 `list` verb를 사용합니다. 그런데 `loader-role`의 rules를 보면 `verbs: ["get"]`만 허용되어 있고 `list`가 빠져 있습니다.

`kubectl get pods`는 내부적으로 `list` API를 호출하므로, `get`만으로는 부족합니다. Role에 `list` verb를 추가해야 합니다.

### 해결 방법

```bash
# 1. Role에 list verb 추가
kubectl patch role loader-role -n ops --type=json \
  -p='[{"op":"replace","path":"/rules/0/verbs","value":["get","list"]}]'

# 2. 실패한 Job 삭제 후 재실행
kubectl delete job data-loader -n ops
kubectl apply -f data-loader-job.yaml

# 3. Job 완료 확인
kubectl get jobs -n ops
kubectl logs job/data-loader -n ops
```

### 실무 팁

RBAC Role을 작성할 때 `get`(단일 리소스 조회)과 `list`(목록 조회)는 별개의 권한입니다. `kubectl get <resource>`는 목록 조회 시 `list`, 단일 조회 시 `get`을 사용합니다. `kubectl auth can-i list pods --as=system:serviceaccount:ops:loader-sa -n ops`로 사전에 권한을 테스트할 수 있습니다.
