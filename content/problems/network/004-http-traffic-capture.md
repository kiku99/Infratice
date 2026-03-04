---
id: "network-004"
title: "tcpdump를 이용한 HTTP 트래픽 캡처 및 분석"
category: "network"
difficulty: 2
tags: ["tcpdump", "pcap", "http", "packet-capture", "tcp"]
hints:
  - "`tcpdump`로 특정 포트의 네트워크 패킷을 캡처할 수 있습니다."
  - "`-w` 옵션으로 pcap 파일에 저장하고, `-r` 옵션으로 읽을 수 있습니다."
  - "TCP 플래그(SYN, ACK, FIN 등)로 연결 상태를 파악할 수 있습니다."
---

## 상황

웹 서비스에 요청이 도달하지 않는 것으로 의심됩니다. 서비스 로그에는 요청 기록이 없지만 클라이언트는 요청을 보냈다고 주장합니다. 네트워크 레벨에서 포트 80의 트래픽을 캡처하여 실제로 패킷이 서버에 도달하는지 확인하세요.

## 데이터

### 서비스 로그 (최근 10분)

```log
(요청 기록 없음)
```

### 클라이언트 측 curl 결과

```bash
$ curl -v http://192.168.1.50/
*   Trying 192.168.1.50:80...
* Connected to 192.168.1.50 (192.168.1.50) port 80
> GET / HTTP/1.1
> Host: 192.168.1.50
...
(응답 대기 중 타임아웃)
```

### ss -tlnp | grep :80

```bash
LISTEN  0  511  0.0.0.0:80  0.0.0.0:*  users:(("nginx",pid=1234,fd=6))
```

## 해설

### 원인 분석

Nginx는 포트 80에서 수신 대기 중이고, 클라이언트는 연결에 성공했다고 표시하지만 서비스 로그에 기록이 없습니다. 이런 경우 네트워크 레벨에서 패킷을 캡처하여 TCP 핸드셰이크와 HTTP 요청이 실제로 전달되는지 확인해야 합니다.

### 해결 방법

```bash
# 1. 포트 80 트래픽 캡처 (10개 패킷 제한, pcap 저장)
tcpdump -i any port 80 -c 10 -w /tmp/http_traffic.pcap

# 2. (다른 터미널에서) 테스트 요청 발생
curl http://localhost/

# 3. 캡처 파일 읽기
tcpdump -r /tmp/http_traffic.pcap -nn

# 4. TCP 핸드셰이크와 플래그 분석
tcpdump -r /tmp/http_traffic.pcap -nn 'tcp[tcpflags] & (tcp-syn|tcp-fin|tcp-rst) != 0'

# 5. 사람이 읽기 쉬운 요약 생성
tcpdump -r /tmp/http_traffic.pcap -nn | awk '{
  if (match($0, /IP ([^ ]+) > ([^ ]+):/, parts)) {
    print parts[1] " -> " parts[2]
  }
}' > /tmp/http_summary.txt
```

```bash
# tcpdump 주요 옵션:
# -i any       : 모든 인터페이스 캡처
# -c 10        : 10개 패킷만 캡처
# -w file.pcap : pcap 파일로 저장
# -r file.pcap : pcap 파일 읽기
# -nn          : IP/포트를 숫자로 표시 (DNS 조회 안 함)
# port 80      : 포트 80 트래픽만 필터
```

### 실무 팁

`tcpdump`는 네트워크 문제 디버깅의 핵심 도구입니다. 캡처 시 `-c` 옵션으로 패킷 수를 제한하지 않으면 디스크가 빠르게 채워질 수 있습니다. 더 상세한 분석이 필요하면 pcap 파일을 Wireshark로 열어 GUI 기반 분석이 가능합니다. 프로덕션 환경에서 캡처할 때는 민감 데이터(인증 토큰, 개인정보) 노출에 주의하세요.
