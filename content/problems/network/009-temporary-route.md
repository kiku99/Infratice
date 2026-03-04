---
id: "network-009"
title: "특정 서브넷으로의 임시 라우팅 경로 추가"
category: "network"
difficulty: 1
tags: ["route", "ip-route", "subnet", "gateway", "routing"]
hints:
  - "`ip route` 명령어로 현재 라우팅 테이블을 확인할 수 있습니다."
  - "`ip route add`로 새 경로를 추가할 수 있습니다."
  - "재부팅 시 사라지는 임시 경로와 영구 경로의 차이를 생각해 보세요."
---

## 상황

원격 서브넷 `10.20.0.0/16`에 접근해야 하지만, 현재 라우팅 테이블에 해당 경로가 없어 통신이 불가능합니다. 영구적인 설정 변경 없이 임시로 라우팅 경로를 추가하여 접근을 확보하세요.

## 데이터

### ip route 출력

```bash
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.50
172.16.0.0/16 via 192.168.1.254 dev eth0
```

### ping 테스트

```bash
$ ping -c 1 10.20.1.100
connect: Network is unreachable
```

### ip link show

```bash
1: lo: <LOOPBACK,UP> mtu 65536
2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500
3: veth0: <BROADCAST,MULTICAST,UP> mtu 1500
```

## 해설

### 원인 분석

라우팅 테이블에 `10.20.0.0/16` 서브넷에 대한 경로가 없습니다. 기본 경로(`default via 192.168.1.1`)는 일반 인터넷 트래픽을 처리하지만, 사설 네트워크 `10.20.0.0/16`은 별도의 경로가 필요합니다.

`Network is unreachable` 에러는 커널이 해당 목적지로 패킷을 전달할 경로를 찾지 못했음을 의미합니다.

### 해결 방법

```bash
# 1. 현재 라우팅 테이블에서 10.20.0.0 확인
ip route | grep 10.20
# (출력 없음 = 경로 없음)

# 2. 임시 정적 경로 추가
ip route add 10.20.0.0/16 via 192.168.1.1 dev veth0

# 3. 경로 추가 확인
ip route | grep 10.20
# 10.20.0.0/16 via 192.168.1.1 dev veth0

# 4. 연결 테스트
ping -c 3 10.20.1.100
```

```bash
# 경로 삭제 (작업 완료 후)
ip route del 10.20.0.0/16 via 192.168.1.1 dev veth0

# 참고: ip route add로 추가한 경로는 재부팅 시 자동 삭제됩니다.
# 영구 설정이 필요하면 /etc/netplan/ 또는 /etc/network/interfaces에 추가합니다.
```

### 실무 팁

`ip route add`로 추가한 경로는 메모리에만 존재하므로 재부팅 시 사라집니다. 임시 디버깅이나 점검 목적에 적합합니다. 영구 경로가 필요한 경우 Ubuntu는 `/etc/netplan/`, CentOS는 `/etc/sysconfig/network-scripts/route-<interface>`에 설정합니다. 여러 경로를 관리할 때는 `ip route show table all`로 모든 라우팅 테이블을 확인하세요.
