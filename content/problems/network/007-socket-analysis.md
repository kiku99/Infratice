---
id: "network-007"
title: "과도한 TCP 연결로 인한 네트워크 지연 분석"
category: "network"
difficulty: 1
tags: ["tcp", "socket", "ss", "connection", "latency"]
hints:
  - "`ss`로 활성 TCP 연결 상태별 수를 확인해 보세요."
  - "ESTABLISHED, TIME_WAIT, CLOSE_WAIT 등 상태별 의미를 생각해 보세요."
  - "어떤 프로세스가 가장 많은 연결을 보유하고 있는지 확인해 보세요."
---

## 상황

네트워크 지연이 보고되었습니다. 특정 애플리케이션이 과도한 TCP 연결을 생성하여 시스템 리소스를 소비하고 있는 것으로 의심됩니다. 활성 소켓을 분석하여 원인 프로세스를 식별하세요.

## 데이터

### ss -s 출력

```bash
Total: 12456
TCP:   12100 (estab 11800, closed 120, orphaned 5, timewait 120)

Transport    Total     IP     IPv6
TCP          11980     11970  10
UDP          8         7      1
```

### ss -tnp | awk '{print $6}' | sort | uniq -c | sort -rn | head -5

```bash
  11650 users:(("crawler",pid=4567,fd=...))
    85 users:(("nginx",pid=1234,fd=...))
    42 users:(("postgres",pid=2345,fd=...))
    15 users:(("sshd",pid=3456,fd=...))
     8 users:(("redis",pid=5678,fd=...))
```

### ss -tn state established | head -10

```bash
Recv-Q  Send-Q  Local Address:Port    Peer Address:Port
0       0       192.168.1.50:45231    203.0.113.10:80
0       0       192.168.1.50:45232    203.0.113.10:80
0       0       192.168.1.50:45233    203.0.113.11:80
0       0       192.168.1.50:45234    203.0.113.11:80
...
```

## 해설

### 원인 분석

시스템에 **11,800개의 ESTABLISHED TCP 연결**이 존재하며, 이 중 `crawler` 프로세스(PID 4567)가 **11,650개(98.7%)**를 점유하고 있습니다. 이는 비정상적으로 높은 수치로, 크롤러가 동시 연결 수를 제한하지 않고 대량의 아웃바운드 HTTP 연결을 생성한 것이 네트워크 지연의 원인입니다.

나머지 서비스(nginx 85개, postgres 42개)는 정상 범위입니다.

### 해결 방법

```bash
# 1. 활성 TCP/UDP 연결 전체 저장
ss -tnpa > /tmp/active_tcp.txt

# 2. 프로세스별 연결 수 확인
ss -tnp | awk '{print $6}' | grep -oP 'pid=\d+' | sort | uniq -c | sort -rn

# 3. 문제 프로세스 연결 수 제한 또는 종료
kill 4567

# 4. 연결 정리 확인
ss -s
```

### 실무 팁

`ss`는 `netstat`보다 빠르고 상세한 소켓 정보를 제공합니다. 프로세스별 연결 수를 주기적으로 모니터링하고, 크롤러나 스크래퍼에는 반드시 동시 연결 수 제한(`max_connections`)을 설정하세요. 시스템 레벨에서는 `/etc/security/limits.conf`의 `nofile` 설정으로 프로세스가 열 수 있는 최대 파일 디스크립터(소켓 포함) 수를 제한할 수 있습니다.
