---
id: "linux-029"
title: "자동 백업 스크립트 작성 및 cron 스케줄링"
category: "linux"
difficulty: 3
tags: ["backup", "cron", "tar", "script", "automation"]
hints:
  - "`tar`로 압축 아카이브를 생성할 수 있습니다."
  - "`find`의 `-mtime` 옵션으로 특정 일수가 지난 파일을 찾을 수 있습니다."
  - "`crontab -e`로 스케줄 작업을 등록할 수 있습니다."
---

## 상황

`/etc` 디렉터리의 설정 파일이 실수로 변경되거나 삭제되는 사고가 반복되고 있습니다. 현재 자동 백업 체계가 없어 매번 수동으로 복구하고 있습니다. 자동 백업 스크립트를 작성하고, 매일 새벽 2시에 실행되도록 cron에 등록하세요.

## 데이터

### 요구 사항

```plaintext
1. 백업 스크립트: /usr/local/bin/backup_etc.sh
2. 인자로 백업 저장 경로를 받을 것
3. 인자 없이 실행 시 에러 메시지 출력 후 종료
4. 아카이브 이름: etc-backup-YYYY-MM-DD.tar.gz
5. 7일 이상 된 백업 파일 자동 삭제
6. cron: 매일 02:00에 /backups/etc/로 백업
```

### 현재 상태

```bash
$ ls /usr/local/bin/backup_etc.sh
ls: cannot access '/usr/local/bin/backup_etc.sh': No such file or directory

$ crontab -l
no crontab for root
```

## 해설

### 원인 분석

자동 백업 체계가 전혀 구성되어 있지 않습니다. `/etc` 디렉터리는 시스템과 애플리케이션의 핵심 설정 파일이 위치하므로, 매일 자동 백업과 보존 정책(retention policy)이 필수적입니다.

### 해결 방법

```bash
# 1. 백업 디렉터리 생성
mkdir -p /backups/etc

# 2. 백업 스크립트 작성
cat > /usr/local/bin/backup_etc.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="$1"

if [ -z "$BACKUP_DIR" ]; then
  echo "Error: Backup directory path required" >&2
  echo "Usage: $0 <backup-directory>" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

FILENAME="etc-backup-$(date +%Y-%m-%d).tar.gz"
tar -czf "${BACKUP_DIR}/${FILENAME}" /etc 2>/dev/null

find "$BACKUP_DIR" -name "etc-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}/${FILENAME}"
SCRIPT

# 3. 실행 권한 부여
chmod +x /usr/local/bin/backup_etc.sh

# 4. 동작 테스트
/usr/local/bin/backup_etc.sh /backups/etc/
ls -lh /backups/etc/

# 5. cron 등록 (매일 02:00)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup_etc.sh /backups/etc/") | crontab -

# 6. cron 확인
crontab -l
```

### 실무 팁

cron 표현식 `0 2 * * *`는 매일 02:00를 의미합니다. 백업 스크립트에는 에러 핸들링(`set -e`), 로그 기록, 디스크 공간 사전 확인 로직을 추가하면 더 견고해집니다. 중요 설정 파일은 백업 외에도 Git으로 버전 관리(`etckeeper`)하면 변경 이력 추적과 롤백이 훨씬 편리합니다. 백업 성공/실패를 모니터링 시스템에 알림으로 전송하는 것도 좋은 관행입니다.
