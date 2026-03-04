---
id: "network-010"
title: "DNS 불일치로 인한 도메인 해석 실패 해결"
category: "network"
difficulty: 1
tags: ["dns", "hosts", "resolve", "ipv4", "ipv6"]
hints:
  - "`/etc/hosts` 파일로 로컬 DNS 해석을 오버라이드할 수 있습니다."
  - "IPv4와 IPv6 레코드를 각각 확인해 보세요."
  - "`dig` 또는 `nslookup`으로 DNS 조회 결과를 확인할 수 있습니다."
---

## 상황

모니터링 알림에 따르면 서버 간 DNS 해석 결과가 불일치하고 있습니다. 내부 도메인 `example.local`이 일부 서버에서 해석되지 않아 서비스 간 통신이 실패합니다. DNS 서버 수정에는 시간이 걸리므로, 즉시 조치를 위해 로컬에서 해결하세요.

## 데이터

### dig example.local

```bash
;; QUESTION SECTION:
;example.local.                 IN      A

;; ANSWER SECTION:
(응답 없음)

;; Query time: 50 msec
;; SERVER: 192.168.1.1#53(192.168.1.1)
```

### dig example.local AAAA

```bash
;; QUESTION SECTION:
;example.local.                 IN      AAAA

;; ANSWER SECTION:
(응답 없음)
```

### curl 테스트

```bash
$ curl http://example.local/api/health
curl: (6) Could not resolve host: example.local
```

### 정상 서버에서 확인된 IP

```plaintext
IPv4: 198.51.100.42
IPv6: 2001:db8:85a3::8a2e:370:7334
```

## 해설

### 원인 분석

`dig` 조회 결과 DNS 서버(192.168.1.1)에서 `example.local`에 대한 A 레코드(IPv4)와 AAAA 레코드(IPv6) 모두 응답이 없습니다. DNS 서버의 레코드 설정 문제이거나, 해당 서버의 DNS 설정이 잘못된 것입니다.

다른 정상 서버에서는 `198.51.100.42`(IPv4)와 `2001:db8:85a3::8a2e:370:7334`(IPv6)로 해석되므로, 로컬 `/etc/hosts` 파일에 수동 등록하여 즉시 해결할 수 있습니다.

### 해결 방법

```bash
# 1. /etc/hosts에 IPv4, IPv6 레코드 추가
echo "198.51.100.42 example.local" >> /etc/hosts
echo "2001:db8:85a3::8a2e:370:7334 example.local" >> /etc/hosts

# 2. 해석 확인
getent hosts example.local

# 3. 연결 테스트
curl http://example.local/api/health

# 4. (DNS 서버 수정 후) /etc/hosts 임시 항목 제거
sed -i '/example.local/d' /etc/hosts
```

### 실무 팁

`/etc/hosts`는 DNS 서버보다 우선하므로 긴급 조치에 유용하지만, 임시 해결책입니다. 서버가 많으면 일관성 유지가 어려우므로 반드시 DNS 서버에서 근본 해결하세요. `/etc/nsswitch.conf`의 `hosts:` 라인에서 `files dns` 순서를 확인하면 이름 해석 우선순위를 알 수 있습니다. 내부 도메인 관리에는 CoreDNS나 dnsmasq 같은 경량 DNS 서버를 활용하면 편리합니다.
