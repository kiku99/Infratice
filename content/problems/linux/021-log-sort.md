---
id: "linux-021"
title: "여러 서버의 로그를 타임스탬프 기준으로 정렬하기"
category: "linux"
difficulty: 1
tags: ["sort", "log", "timestamp", "aggregation"]
hints:
  - "`sort` 명령어로 텍스트 파일을 특정 필드 기준으로 정렬할 수 있습니다."
  - "타임스탬프가 `YYYY-MM-DD HH:MM:SS` 형식이면 문자열 정렬만으로 시간순 정렬이 됩니다."
  - "동일 타임스탬프가 있을 때 2차 정렬 기준을 추가할 수 있습니다."
---

## 상황

여러 서버(api01, api02, cache01, db02)의 로그를 하나의 파일로 합쳤습니다. 그러나 서버별로 따로 수집했기 때문에 시간순이 섞여 있습니다. 장애 타임라인 분석을 위해 타임스탬프 기준으로 정렬하세요.

## 데이터

### /tmp/app_combined.log

```log
2026-03-04 14:23:45 api02 POST /users/create 201
2026-03-04 14:22:10 cache01 CACHE_MISS key=session_abc
2026-03-04 14:22:55 api01 GET /products/list 200
2026-03-04 14:22:10 db02 INSERT INTO orders VALUES (...)
2026-03-04 14:24:12 cache01 CACHE_SET key=user_profile
2026-03-04 14:21:30 api01 GET /health 200
2026-03-04 14:23:45 db02 SELECT * FROM users WHERE id=42
```

## 해설

### 원인 분석

로그가 수집 순서대로 합쳐져 있어 시간순이 뒤섞여 있습니다. 장애 분석을 위해서는 타임스탬프 기준으로 정렬하고, 동일 시간대의 이벤트는 호스트명 기준으로 2차 정렬하면 인과 관계를 파악하기 쉽습니다.

### 해결 방법

```bash
# 1. 타임스탬프(1~2번째 필드) 기준 정렬, 동일 시간은 호스트명(3번째 필드)으로 2차 정렬
sort -k1,2 -k3,3 /tmp/app_combined.log > /tmp/app_sorted.log

# 2. 정렬 결과 확인
cat /tmp/app_sorted.log
# 2026-03-04 14:21:30 api01 GET /health 200
# 2026-03-04 14:22:10 cache01 CACHE_MISS key=session_abc
# 2026-03-04 14:22:10 db02 INSERT INTO orders VALUES (...)
# 2026-03-04 14:22:55 api01 GET /products/list 200
# 2026-03-04 14:23:45 api02 POST /users/create 201
# 2026-03-04 14:23:45 db02 SELECT * FROM users WHERE id=42
# 2026-03-04 14:24:12 cache01 CACHE_SET key=user_profile
```

```bash
# sort 주요 옵션:
# -k1,2       : 1~2번째 필드 기준 정렬 (날짜+시간)
# -k3,3       : 3번째 필드 기준 2차 정렬 (호스트명)
# -t ','      : 구분자를 콤마로 지정 (CSV 파일 등)
# -r          : 역순 정렬
# -n          : 숫자 기준 정렬
# -u          : 중복 제거
```

### 실무 팁

여러 서버의 로그를 분석할 때는 NTP로 서버 간 시간 동기화가 되어 있어야 정확한 타임라인을 구성할 수 있습니다. 로그 형식이 `YYYY-MM-DD HH:MM:SS`인 경우 문자열 정렬(사전순)과 시간 정렬이 동일하므로 별도 변환 없이 `sort`만으로 정렬 가능합니다. 대규모 로그 분석에는 Loki나 ELK Stack 같은 전용 도구를 사용하는 것이 효율적입니다.
