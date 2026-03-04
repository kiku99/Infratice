---
id: "network-002"
title: "고속 HTTP 요청으로 인한 포트 고갈 장애"
category: "network"
difficulty: 2
tags: ["port-exhaustion", "sysctl", "tcp", "ephemeral-port"]
hints:
  - "서비스 로그에서 HTTP 상태 코드 000이 의미하는 바를 생각해 보세요."
  - "`ss` 명령어로 TIME_WAIT 상태의 소켓이 얼마나 많은지 확인해 보세요."
  - "리눅스의 임시 포트(ephemeral port) 범위를 확인해 보세요."
---

## 상황

서버에서 실행 중인 `web-scraper` 서비스가 연속적으로 HTTP 요청을 보내고 있습니다. 최근 연결 실패가 빈번하게 발생하며, 로그에 HTTP 상태 코드 `000`(연결 불가)이 기록되고 있습니다. 네트워크는 정상이고 원격 서버도 접근 가능한 상태입니다. 원인을 분석하고 해결하세요.

## 데이터

### systemctl status web-scraper (발췌)

```bash
● web-scraper.service - Web Scraper Service
     Active: active (running) since Mon 2026-03-02 08:00:00 UTC; 2 days ago
   Main PID: 3456 (scraper)

Mar 04 10:15:01 server scraper[3456]: HTTP Status: 000 - Connection failed to https://example.com
Mar 04 10:15:01 server scraper[3456]: HTTP Status: 000 - Connection failed to https://example.org
Mar 04 10:15:02 server scraper[3456]: Error: Cannot assign requested address
```

### ss -s 출력

```bash
Total: 65432
TCP:   64890 (estab 245, closed 62100, orphaned 0, timewait 62100)

Transport    Total     IP     IPv6
RAW          0         0      0
UDP          4         3      1
TCP          2790      2780   10
INET         2794      2783   11
```

### sysctl net.ipv4.ip_local_port_range

```bash
net.ipv4.ip_local_port_range = 32768    60999
```

## 해설

### 원인 분석

`ss -s` 출력에서 TIME_WAIT 상태의 소켓이 **62,100개**에 달합니다. 에러 메시지 `Cannot assign requested address`는 사용 가능한 임시 포트(ephemeral port)가 모두 소진되었음을 의미합니다.

현재 임시 포트 범위가 `32768~60999`로 **28,232개**만 사용 가능한데, TIME_WAIT 상태의 소켓이 이 범위를 훨씬 초과하고 있습니다. 스크래퍼가 고속으로 HTTP 연결을 생성하면서 종료된 소켓이 TIME_WAIT 상태(기본 60초)로 포트를 계속 점유하고 있어 새 연결을 위한 포트가 남아있지 않습니다.

### 해결 방법

```bash
# 1. 임시 포트 범위 확장
sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# 2. TIME_WAIT 소켓 재사용 허용
sysctl -w net.ipv4.tcp_tw_reuse=1

# 3. 설정 영구 적용
echo "net.ipv4.ip_local_port_range = 1024 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_tw_reuse = 1" >> /etc/sysctl.conf
sysctl -p

# 4. 연결 테스트
curl -o /dev/null -s -w "HTTP Status: %{http_code}\n" http://example.com
```

### 실무 팁

`tcp_tw_reuse`는 TIME_WAIT 소켓을 새 아웃바운드 연결에 재사용하므로 클라이언트 측에서 안전하게 사용할 수 있습니다. 반면 `tcp_tw_recycle`은 NAT 환경에서 문제를 유발하므로 사용하지 마세요(Linux 4.12부터 제거됨). 근본적으로는 HTTP Keep-Alive와 커넥션 풀링을 활용하여 연결 생성 빈도 자체를 줄이는 것이 가장 효과적입니다.
