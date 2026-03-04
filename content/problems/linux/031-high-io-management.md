---
id: "linux-031"
title: "핵심 서비스와 비핵심 작업 간 I/O 우선순위 분리"
category: "linux"
difficulty: 1
tags: ["io", "ionice", "iotop", "priority", "disk"]
hints:
  - "`iotop`으로 프로세스별 I/O 사용량을 실시간으로 확인할 수 있습니다."
  - "데이터베이스 같은 핵심 서비스와 백업 같은 비핵심 작업의 I/O 우선순위를 구분해야 합니다."
  - "`ionice`의 클래스(1: Realtime, 2: Best-effort, 3: Idle)를 활용하세요."
---

## 상황

사용자들이 파일 접근이 느리다고 보고하고 있습니다. 서버에서 백업(rsync)과 로그 프로세서가 데이터베이스(postgres)와 동일한 I/O 우선순위로 실행되면서, 데이터베이스 쿼리 응답이 지연되고 있습니다. 핵심 서비스의 I/O를 보호하면서 비핵심 작업의 I/O를 제한하세요.

## 데이터

### iotop -o -b -n 1 출력

```bash
Total DISK READ:      45.67 M/s | Total DISK WRITE:     123.45 M/s

  TID  PRIO  USER      DISK READ  DISK WRITE  SWAPIN     IO>    COMMAND
 5678  be/4  backup     2.34 M/s   98.76 M/s  0.00 %  72.10 % rsync /data /backup
 3421  be/4  postgres  15.23 M/s   12.45 M/s  0.00 %  18.45 % postgres: vacuum
 8234  be/4  appuser    8.45 M/s    3.21 M/s  0.00 %  12.34 % /usr/bin/log-processor
```

### ionice -p 5678

```bash
best-effort: prio 4
```

## 해설

### 원인 분석

세 프로세스 모두 I/O 우선순위가 `be/4`(Best-effort, 우선순위 4)로 동일합니다. `rsync` 백업이 디스크 쓰기의 **80%**(98.76 M/s)를 차지하면서 `postgres`의 디스크 접근을 방해하고 있습니다.

데이터베이스는 사용자 요청에 직접 영향을 주는 핵심 서비스이므로 I/O 우선순위를 보장해야 하고, 백업과 로그 프로세서는 가용 I/O가 있을 때만 동작하도록 설정해야 합니다.

### 해결 방법

```bash
# 1. 비핵심 프로세스(rsync 백업)의 I/O를 idle 클래스로 변경
ionice -c 3 -p 5678

# 2. 로그 프로세서도 idle 클래스로 변경
ionice -c 3 -p 8234

# 3. 변경 확인
ionice -p 5678    # idle
ionice -p 8234    # idle
ionice -p 3421    # best-effort: prio 4 (변경 없음)

# 4. I/O 분배 개선 확인
iotop -o -b -n 1
```

```bash
# 향후 백업 실행 시 처음부터 idle로 시작
ionice -c 3 nice -n 10 rsync /data /backup

# crontab 예시
0 2 * * * ionice -c 3 nice -n 10 /usr/local/bin/backup.sh
```

### 실무 팁

I/O 우선순위 설정 시 핵심 서비스(데이터베이스, 메시지 큐, 웹 서버)는 기본 우선순위(Best-effort)를 유지하고, 배치 작업(백업, 로그 처리, 인덱싱)은 Idle 클래스로 설정하는 것이 표준 관행입니다. `cgroups v2`의 `io.weight`을 활용하면 그룹 단위로 I/O 대역폭 비율을 지정하여 더 세밀한 제어가 가능합니다.
