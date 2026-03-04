---
id: "network-005"
title: "네트워크 구간별 패킷 손실 원인 진단"
category: "network"
difficulty: 1
tags: ["ping", "packet-loss", "gateway", "dns", "latency"]
hints:
  - "게이트웨이, DNS 서버, 외부 인터넷 각 구간을 순서대로 테스트해 보세요."
  - "`ping`의 통계 출력에서 패킷 손실률과 평균 지연 시간을 확인할 수 있습니다."
  - "손실이 발생하는 구간에 따라 문제의 범위가 달라집니다."
---

## 상황

사용자들이 간헐적인 타임아웃을 보고하고 있습니다. 패킷 손실이 로컬 네트워크에서 발생하는지, 업스트림 게이트웨이에서 발생하는지, 외부 인터넷에서 발생하는지 구간별로 진단하세요.

## 데이터

### ip route | grep default

```bash
default via 192.168.1.1 dev eth0
```

### ping -c 5 192.168.1.1 (게이트웨이)

```bash
PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.
64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=1.23 ms
64 bytes from 192.168.1.1: icmp_seq=2 ttl=64 time=1.15 ms
64 bytes from 192.168.1.1: icmp_seq=3 ttl=64 time=1.31 ms
64 bytes from 192.168.1.1: icmp_seq=4 ttl=64 time=1.18 ms
64 bytes from 192.168.1.1: icmp_seq=5 ttl=64 time=1.25 ms

--- 192.168.1.1 ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4006ms
rtt min/avg/max/mdev = 1.150/1.224/1.310/0.057 ms
```

### ping -c 5 8.8.8.8 (DNS)

```bash
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=15.8 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=14.9 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=118 time=16.2 ms
64 bytes from 8.8.8.8: icmp_seq=4 ttl=118 time=15.1 ms
64 bytes from 8.8.8.8: icmp_seq=5 ttl=118 time=15.5 ms

--- 8.8.8.8 ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4005ms
rtt min/avg/max/mdev = 14.900/15.500/16.200/0.466 ms
```

### ping -c 5 google.com (외부)

```bash
PING google.com (142.250.196.110) 56(84) bytes of data.
64 bytes from 142.250.196.110: icmp_seq=1 ttl=118 time=82.3 ms
64 bytes from 142.250.196.110: icmp_seq=3 ttl=118 time=95.1 ms
64 bytes from 142.250.196.110: icmp_seq=5 ttl=118 time=88.7 ms

--- google.com ping statistics ---
5 packets transmitted, 3 received, 40% packet loss, time 4008ms
rtt min/avg/max/mdev = 82.300/88.700/95.100/5.232 ms
```

## 해설

### 원인 분석

구간별 분석 결과:
- **게이트웨이(192.168.1.1)**: 패킷 손실 0%, 지연 1.2ms → 로컬 네트워크 정상
- **DNS(8.8.8.8)**: 패킷 손실 0%, 지연 15.5ms → ISP 구간 정상
- **외부(google.com)**: 패킷 손실 **40%**, 지연 88.7ms → 외부 인터넷 구간 문제

로컬 네트워크와 ISP 구간까지는 정상이지만, 외부 인터넷 통신에서 40% 패킷 손실이 발생하고 있습니다. ISP의 상위 라우팅 경로에 문제가 있거나, 특정 목적지로의 경로에 혼잡이 있는 것으로 판단됩니다.

### 해결 방법

```bash
# 1. 기본 게이트웨이 확인
ip route | grep default

# 2. 구간별 ping 테스트 및 결과 저장
{
  echo "=== Gateway ==="
  ping -c 5 192.168.1.1 | tail -2
  echo ""
  echo "=== DNS (8.8.8.8) ==="
  ping -c 5 8.8.8.8 | tail -2
  echo ""
  echo "=== Internet (google.com) ==="
  ping -c 5 google.com | tail -2
} > /tmp/network_diagnostics.txt

# 3. 상세 경로 분석
traceroute google.com

# 4. MTR로 지속적 모니터링 (패킷 손실 구간 정확히 파악)
mtr -rw -c 20 google.com
```

### 실무 팁

`mtr`(My Traceroute)은 `ping`과 `traceroute`를 결합한 도구로, 각 홉별 패킷 손실률과 지연을 실시간으로 보여줍니다. 패킷 손실이 특정 홉에서만 발생하면 해당 라우터의 ICMP 제한일 수 있으므로, 실제 애플리케이션 트래픽(TCP)으로도 테스트해야 합니다. ISP 문제로 판단되면 ISP에 `mtr` 결과를 첨부하여 신고하세요.
