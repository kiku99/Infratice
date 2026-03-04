---
id: "linux-009"
title: "Nginx 워커 프로세스 CPU 과다 사용 식별"
category: "linux"
difficulty: 1
tags: ["nginx", "cpu", "process", "top", "worker"]
hints:
  - "`nginx` 사용자로 실행 중인 프로세스 중 CPU 사용률이 가장 높은 것을 찾아보세요."
  - "`ps` 명령어에서 특정 사용자의 프로세스만 필터링할 수 있습니다."
---

## 상황

웹 서버가 느려지고 사용자들이 타임아웃 에러를 경험하고 있습니다. `nginx` 사용자로 여러 워커 프로세스가 실행 중인데, 그 중 하나가 비정상적으로 높은 CPU를 소비하고 있는 것으로 의심됩니다. 문제의 프로세스를 식별하세요.

## 데이터

### ps aux --sort=-%cpu | head -10

```bash
USER       PID   %CPU  %MEM    VSZ    RSS TTY  STAT START   TIME COMMAND
nginx     12345  92.3   4.1 245678  42340 ?    R    08:15  45:12 nginx: worker process
python3   22310  45.7   6.2 567890 123450 ?    S    07:00  32:45 python3 app.py
java      19872  37.9  12.4 1234560 256780 ?   Sl   06:30  28:30 java -jar app.jar
nginx     12346  15.4   2.8 245678  28560 ?    S    08:15   8:23 nginx: worker process
nginx     12347   1.2   1.0 245678  10240 ?    S    08:15   0:45 nginx: worker process
nginx     12340   0.0   0.5 245678   5120 ?    Ss   08:15   0:02 nginx: master process
root         1   0.0   0.1  16924   3240 ?    Ss   Mar01   0:05 /sbin/init
```

### nginx 설정 (발췌)

```nginx
worker_processes auto;
worker_connections 1024;
```

## 해설

### 원인 분석

`ps` 출력에서 `nginx` 사용자의 프로세스를 확인하면:
- PID 12345: CPU **92.3%** (비정상)
- PID 12346: CPU 15.4% (정상 범위)
- PID 12347: CPU 1.2% (정상 범위)

PID **12345**가 비정상적으로 높은 CPU를 소비하고 있습니다. 이는 특정 요청의 무한 루프, 대용량 파일 처리, 또는 잘못된 설정으로 인한 과도한 연산이 원인일 수 있습니다.

### 해결 방법

```bash
# 1. 문제 프로세스 PID 식별
ps -u nginx -o pid,%cpu,%mem,comm --sort=-%cpu | head -5

# 2. 해당 프로세스의 상세 정보 확인
ls -l /proc/12345/fd | wc -l   # 열린 파일 수 확인
cat /proc/12345/status          # 프로세스 상태 확인

# 3. 문제가 지속되면 해당 워커만 종료 (master가 자동 재생성)
kill -QUIT 12345

# 4. nginx 전체 정상 동작 확인
systemctl status nginx
curl -I http://localhost
```

### 실무 팁

Nginx 워커 프로세스는 master 프로세스가 관리하므로, 문제 워커를 `kill`하면 master가 새 워커를 자동 생성합니다. `worker_processes auto`는 CPU 코어 수만큼 워커를 생성하며, `worker_connections`는 각 워커의 동시 연결 수를 제한합니다. 특정 워커의 CPU가 비정상적으로 높으면 `strace -p <PID>`로 시스템 콜을 추적하여 근본 원인을 분석할 수 있습니다.
