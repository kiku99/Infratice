---
id: "linux-018"
title: "여러 로그 파일에서 에러 키워드 일괄 검색"
category: "linux"
difficulty: 1
tags: ["grep", "log", "search", "recursive", "error"]
hints:
  - "`grep` 명령어의 `-r` 옵션으로 디렉터리 하위를 재귀적으로 검색할 수 있습니다."
  - "특정 파일 확장자만 대상으로 검색하는 옵션을 확인해 보세요."
---

## 상황

여러 애플리케이션이 `/var/log` 하위에 각각 로그를 기록하고 있습니다. 최근 서비스 장애가 발생했으며, 어떤 애플리케이션에서 에러가 발생했는지 빠르게 확인해야 합니다. 모든 `.log` 파일에서 `ERROR` 키워드를 검색하세요.

## 데이터

### /var/log 디렉터리 구조

```bash
/var/log/
├── apache2/
│   ├── access.log
│   └── error.log
├── application.log
├── mysql/
│   └── error.log
├── nginx/
│   ├── access.log
│   └── error.log
└── syslog
```

### 일부 로그 내용 (예시)

```log
# /var/log/apache2/error.log
[Thu Mar 04 10:23:45] ERROR: Connection timeout to database server
[Thu Mar 04 10:23:46] WARN: Retrying connection...

# /var/log/application.log
2026-03-04 10:23:45 INFO: Request processed successfully
2026-03-04 10:23:46 ERROR: Unable to write to cache directory
2026-03-04 10:23:47 INFO: Fallback to disk cache

# /var/log/mysql/error.log
2026-03-04T10:23:45Z ERROR: InnoDB: Cannot allocate memory for buffer pool
```

## 해설

### 원인 분석

여러 로그 파일에 분산된 에러를 한 번에 찾으려면 재귀적 검색이 필요합니다. `/var/log` 하위에 다양한 서브디렉터리와 로그 파일이 존재하므로, `grep`의 재귀 검색 옵션과 파일 패턴 필터를 조합하여 `.log` 파일에서만 `ERROR`를 검색합니다.

### 해결 방법

```bash
# 1. /var/log 하위 모든 .log 파일에서 ERROR 검색 (파일명 + 매칭 라인)
grep -r "ERROR" /var/log/ --include="*.log" > /home/devops/error_logs.txt

# 2. 결과 확인
cat /home/devops/error_logs.txt
# /var/log/apache2/error.log:ERROR: Connection timeout to database server
# /var/log/application.log:ERROR: Unable to write to cache directory
# /var/log/mysql/error.log:ERROR: InnoDB: Cannot allocate memory for buffer pool
```

```bash
# 유용한 grep 옵션 조합:
grep -rn "ERROR" /var/log/ --include="*.log"    # -n: 라인 번호 포함
grep -ri "error" /var/log/ --include="*.log"     # -i: 대소문자 무시
grep -rc "ERROR" /var/log/ --include="*.log"     # -c: 파일별 매칭 수
```

### 실무 팁

대량의 로그를 검색할 때는 `grep` 대신 `ripgrep(rg)`을 사용하면 훨씬 빠릅니다. 정기적인 에러 모니터링이 필요하면 `logwatch`나 `fail2ban` 같은 도구를 활용하거나, ELK Stack(Elasticsearch, Logstash, Kibana)으로 중앙 집중식 로그 관리 체계를 구축하는 것이 장기적으로 효율적입니다.
