---
id: "linux-001"
title: "디스크 용량 100% 원인 프로세스 찾기"
category: "linux"
difficulty: 1
tags: ["disk", "df", "du", "lsof"]
hints:
  - "df -h 출력에서 어떤 파티션이 가득 찼는지 확인하세요."
  - "du 명령어로 어떤 디렉터리가 용량을 많이 차지하는지 추적해 보세요."
  - "삭제된 파일을 잡고 있는 프로세스가 있을 수 있습니다. lsof 명령어를 활용해 보세요."
---

## 상황

운영 중인 웹 서버에서 갑자기 새로운 로그 파일이 생성되지 않고, 배포 스크립트도 실패하기 시작했습니다. 서버에 접속해 디스크 상태를 확인하고, 용량이 가득 찬 원인을 찾아 해결하세요.

## 데이터

### df -h 출력

```bash
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   50G     0 100% /
tmpfs           3.9G     0  3.9G   0% /dev/shm
/dev/sda2       200G   45G  155G  23% /data
```

### du -sh /var/* 출력

```bash
4.0K    /var/account
45G     /var/log
12K     /var/mail
4.0K    /var/opt
1.2G    /var/cache
320M    /var/lib
4.0K    /var/tmp
```

### ls -lh /var/log 출력

```bash
total 45G
-rw-r--r-- 1 root root  12K Feb 10 09:00 syslog
-rw-r--r-- 1 root root  24K Feb 10 09:00 auth.log
-rw-r--r-- 1 root root  42G Feb 10 09:01 app-debug.log
-rw-r--r-- 1 root root 2.8G Feb 10 08:55 app-error.log
-rw-r--r-- 1 root root  56K Feb 10 09:00 kern.log
```

## 해설

### 원인 분석

`/dev/sda1` 파티션(루트 `/`)이 100% 사용 중입니다. `du` 명령어 결과 `/var/log` 디렉터리가 45GB를 차지하고 있으며, 그 안에서 `app-debug.log` 파일이 42GB로 디스크 대부분을 소비하고 있습니다.

애플리케이션의 디버그 로그 레벨이 프로덕션 환경에서 활성화된 채 방치되어 로그가 무한히 쌓인 것이 원인입니다.

### 해결 방법

```bash
# 1. 가장 큰 파일 확인
ls -lhS /var/log | head -5

# 2. 디버그 로그 비우기 (프로세스가 파일 핸들을 잡고 있으므로 truncate 사용)
truncate -s 0 /var/log/app-debug.log

# 3. 디스크 용량 회복 확인
df -h /

# 4. 앱의 로그 레벨을 INFO 이상으로 변경
# (애플리케이션 설정 파일에서 log_level = "info" 로 수정)

# 5. logrotate 설정 추가로 재발 방지
cat > /etc/logrotate.d/app << 'EOF'
/var/log/app-*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
EOF
```

### 실무 팁

프로덕션 환경에서는 반드시 `logrotate`를 설정하여 로그 파일이 무한히 커지는 것을 방지하세요. 또한 `rm` 대신 `truncate`를 사용하면 파일 핸들을 잡고 있는 프로세스를 재시작하지 않고도 디스크 공간을 즉시 확보할 수 있습니다.
