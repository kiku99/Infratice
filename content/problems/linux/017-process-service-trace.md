---
id: "linux-017"
title: "리소스 과다 사용 프로세스의 systemd 서비스 추적"
category: "linux"
difficulty: 3
tags: ["systemd", "process", "journalctl", "service", "troubleshooting"]
hints:
  - "`systemctl status <PID>`로 PID가 어떤 서비스에 속하는지 확인할 수 있습니다."
  - "`journalctl -u <service>`로 특정 서비스의 로그를 볼 수 있습니다."
  - "PID에서 서비스명을 역추적하는 방법을 찾아보세요."
---

## 상황

`top`에서 CPU를 과다 사용하는 프로세스(PID 4567)를 발견했지만, 이 프로세스가 어떤 서비스에 속하는지, 누가 시작했는지 알 수 없습니다. 프로세스의 출처를 추적하고 서비스 상태와 로그를 확인하세요.

## 데이터

### top 출력 (발췌)

```bash
  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM   TIME+ COMMAND
 4567 www-data  20   0  892340 125600  45670 R  95.2   6.1  85:12 nginx
```

### systemctl status 4567

```bash
● nginx.service - A high performance web server and reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2026-03-02 14:00:00 UTC; 2 days ago
    Process: 4560 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=0/SUCCESS)
   Main PID: 4565 (nginx)
      Tasks: 5 (limit: 4915)
     Memory: 245.6M
        CPU: 1h 25min 12.345s
     CGroup: /system.slice/nginx.service
             ├─4565 nginx: master process /usr/sbin/nginx
             ├─4567 nginx: worker process
             ├─4568 nginx: worker process
             └─4569 nginx: worker process
```

### journalctl -u nginx.service --no-pager -n 10

```log
Mar 04 10:00:01 server nginx[4567]: *12345 upstream timed out (110: Connection timed out)
Mar 04 10:00:02 server nginx[4567]: *12346 upstream timed out (110: Connection timed out)
Mar 04 10:00:03 server nginx[4567]: *12347 client request body is buffered to temp file
Mar 04 10:00:04 server nginx[4567]: *12348 upstream timed out (110: Connection timed out)
...
```

## 해설

### 원인 분석

`systemctl status 4567` 명령으로 PID 4567이 **nginx.service**의 워커 프로세스임을 확인했습니다. `journalctl` 로그에서 다수의 `upstream timed out` 에러가 확인되어, 백엔드 서버의 응답 지연으로 인해 nginx 워커가 과도한 CPU를 소비하는 것으로 보입니다.

업스트림 타임아웃으로 인해 연결이 누적되면서 워커 프로세스의 부하가 증가한 것이 근본 원인입니다.

### 해결 방법

```bash
# 1. PID로 서비스 추적
systemctl status <PID>

# 2. 서비스 상세 상태 확인
systemctl status nginx.service --no-pager

# 3. 최근 로그 확인 (마지막 20줄)
journalctl -u nginx.service --no-pager -n 20

# 4. 업스트림 서버 상태 점검
curl -I http://127.0.0.1:3000/health

# 5. nginx 설정에서 타임아웃 조정
# proxy_connect_timeout 5s;
# proxy_read_timeout 30s;

# 6. nginx 재로드
nginx -t && systemctl reload nginx
```

### 실무 팁

PID에서 서비스를 역추적할 때 `systemctl status <PID>` 또는 `cat /proc/<PID>/cgroup`을 활용하세요. 트러블슈팅 스크립트를 만들어 PID를 입력하면 서비스명, 상태, 최근 로그를 한 번에 출력하도록 자동화하면 반복 작업을 줄일 수 있습니다. `journalctl`의 `--since`, `--until` 옵션으로 특정 시간대의 로그만 필터링할 수 있습니다.
