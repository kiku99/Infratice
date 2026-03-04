---
id: "linux-013"
title: "의심스러운 백그라운드 프로세스로 인한 시스템 부하 급증"
category: "linux"
difficulty: 2
tags: ["process", "ps", "kill", "security", "background"]
hints:
  - "최근 10분 내에 시작된 프로세스만 필터링하여 확인해 보세요."
  - "`ps` 명령어의 `lstart` 포맷으로 프로세스 시작 시간을 확인할 수 있습니다."
  - "root이나 시스템 서비스가 아닌 사용자의 프로세스를 주의 깊게 살펴보세요."
---

## 상황

시스템 부하가 갑자기 급증했습니다. 최근 새로운 워크로드를 배포한 적이 없는데 로드 평균이 급격히 올랐습니다. 최근 생성된 프로세스 중 의심스러운 것을 찾아 조치하세요.

## 데이터

### uptime 출력

```bash
 16:37:45 up 15 days, 4:22, 3 users, load average: 8.45, 3.21, 1.15
```

### ps -eo pid,user,lstart,comm --sort=-start_time | head -10

```bash
  PID USER     STARTED                         COMMAND
 8236 deploy   Wed Mar  4 16:37:15 2026        crypto-worker
 8235 deploy   Wed Mar  4 16:37:12 2026        crypto-worker
 8234 deploy   Wed Mar  4 16:37:10 2026        crypto-worker
 8233 deploy   Wed Mar  4 16:36:58 2026        bash
 7890 root     Wed Mar  4 16:30:00 2026        cron
 7850 root     Wed Mar  4 16:00:00 2026        logrotate
 1234 www-data Tue Mar  3 08:00:00 2026        nginx
```

### ps aux | grep crypto-worker

```bash
deploy    8234  99.0  2.1 456780 34560 ?  R  16:37  1:23 /tmp/.hidden/crypto-worker --threads=4
deploy    8235  99.0  2.1 456780 34560 ?  R  16:37  1:20 /tmp/.hidden/crypto-worker --threads=4
deploy    8236  99.0  2.1 456780 34560 ?  R  16:37  1:18 /tmp/.hidden/crypto-worker --threads=4
```

## 해설

### 원인 분석

로드 평균을 보면 1분(8.45), 5분(3.21), 15분(1.15)으로 급격히 증가하고 있어 최근에 부하가 시작된 것을 알 수 있습니다. 최근 생성된 프로세스 중 `deploy` 사용자가 실행한 `crypto-worker`라는 프로세스 3개가 각각 CPU **99%**를 소비하고 있습니다.

이 프로세스들은 `/tmp/.hidden/` 경로에서 실행되고 있어 정상적인 배포 프로세스가 아닌 것으로 보입니다. `deploy` 계정이 침해되어 악성 프로세스가 실행된 것으로 의심됩니다.

### 해결 방법

```bash
# 1. 의심스러운 프로세스 즉시 종료
kill -9 8234 8235 8236

# 2. 부모 프로세스(bash 세션)도 종료
kill -9 8233

# 3. 악성 파일 제거
rm -rf /tmp/.hidden/

# 4. 프로세스 제거 확인
ps aux | grep crypto-worker | grep -v grep

# 5. deploy 사용자의 인증 정보 점검
passwd -l deploy   # 계정 임시 잠금
last deploy        # 최근 로그인 기록 확인
```

### 실무 팁

`/tmp` 디렉터리에서 실행되는 바이너리, 숨겨진 디렉터리(`.`으로 시작), 알 수 없는 프로세스명은 보안 침해의 전형적인 징후입니다. 서비스 계정에는 불필요한 셸 접근을 제한하고(`/usr/sbin/nologin`), `/tmp`에 `noexec` 마운트 옵션을 적용하면 실행 파일 기반 공격을 방지할 수 있습니다. 사후 분석을 위해 프로세스 정보를 파일로 저장한 후 종료하는 것이 좋습니다.
