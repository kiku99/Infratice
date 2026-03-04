---
id: "network-003"
title: "iptables를 이용한 포트 포워딩 설정"
category: "network"
difficulty: 2
tags: ["iptables", "port-forwarding", "redirect", "nat"]
hints:
  - "서비스가 8080에서 수신 중인지 먼저 확인하세요."
  - "`iptables`의 NAT 테이블에서 `REDIRECT` 타겟을 사용할 수 있습니다."
  - "외부 트래픽(PREROUTING)과 로컬 트래픽(OUTPUT) 모두 처리해야 합니다."
---

## 상황

서버에서 Java 애플리케이션이 포트 8080에서 실행 중입니다. 외부 클라이언트가 포트 8081로도 접근할 수 있어야 하지만, 애플리케이션 설정 변경이나 재시작은 불가능합니다. 포트 8081로 들어오는 트래픽을 8080으로 전달하도록 구성하세요.

## 데이터

### ss -tlnp | grep 8080

```bash
LISTEN  0  128  127.0.0.1:8080  0.0.0.0:*  users:(("java",pid=1234,fd=5))
```

### curl 테스트

```bash
$ curl http://127.0.0.1:8080/health
{"status": "ok"}

$ curl http://127.0.0.1:8081/health
curl: (7) Failed to connect to 127.0.0.1 port 8081: Connection refused
```

### iptables -t nat -L -n

```bash
Chain PREROUTING (policy ACCEPT)
target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination

Chain POSTROUTING (policy ACCEPT)
target     prot opt source               destination
```

## 해설

### 원인 분석

서비스가 `127.0.0.1:8080`에서만 수신 중이며, 포트 8081에는 어떤 프로세스도 바인딩되어 있지 않습니다. `iptables`의 NAT 테이블에도 규칙이 없어 포트 8081로의 요청은 `Connection refused`로 거부됩니다.

애플리케이션을 재시작할 수 없으므로, `iptables`의 `REDIRECT` 타겟을 사용하여 커널 레벨에서 포트 포워딩을 설정해야 합니다.

### 해결 방법

```bash
# 1. 외부 트래픽 포워딩 (PREROUTING 체인)
iptables -t nat -A PREROUTING -p tcp --dport 8081 -j REDIRECT --to-port 8080

# 2. 로컬(localhost) 트래픽 포워딩 (OUTPUT 체인)
iptables -t nat -A OUTPUT -p tcp -d 127.0.0.1 --dport 8081 -j REDIRECT --to-port 8080

# 3. 포워딩 동작 확인
curl http://127.0.0.1:8081/health

# 4. 규칙 확인
iptables -t nat -L -n

# 5. 재부팅 후에도 유지되도록 저장
iptables-save > /etc/iptables/rules.v4
```

### 실무 팁

`iptables` REDIRECT는 동일 호스트 내에서만 동작합니다. 다른 호스트로 포워딩하려면 `DNAT`과 `MASQUERADE`를 조합해야 하며, `net.ipv4.ip_forward=1` 설정도 필요합니다. 프로덕션 환경에서는 `nftables`(iptables 후속)나 Nginx/HAProxy 같은 리버스 프록시를 사용하는 것이 관리와 가시성 면에서 더 우수합니다.
