---
id: "linux-007"
title: "애플리케이션이 시작 직후 종료되는 원인 분석"
category: "linux"
difficulty: 1
tags: ["port", "ss", "lsof", "bind", "conflict"]
hints:
  - "에러 메시지에서 어떤 포트에 문제가 있는지 확인해 보세요."
  - "`ss` 또는 `lsof` 명령어로 해당 포트를 점유 중인 프로세스를 찾아보세요."
---

## 상황

웹 애플리케이션 서버를 시작하려 하면 즉시 에러가 발생하며 종료됩니다. 이전까지는 정상적으로 실행되었으며, 설정 변경은 없었습니다. 에러 로그를 분석하여 원인을 찾고 해결하세요.

## 데이터

### 애플리케이션 시작 시도

```bash
$ ./server.sh start
Starting application server...
Error: bind(): Address already in use (port 8080)
Server failed to start. Exiting.
```

### ss -tlnp | grep 8080

```bash
LISTEN  0  128  0.0.0.0:8080  0.0.0.0:*  users:(("python3",pid=4521,fd=3))
```

### ps aux | grep 4521

```bash
nobody    4521  0.1  1.2  45678  12340 ?  S  Feb28  2:15  python3 -m http.server 8080
```

## 해설

### 원인 분석

에러 메시지 `Address already in use (port 8080)`은 포트 8080이 이미 다른 프로세스에 의해 점유되어 있음을 나타냅니다. `ss` 명령어 결과 `python3` 프로세스(PID 4521)가 포트 8080에서 수신 대기 중입니다.

이 프로세스는 `nobody` 사용자가 실행한 간이 HTTP 서버(`python3 -m http.server`)로, 테스트 목적으로 실행된 후 종료되지 않고 남아있는 것으로 보입니다.

### 해결 방법

```bash
# 1. 포트를 점유 중인 프로세스 확인
ss -tlnp | grep :8080
# 또는
lsof -i :8080

# 2. 해당 프로세스 종료
kill 4521

# 3. 프로세스 종료 확인
ss -tlnp | grep :8080

# 4. 애플리케이션 재시작
./server.sh start
```

### 실무 팁

포트 충돌은 이전 프로세스가 비정상 종료되어 포트를 반환하지 않았거나, 테스트 서버를 종료하지 않은 경우에 흔히 발생합니다. 서비스를 `systemd`로 관리하면 `ExecStartPre`에 포트 점유 확인 로직을 넣어 선제적으로 대응할 수 있습니다. `SO_REUSEADDR` 소켓 옵션을 애플리케이션에 적용하면 TIME_WAIT 상태의 포트도 즉시 재사용할 수 있습니다.
