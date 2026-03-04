---
id: "linux-019"
title: "로그 파일 용량 현황 파악 및 정리 대상 식별"
category: "linux"
difficulty: 1
tags: ["find", "log", "disk", "cleanup", "wc"]
hints:
  - "`find` 명령어로 특정 확장자의 파일을 재귀적으로 찾을 수 있습니다."
  - "`-size` 옵션으로 특정 크기 이상의 파일만 필터링할 수 있습니다."
  - "`wc -l`로 검색 결과의 개수를 셀 수 있습니다."
---

## 상황

`/var` 디렉터리의 디스크 사용량이 점점 증가하고 있어 정리 계획을 수립해야 합니다. 여러 애플리케이션이 각각의 하위 디렉터리에 로그 파일을 생성하고 있습니다. 전체 `.log` 파일 수와 512KB 이상의 대용량 로그 파일 수를 파악하세요.

## 데이터

### du -sh /var/*/ | sort -rh | head -5

```bash
28G     /var/log/
5.2G    /var/lib/
1.8G    /var/cache/
120M    /var/spool/
4.0K    /var/tmp/
```

### find /var -name "*.log" -type f | head -10

```bash
/var/log/syslog.log
/var/log/auth.log
/var/log/nginx/access.log
/var/log/nginx/error.log
/var/log/mysql/slow-query.log
/var/log/app/application.log
/var/log/app/debug.log
/var/log/apache2/access.log
/var/log/apache2/error.log
/var/log/cron.log
```

## 해설

### 원인 분석

`/var/log`가 28GB로 `/var` 디렉터리 사용량의 대부분을 차지하고 있습니다. 정리 대상을 식별하려면 먼저 전체 `.log` 파일 수를 파악하고, 그 중 대용량 파일을 따로 분류해야 합니다.

### 해결 방법

```bash
# 1. /var 하위 전체 .log 파일 수 확인
find /var -name "*.log" -type f | wc -l > /home/devops/log_count.txt

# 2. 512KB 이상 대용량 .log 파일 수 확인
find /var -name "*.log" -type f -size +512k | wc -l > /home/devops/large_log_count.txt

# 3. 대용량 파일 목록과 크기 확인 (정리 대상)
find /var -name "*.log" -type f -size +512k -exec ls -lh {} \; | sort -k5 -rh

# 4. 결과 확인
cat /home/devops/log_count.txt
cat /home/devops/large_log_count.txt
```

```bash
# find 유용한 옵션:
# -size +512k   : 512KB 초과
# -size +1M     : 1MB 초과
# -mtime +30    : 30일 이상 지난 파일
# -exec ... {} \; : 검색 결과에 명령어 실행
```

### 실무 팁

로그 정리 자동화를 위해 `find /var/log -name "*.log" -mtime +30 -delete` 같은 명령을 crontab에 등록하세요. 단, 삭제 전 `find ... -print`로 대상을 먼저 확인하는 것이 안전합니다. logrotate와 함께 사용하면 현재 로그는 로테이션으로, 오래된 아카이브는 `find`로 정리하는 이중 관리가 가능합니다.
