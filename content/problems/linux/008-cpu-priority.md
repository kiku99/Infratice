---
id: "linux-008"
title: "백그라운드 작업의 과도한 CPU 사용으로 서비스 지연"
category: "linux"
difficulty: 1
tags: ["cpu", "nice", "renice", "priority", "process"]
hints:
  - "프로세스의 nice 값이 CPU 스케줄링 우선순위에 어떤 영향을 주는지 생각해 보세요."
  - "`renice` 명령어로 실행 중인 프로세스의 우선순위를 변경할 수 있는지 확인해 보세요."
---

## 상황

피크 시간대에 사용자 대면 서비스의 응답 속도가 급격히 느려졌습니다. 서버를 확인한 결과 `devops` 사용자가 실행한 백그라운드 데이터 처리 작업이 CPU를 85% 이상 점유하고 있습니다. 이 작업을 중단할 수는 없지만 사용자 서비스에 영향을 줄여야 합니다.

## 데이터

### top 출력 (발췌)

```bash
top - 14:35:22 up 5 days, 3:20, 2 users, load average: 4.82, 4.15, 3.67

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM   TIME+ COMMAND
 5432 devops    20   0 2048576 256840  12340 R  85.3  12.4   8:23 data-processor
 1234 www-data  20   0  892340 125600  45670 S  12.1   6.1  45:12 nginx
 2345 postgres  20   0 1245680 345200  67890 S   8.5  16.8  32:45 postgres
```

### ps -o pid,user,ni,comm -p 5432

```bash
  PID USER      NI COMMAND
 5432 devops     0 data-processor
```

## 해설

### 원인 분석

`data-processor` 프로세스(PID 5432)의 nice 값이 `0`(기본값)으로, nginx나 postgres 같은 서비스와 동일한 CPU 스케줄링 우선순위를 갖고 있습니다. CPU 사용률이 85.3%에 달하면서 사용자 대면 서비스가 필요한 CPU 자원을 확보하지 못하고 있습니다.

nice 값은 -20(최고 우선순위)부터 19(최저 우선순위)까지 설정 가능하며, 값이 높을수록 다른 프로세스에 CPU를 양보합니다.

### 해결 방법

```bash
# 1. 현재 프로세스 우선순위 확인
ps -o pid,user,ni,comm -p 5432

# 2. nice 값을 10으로 변경 (우선순위 낮추기)
renice 10 -p 5432

# 3. 변경 확인
ps -o pid,user,ni,comm -p 5432
#   PID USER      NI COMMAND
#  5432 devops    10 data-processor
```

### 실무 팁

백그라운드 배치 작업은 처음부터 `nice -n 10 ./data-processor`로 낮은 우선순위로 실행하는 것이 좋습니다. crontab에서도 `nice -n 10 /usr/local/bin/batch-job.sh`처럼 사용할 수 있습니다. 더 강력한 리소스 제어가 필요하면 `cgroups`를 활용하여 CPU 사용률 상한을 직접 설정할 수 있습니다.
