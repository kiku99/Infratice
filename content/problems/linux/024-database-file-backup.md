---
id: "linux-024"
title: "데이터베이스 파일 재귀적 백업 생성하기"
category: "linux"
difficulty: 1
tags: ["find", "backup", "cp", "database", "recursive"]
hints:
  - "`find`로 특정 확장자 파일을 재귀적으로 검색할 수 있습니다."
  - "`-exec`로 검색된 각 파일에 명령어를 실행할 수 있습니다."
  - "원본 파일은 그대로 두고 `.bak` 접미사를 붙인 복사본을 만드세요."
---

## 상황

데이터베이스 스키마 마이그레이션을 진행하기 전에 `/opt/data/` 하위에 분산되어 있는 모든 `.db` 파일의 백업 복사본을 만들어야 합니다. 원본 파일은 유지하면서 각 `.db` 파일 옆에 `.db.bak` 파일을 생성하세요.

## 데이터

### find /opt/data -name "*.db" -type f

```bash
/opt/data/apps/inventory.db
/opt/data/logs/session.db
/opt/data/config/settings.db
```

### 원하는 결과

```bash
/opt/data/apps/inventory.db
/opt/data/apps/inventory.db.bak
/opt/data/logs/session.db
/opt/data/logs/session.db.bak
/opt/data/config/settings.db
/opt/data/config/settings.db.bak
```

## 해설

### 원인 분석

`.db` 파일이 `/opt/data/` 하위 여러 서브디렉터리에 분산되어 있으므로, 재귀적으로 검색하여 각 파일의 같은 디렉터리에 백업 복사본을 생성해야 합니다.

### 해결 방법

```bash
# 1. 대상 파일 확인
find /opt/data -name "*.db" -type f

# 2. 백업 복사본 생성 (원본과 같은 위치에 .bak 추가)
find /opt/data -name "*.db" -type f -exec cp {} {}.bak \;

# 3. 백업 파일 생성 확인
find /opt/data -name "*.db.bak" -type f

# 4. 원본과 백업 모두 확인
find /opt/data -name "*.db*" -type f | sort
```

```bash
# 대안: for 루프 사용
for f in $(find /opt/data -name "*.db" -type f); do
  cp "$f" "${f}.bak"
done
```

### 실무 팁

백업 시 `cp -p`를 사용하면 파일의 권한, 소유자, 타임스탬프를 보존할 수 있습니다. 마이그레이션 전 백업은 스크립트로 자동화하고, 백업 파일 목록을 로그에 기록해 두면 복원이 필요할 때 빠르게 대응할 수 있습니다. 대용량 `.db` 파일의 경우 SQLite의 `.backup` 명령이나 `pg_dump`처럼 데이터베이스 전용 백업 도구를 사용하는 것이 데이터 무결성 측면에서 더 안전합니다.
