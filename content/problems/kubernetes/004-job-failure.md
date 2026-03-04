---
id: "kubernetes-004"
title: "Job이 계속 실패하며 완료되지 않는 문제"
category: "kubernetes"
difficulty: 1
tags: ["job", "backofflimit", "command", "exit-code"]
hints:
  - "Job의 Pod 로그 또는 상태에서 Exit Code를 확인해 보세요."
  - "컨테이너가 실행하는 command 필드가 올바른 형식인지 살펴보세요."
---

## 상황

배치 작업을 위해 Job을 배포했지만, Pod가 `Error` 상태로 반복 실패하여 Job이 완료되지 않습니다. `backoffLimit`이 1로 설정되어 있어 재시도 횟수도 제한됩니다. 제공된 Job 매니페스트와 상태를 분석하여 원인을 찾고 해결하세요.

## 데이터

### kubectl get jobs -n batch

```bash
NAME       COMPLETIONS   DURATION   AGE
fail-job   0/1           2m         2m
```

### kubectl get pods -n batch

```bash
NAME             READY   STATUS   RESTARTS   AGE
fail-job-7x2kp   0/1     Error    0          2m
fail-job-r9m4d   0/1     Error    0          90s
```

### fail-job.yaml

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fail-job
  namespace: batch
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: busybox
        command: ["sh", "-c", "echo 'Processing...'; exit 1"]
```

### kubectl logs fail-job-7x2kp -n batch

```log
Processing...
```

## 해설

### 원인 분석

Pod 로그를 보면 `Processing...`은 정상 출력되지만, 컨테이너의 `command`에 `exit 1`이 포함되어 있어 매번 비정상 종료(Exit Code 1)됩니다. Kubernetes는 Exit Code가 0이 아닌 경우 Job을 실패로 판단하며, `backoffLimit: 1`에 의해 1회 재시도 후 더 이상 시도하지 않습니다.

### 해결 방법

```bash
# 1. Job 매니페스트의 command를 수정하여 정상 종료되도록 변경
# exit 1 → exit 0
# command: ["sh", "-c", "echo 'Success'; exit 0"]

# 2. 기존 실패한 Job 삭제
kubectl delete job fail-job -n batch

# 3. 수정된 매니페스트 적용
kubectl apply -f fail-job.yaml

# 4. Job 완료 확인
kubectl get jobs -n batch
```

### 실무 팁

Job의 `command`에 외부 스크립트를 호출하는 경우, 스크립트 내부에서 에러 핸들링을 철저히 하여 의도치 않은 비정상 종료를 방지하세요. 또한 `backoffLimit`을 적절히 설정하여 일시적 장애에 대한 재시도 여유를 두는 것이 좋습니다.
