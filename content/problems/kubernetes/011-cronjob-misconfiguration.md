---
id: "kubernetes-011"
title: "CronJob이 예정된 시간에 실행되지 않는 문제"
category: "kubernetes"
difficulty: 2
tags: ["cronjob", "schedule", "timezone", "job-history"]
hints:
  - "CronJob의 schedule 표현식이 의도한 주기와 일치하는지 확인하세요."
  - "LAST SCHEDULE이 `<none>`인 이유를 생각해 보세요. 스케줄이 1년에 한 번만 실행되는 건 아닌지 확인하세요."
  - "timezone이 명시되지 않은 경우 어떤 시간대가 적용되는지 확인해 보세요."
---

## 상황

`ops` Namespace의 `cleanup` CronJob이 매분 실행되어 임시 파일을 정리해야 하지만, 배포 후 5분이 지나도 한 번도 실행되지 않았습니다. 또한 완료된 Job 이력이 너무 많이 남는 문제도 보고되었습니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get cronjob -n ops

```bash
NAME      SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
cleanup   0 0 1 1 *     False     0        <none>          5m
```

### kubectl get jobs -n ops

```bash
No resources found in ops namespace.
```

### cleanup-cronjob.yaml

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
  namespace: ops
spec:
  schedule: "0 0 1 1 *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: cleaner
            image: busybox
            command: ["sh", "-c", "echo 'Cleaning temp files...' && rm -rf /tmp/cache/*"]
```

## 해설

### 원인 분석

`LAST SCHEDULE`이 `<none>`으로 표시되어 CronJob이 한 번도 실행되지 않았음을 알 수 있습니다. 핵심 원인은 `schedule: "0 0 1 1 *"`에 있습니다. 이 cron 표현식은 "매년 1월 1일 0시 0분"을 의미하며, 매분 실행이 아닙니다. 매분 실행하려면 `"* * * * *"`로 설정해야 합니다.

또한 `timeZone` 필드가 명시되지 않아 kube-controller-manager의 시간대에 의존하게 되며, `successfulJobsHistoryLimit`이 기본값(3)으로 설정되어 Job 이력이 쌓일 수 있습니다.

### 해결 방법

```bash
# 1. CronJob 매니페스트 수정
# schedule: "0 0 1 1 *" → "* * * * *"
# spec.timeZone: "Etc/UTC" 추가
# spec.successfulJobsHistoryLimit: 1 추가

# 2. 수정된 매니페스트 적용
kubectl apply -f cleanup-cronjob.yaml

# 3. CronJob이 실행되는지 확인 (1분 대기)
kubectl get cronjob -n ops -w

# 4. Job 실행 확인
kubectl get jobs -n ops
```

### 실무 팁

Cron 표현식은 실수하기 쉬우므로 [crontab.guru](https://crontab.guru) 같은 도구로 미리 검증하세요. `timeZone` 필드를 명시적으로 설정하면 클러스터 시간대에 의존하지 않아 예측 가능한 스케줄링이 가능합니다. `successfulJobsHistoryLimit`과 `failedJobsHistoryLimit`을 적절히 설정하여 완료된 Job이 지나치게 쌓이지 않도록 관리하세요.
