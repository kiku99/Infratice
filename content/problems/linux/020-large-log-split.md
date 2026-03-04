---
id: "linux-020"
title: "대용량 로그 파일 분할하여 분석하기"
category: "linux"
difficulty: 1
tags: ["split", "log", "file", "analysis"]
hints:
  - "`split` 명령어로 파일을 일정 크기나 줄 수 단위로 분할할 수 있습니다."
  - "`-l` 옵션으로 줄 수 기준, `-b` 옵션으로 바이트 기준 분할이 가능합니다."
---

## 상황

장애 조사를 위해 `/var/log/app/access.log` 파일을 내려받았는데 수 GB 크기여서 에디터나 분석 도구로 열 수 없습니다. 파일을 작은 조각으로 나누어 병렬 분석이 가능하도록 분할하세요.

## 데이터

### ls -lh /var/log/app/access.log

```bash
-rw-r--r-- 1 root root 2.5G Mar 04 10:00 /var/log/app/access.log
```

### wc -l /var/log/app/access.log

```bash
375000 /var/log/app/access.log
```

### head -3 /var/log/app/access.log

```log
2026-03-04 08:00:01 192.168.1.100 GET /api/users 200 45ms
2026-03-04 08:00:01 192.168.1.101 POST /api/login 401 12ms
2026-03-04 08:00:02 192.168.1.102 GET /api/products 200 89ms
```

## 해설

### 원인 분석

2.5GB, 375,000줄의 로그 파일은 일반 텍스트 에디터(vim, nano)로 열기 어렵고, `grep` 단독 검색도 시간이 오래 걸립니다. `split` 명령어로 파일을 적절한 크기로 분할하면 여러 사람이 병렬로 분석할 수 있습니다.

### 해결 방법

```bash
# 1. 분할 파일 저장 디렉터리 생성
mkdir -p /tmp/log_parts

# 2. 100줄 단위로 분할 (접두사 지정)
split -l 100000 /var/log/app/access.log /tmp/log_parts/access_part_

# 3. 분할 결과 확인
wc -l /tmp/log_parts/access_part_*

# 4. 원본 파일 무결성 확인
wc -l /var/log/app/access.log
cat /tmp/log_parts/access_part_* | wc -l
```

```bash
# split 주요 옵션:
# -l 100000     : 100,000줄 단위 분할
# -b 500M       : 500MB 단위 분할
# -n 4          : 균등하게 4개 파일로 분할
# --numeric-suffixes : 접미사를 숫자로 (aa→00, ab→01)
```

### 실무 팁

로그 분석 시 `split`으로 분할한 후 `xargs`나 GNU `parallel`과 조합하면 멀티코어를 활용한 병렬 검색이 가능합니다. 예: `ls /tmp/log_parts/ | xargs -P 4 -I {} grep "ERROR" /tmp/log_parts/{}`. 분할 전에 `head`와 `tail`로 시간 범위를 먼저 확인하면 필요한 구간만 추출하여 분석 범위를 줄일 수 있습니다.
