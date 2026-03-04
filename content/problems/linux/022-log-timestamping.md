---
id: "linux-022"
title: "타임스탬프 없는 로그 출력에 시간 정보 추가하기"
category: "linux"
difficulty: 2
tags: ["log", "timestamp", "awk", "pipe", "script"]
hints:
  - "`awk`나 `while read`로 각 줄마다 타임스탬프를 추가할 수 있습니다."
  - "`date` 명령어로 현재 시간을 특정 형식으로 출력할 수 있습니다."
  - "파이프(`|`)를 사용하여 다른 프로그램의 출력에 연결할 수 있습니다."
---

## 상황

수동으로 실행한 서비스의 로그 출력에 타임스탬프가 포함되어 있지 않아, 이벤트 발생 시간과 순서를 분석하기 어렵습니다. 실시간으로 각 줄에 타임스탬프를 추가하는 스크립트를 작성하세요.

## 데이터

### 서비스 출력 (타임스탬프 없음)

```log
Application started
Processing request #1234
Database connection established
Cache warming completed
Request completed
```

### 원하는 출력

```log
Application started - 2026-03-04 15:30:45
Processing request #1234 - 2026-03-04 15:30:46
Database connection established - 2026-03-04 15:30:47
Cache warming completed - 2026-03-04 15:30:48
Request completed - 2026-03-04 15:30:49
```

## 해설

### 원인 분석

많은 애플리케이션이 stdout으로 로그를 출력할 때 자체 타임스탬프를 포함하지 않습니다. 이런 경우 셸 파이프라인과 간단한 스크립트를 조합하여 실시간으로 타임스탬프를 추가할 수 있습니다.

### 해결 방법

```bash
# 방법 1: while read 사용
./my-service | while IFS= read -r line; do
  echo "$line - $(date '+%Y-%m-%d %H:%M:%S')"
done

# 방법 2: awk 사용
./my-service | awk '{ print $0 " - " strftime("%Y-%m-%d %H:%M:%S") }'

# 방법 3: 재사용 가능한 스크립트로 저장
cat > /usr/local/bin/timestamp.sh << 'EOF'
#!/bin/bash
while IFS= read -r line; do
  echo "$line - $(date '+%Y-%m-%d %H:%M:%S')"
done
EOF
chmod +x /usr/local/bin/timestamp.sh

# 사용 예시
./my-service | timestamp.sh
tail -f /var/log/app.log | timestamp.sh
```

### 실무 팁

`ts` 명령어(`moreutils` 패키지)를 설치하면 더 간편하게 `./my-service | ts '%Y-%m-%d %H:%M:%S'`로 타임스탬프를 추가할 수 있습니다. systemd 서비스로 관리되는 프로세스는 journald가 자동으로 타임스탬프를 기록하므로 `journalctl -u <service>`로 확인 가능합니다. 프로덕션 환경에서는 애플리케이션 레벨에서 구조화된 로그(JSON)를 출력하도록 설정하는 것이 가장 좋은 방법입니다.
