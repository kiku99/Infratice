---
id: "linux-012"
title: "디스크 I/O 병목으로 인한 서버 응답 지연"
category: "linux"
difficulty: 1
tags: ["io", "iotop", "ionice", "disk", "throttle"]
hints:
  - "`iotop` 명령어로 디스크 I/O를 가장 많이 사용하는 프로세스를 확인해 보세요."
  - "`ionice` 명령어로 프로세스의 I/O 우선순위를 변경할 수 있습니다."
  - "idle 클래스로 설정하면 다른 프로세스의 I/O가 없을 때만 디스크를 사용합니다."
---

## 상황

서버에서 간헐적인 지연과 타임아웃이 발생하고 있습니다. CPU와 메모리는 정상 수준이지만 디스크 I/O 사용률이 비정상적으로 높습니다. 사용자 파일 접근이 극도로 느려졌습니다. I/O 병목을 유발하는 프로세스를 찾아 조치하세요.

## 데이터

### iotop 출력

```bash
Total DISK READ:      125.43 M/s | Total DISK WRITE:      89.32 M/s

  TID  PRIO  USER      DISK READ  DISK WRITE  SWAPIN     IO>    COMMAND
 5678  be/4  backup     98.45 M/s   67.23 M/s  0.00 %  95.32 % rsync /data /backup
 3421  be/4  postgres   15.23 M/s   12.45 M/s  0.00 %  18.45 % postgres: vacuum
 8234  be/4  appuser     8.45 M/s    3.21 M/s  0.00 %  12.10 % /usr/bin/log-processor
```

### iostat -x 1 1

```bash
Device   r/s     w/s   rkB/s    wkB/s  %util
sda    2450.0  1890.0 128440.0  91320.0  99.8
```

## 해설

### 원인 분석

`iotop` 출력에서 `rsync` 프로세스(PID 5678)가 디스크 읽기 98.45 M/s, 쓰기 67.23 M/s로 I/O의 대부분을 소비하고 있습니다. I/O 우선순위가 `be/4`(Best-effort, 기본값)로 `postgres` 같은 중요 서비스와 동일한 우선순위에서 디스크를 경쟁합니다.

`iostat`에서 디스크 사용률(`%util`)이 99.8%로, 디스크가 거의 포화 상태입니다. 백업 작업이 데이터베이스와 애플리케이션의 디스크 접근을 방해하고 있습니다.

### 해결 방법

```bash
# 1. I/O 과다 사용 프로세스 확인
iotop -o -b -n 1

# 2. 비핵심 프로세스(rsync 백업)의 I/O 우선순위를 idle로 변경
ionice -c 3 -p 5678

# 3. 로그 프로세서도 idle로 변경
ionice -c 3 -p 8234

# 4. 변경 확인 (PRIO가 idle로 변경됨)
iotop -o -b -n 1
```

### 실무 팁

백업 작업은 처음부터 `ionice -c 3 rsync /data /backup`으로 idle I/O 클래스로 실행하세요. crontab에서도 `ionice -c 3 nice -n 10 /usr/local/bin/backup.sh`로 CPU와 I/O 우선순위를 동시에 낮출 수 있습니다. I/O 클래스는 3가지로 구분됩니다: `1`(Realtime, 최우선), `2`(Best-effort, 기본), `3`(Idle, 최저).
