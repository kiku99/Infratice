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

웹 서비스에 요청이 도달하지 않는 것으로 의심됩니다. 서비스 로그에는 요청 기록이 없지만 클라이언트는 요청을 보냈다고 주장합니다. 서버에서 캡처한 포트 80 트래픽과 관련 로그를 분석하여 요청이 실제로 서버까지 도달했는지, 그리고 문제가 네트워크 레벨인지 애플리케이션 레벨인지 판단하세요.

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

### tcpdump -i eth0 -nn -A -c 6 host 192.168.1.23 and port 80

```bash
12:14:03.100001 IP 192.168.1.23.49832 > 192.168.1.50.80: Flags [S], seq 34823901, win 64240, length 0
12:14:03.100025 IP 192.168.1.50.80 > 192.168.1.23.49832: Flags [S.], seq 91234001, ack 34823902, win 65160, length 0
12:14:03.100104 IP 192.168.1.23.49832 > 192.168.1.50.80: Flags [.], ack 1, win 64240, length 0
12:14:03.100310 IP 192.168.1.23.49832 > 192.168.1.50.80: Flags [P.], seq 1:83, ack 1, win 64240, length 82: HTTP: GET / HTTP/1.1
E..r..@.@........P.......
Host: 192.168.1.50
User-Agent: curl/8.5.0
Accept: */*

12:14:03.100322 IP 192.168.1.50.80 > 192.168.1.23.49832: Flags [.], ack 83, win 65024, length 0
12:14:08.101991 IP 192.168.1.23.49832 > 192.168.1.50.80: Flags [F.], seq 83, ack 1, win 64240, length 0
```

### tail -n 5 /var/log/nginx/error.log

```log
2026/03/17 12:14:08 [error] 1234#1234: *104 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 192.168.1.23, server: _, request: "GET / HTTP/1.1", upstream: "http://127.0.0.1:8080/", host: "192.168.1.50"
```

## 해설

### 원인 분석

`tcpdump` 결과를 보면 클라이언트 `192.168.1.23`와 서버 `192.168.1.50:80` 사이에서 TCP 3-way handshake가 정상적으로 완료되었습니다. 이어서 `Flags [P.]` 패킷 안에 `GET / HTTP/1.1` 요청과 `Host` 헤더까지 포함되어 있으므로, HTTP 요청은 실제로 서버의 Nginx 프로세스가 리슨 중인 포트 80까지 도달했습니다.

서버는 요청 payload에 대해 `ack 83`으로 응답했지만, 이후 `HTTP/1.1 200`이나 `HTTP/1.1 5xx` 같은 애플리케이션 응답 패킷은 보이지 않습니다. 대신 `nginx` 에러 로그에는 `upstream timed out ... 127.0.0.1:8080` 메시지가 남아 있습니다. 즉 네트워크 경로 문제로 패킷이 유실된 것이 아니라, Nginx 뒤의 업스트림 애플리케이션이 제때 응답하지 못해 클라이언트가 타임아웃된 상황입니다.

### 해결 방법

```bash
# 1. 포트 80 트래픽을 pcap 파일로 캡처
tcpdump -i eth0 -nn host 192.168.1.23 and port 80 -c 20 -w /tmp/http_traffic.pcap

# 2. 다른 터미널에서 재현 요청 전송
curl -v http://192.168.1.50/

# 3. 캡처 파일을 읽어 handshake와 HTTP 요청 확인
tcpdump -r /tmp/http_traffic.pcap -nn -A

# 4. HTTP 응답 패킷이 없는지 확인
tcpdump -r /tmp/http_traffic.pcap -nn -A | rg 'HTTP/1\.[01]'

# 5. Nginx 에러 로그에서 업스트림 타임아웃 여부 확인
tail -n 20 /var/log/nginx/error.log

# 6. 업스트림 애플리케이션 상태와 응답 확인
ss -tlnp | grep :8080
curl -v http://127.0.0.1:8080/
```

```bash
# tcpdump 주요 옵션:
# -i eth0      : eth0 인터페이스에서 캡처
# -c 20        : 20개 패킷만 캡처
# -w file.pcap : pcap 파일로 저장
# -r file.pcap : pcap 파일 읽기
# -nn          : IP/포트를 숫자로 표시 (DNS 조회 안 함)
# -A           : 패킷 payload를 ASCII로 표시
# host ...     : 특정 클라이언트와의 통신만 필터
# port 80      : 포트 80 트래픽만 필터
```

### 실무 팁

`tcpdump`에서 SYN, ACK, HTTP payload까지 보인다면 "패킷이 서버까지 왔는가?"에는 답할 수 있습니다. 그 다음에는 반드시 웹 서버 에러 로그와 업스트림 상태를 함께 봐야 네트워크 문제와 애플리케이션 문제를 구분할 수 있습니다. 프로덕션 환경에서 캡처할 때는 민감 데이터가 포함될 수 있으므로 저장 범위와 보관 기간을 최소화하세요.
