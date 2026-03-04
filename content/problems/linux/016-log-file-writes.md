---
id: "linux-016"
title: "로그 파일에 과도하게 쓰기하는 프로세스 추적"
category: "linux"
difficulty: 1
tags: ["log", "lsof", "inotify", "disk", "write"]
hints:
  - "`lsof`로 특정 파일을 열고 있는 프로세스를 확인할 수 있습니다."
  - "파일에 대한 쓰기 작업을 실시간으로 모니터링하는 방법을 찾아보세요."
---

## 상황

`/var/log/messages` 파일이 비정상적으로 빠르게 커지고 있어 디스크 공간이 수 시간 내에 소진될 위험이 있습니다. 어떤 프로세스가 이 파일에 과도하게 쓰기를 하고 있는지 찾아 조치하세요.

## 데이터

### ls -lh /var/log/messages (5분 간격 확인)

```bash
# 10:00
-rw-r--r-- 1 root root 12G Mar 04 10:00 /var/log/messages

# 10:05
-rw-r--r-- 1 root root 15G Mar 04 10:05 /var/log/messages
```

### lsof /var/log/messages

```bash
COMMAND    PID  USER   FD   TYPE DEVICE  SIZE/OFF     NODE NAME
rsyslogd  1234  root    7w   REG  253,1  15G      131074 /var/log/messages
```

### tail -5 /var/log/messages

```bash
Mar  4 10:05:01 server app[5678]: DEBUG: Processing item 982341 - cache check
Mar  4 10:05:01 server app[5678]: DEBUG: Processing item 982342 - cache check
Mar  4 10:05:01 server app[5678]: DEBUG: Processing item 982343 - cache check
Mar  4 10:05:01 server app[5678]: DEBUG: Processing item 982344 - cache check
Mar  4 10:05:01 server app[5678]: DEBUG: Processing item 982345 - cache check
```

## 해설

### 원인 분석

`lsof` 결과 `rsyslogd`(PID 1234)가 `/var/log/messages`에 쓰기 작업을 하고 있습니다. `tail`로 로그 내용을 확인하면 `app[5678]`이 **DEBUG 레벨**의 로그를 초당 수천 건씩 syslog로 전송하고 있어, rsyslogd가 이를 `/var/log/messages`에 기록하면서 파일이 5분에 3GB씩 증가하고 있습니다.

애플리케이션의 로그 레벨이 DEBUG로 설정되어 있는 것이 근본 원인입니다.

### 해결 방법

```bash
# 1. 과도한 쓰기를 하는 프로세스 확인
lsof /var/log/messages

# 2. 로그 발생 원인 프로세스 확인 (로그 내용에서 PID 추출)
tail -50 /var/log/messages > /home/devops/excessive_log_process.txt
ps -p 5678 -o pid,user,comm >> /home/devops/excessive_log_process.txt

# 3. 즉시 조치: 로그 파일 크기 줄이기
truncate -s 0 /var/log/messages

# 4. 애플리케이션 로그 레벨 변경 (DEBUG → INFO)
# 애플리케이션 설정 파일에서 log_level = "info"로 변경 후 재시작
```

### 실무 팁

프로덕션 환경에서는 DEBUG 로그를 활성화하지 마세요. 디버깅이 필요한 경우 일시적으로만 활성화하고, 완료 후 반드시 INFO 이상으로 복원하세요. rsyslog의 rate-limiting 설정(`$imjournalRatelimitInterval`, `$imjournalRatelimitBurst`)을 활용하면 과도한 로그 발생을 방지할 수 있습니다.
