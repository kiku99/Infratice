---
id: "network-008"
title: "Nginx 트래픽 분석 기반 Rate Limit 설정"
category: "network"
difficulty: 3
tags: ["nginx", "rate-limit", "access-log", "traffic-analysis", "ddos"]
hints:
  - "액세스 로그에서 클라이언트 IP별 요청 수를 집계해 보세요."
  - "`awk`와 `sort`를 조합하면 IP별 요청 빈도를 분석할 수 있습니다."
  - "`limit_req_zone` 디렉티브의 문법을 확인해 보세요."
---

## 상황

Nginx 웹 서버에 특정 클라이언트로부터 과도한 트래픽이 유입되어 성능 문제가 발생하고 있습니다. 현재 Rate Limit이 설정되어 있지 않습니다. 액세스 로그를 분석하여 적절한 Rate Limit 값을 산출하고 Nginx에 적용하세요.

## 데이터

### /var/log/nginx/access.log (일부)

```log
203.0.113.10 - - [04/Mar/2026:10:00:01 +0000] "GET /api/data HTTP/1.1" 200 1234
203.0.113.10 - - [04/Mar/2026:10:00:01 +0000] "GET /api/users HTTP/1.1" 200 5678
203.0.113.25 - - [04/Mar/2026:10:00:01 +0000] "GET /api/data HTTP/1.1" 200 1234
203.0.113.10 - - [04/Mar/2026:10:00:02 +0000] "GET /api/data HTTP/1.1" 200 1234
198.51.100.5 - - [04/Mar/2026:10:00:02 +0000] "POST /api/login HTTP/1.1" 200 890
...
```

### awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -5

```bash
   4523 203.0.113.10
   3891 198.51.100.5
   3456 203.0.113.25
    234 10.0.0.50
     89 10.0.0.51
```

### /etc/nginx/nginx.conf (현재)

```nginx
http {
    # rate limit 설정 없음

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://backend;
        }
    }
}
```

## 해설

### 원인 분석

액세스 로그 분석 결과 상위 3개 IP가 비정상적으로 많은 요청을 보내고 있습니다:
- `203.0.113.10`: 4,523건
- `198.51.100.5`: 3,891건
- `203.0.113.25`: 3,456건

현재 Nginx에 Rate Limit이 설정되어 있지 않아, 이런 공격적 클라이언트의 트래픽이 제한 없이 백엔드로 전달되고 있습니다.

Rate Limit 산출: 상위 3개 IP 요청 합계(11,870) / 3 × 0.8 = **약 3,165 r/s**

### 해결 방법

```bash
# 1. 상위 3개 IP 요청 수 확인
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -3

# 2. Rate Limit 값 계산
TOP3_SUM=$((4523 + 3891 + 3456))
RATE_LIMIT=$(echo "$TOP3_SUM / 3 * 0.8" | bc | cut -d. -f1)
echo "Rate Limit: ${RATE_LIMIT}r/s"
```

```nginx
# 3. nginx.conf에 Rate Limit 설정 추가
http {
    limit_req_zone $binary_remote_addr zone=app_limit:10m rate=3165r/s;

    server {
        listen 80;
        server_name example.com;

        location / {
            limit_req zone=app_limit burst=50 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

```bash
# 4. 설정 검증 및 적용
nginx -t
systemctl reload nginx
```

### 실무 팁

`limit_req_zone`의 `zone=app_limit:10m`은 10MB 공유 메모리를 할당하여 약 160,000개의 클라이언트 IP를 추적할 수 있습니다. `burst`는 순간적 트래픽 급증을 허용하는 버퍼이고, `nodelay`는 버스트 내 요청을 지연 없이 처리합니다. 실무에서는 API 엔드포인트별로 다른 Rate Limit을 적용하고, `limit_req_status 429`로 초과 시 적절한 HTTP 상태 코드를 반환하세요.
