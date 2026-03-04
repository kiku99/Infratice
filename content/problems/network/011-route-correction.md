---
id: "network-011"
title: "잘못된 인터페이스로 설정된 라우팅 경로 수정"
category: "network"
difficulty: 2
tags: ["routing", "ip-route", "interface", "gateway", "network"]
hints:
  - "현재 라우팅 테이블에서 `10.10.0.0/16` 서브넷이 어떤 인터페이스를 사용하는지 확인해 보세요."
  - "기존 경로를 삭제하고 올바른 인터페이스로 재설정해야 합니다."
  - "`ip route replace`로 경로를 한 번에 변경할 수도 있습니다."
---

## 상황

서버가 여러 네트워크 인터페이스(eth0, eth1)를 사용하고 있습니다. `10.10.0.0/16` 서브넷과의 통신에서 패킷 손실이 발생하고 있으며, 라우팅 경로가 잘못된 인터페이스를 사용하고 있는 것으로 의심됩니다. 라우팅을 확인하고 수정하세요.

## 데이터

### ip route 출력

```bash
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.50
192.168.100.0/24 dev eth1 proto kernel scope link src 192.168.100.50
10.10.0.0/16 via 192.168.50.1 dev eth0
```

### ping -c 5 10.10.1.100

```bash
PING 10.10.1.100 (10.10.1.100) 56(84) bytes of data.

--- 10.10.1.100 ping statistics ---
5 packets transmitted, 1 received, 80% packet loss, time 4020ms
rtt min/avg/max/mdev = 245.123/245.123/245.123/0.000 ms
```

### ip link show

```bash
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
```

### 네트워크 구성 (참고)

```plaintext
eth0: 192.168.1.0/24    → 인터넷/일반 트래픽
eth1: 192.168.100.0/24  → 내부 네트워크 (10.10.0.0/16 접근 가능)
올바른 게이트웨이: 192.168.100.1 (eth1 경유)
```

## 해설

### 원인 분석

라우팅 테이블에서 `10.10.0.0/16`이 `eth0`을 통해 `192.168.50.1` 게이트웨이로 설정되어 있습니다. 그러나 네트워크 구성상 `10.10.0.0/16`은 `eth1`을 통해 `192.168.100.1` 게이트웨이로 접근해야 합니다.

잘못된 인터페이스(eth0)로 트래픽이 전달되면서 80% 패킷 손실이 발생하고 있습니다. 일부 패킷이 도달하는 것은 게이트웨이 간 간접 경로가 존재하기 때문일 수 있습니다.

### 해결 방법

```bash
# 1. 현재 잘못된 경로 확인
ip route | grep 10.10

# 2. 잘못된 경로 삭제
ip route del 10.10.0.0/16 via 192.168.50.1 dev eth0

# 3. 올바른 경로 추가
ip route add 10.10.0.0/16 via 192.168.100.1 dev eth1

# 4. 경로 확인
ip route | grep 10.10
# 10.10.0.0/16 via 192.168.100.1 dev eth1

# 5. 연결 테스트
ping -c 5 10.10.1.100

# 대안: ip route replace로 한 번에 변경
# ip route replace 10.10.0.0/16 via 192.168.100.1 dev eth1
```

### 실무 팁

멀티 인터페이스 서버에서는 라우팅 테이블을 주의 깊게 관리해야 합니다. `ip route replace`는 기존 경로가 있으면 수정하고, 없으면 추가하므로 스크립트에서 더 안전하게 사용할 수 있습니다. `traceroute`로 실제 패킷 경로를 확인하면 라우팅 문제를 더 정확히 진단할 수 있습니다. 영구 경로는 네트워크 설정 파일에 추가하여 재부팅 후에도 유지되도록 하세요.
