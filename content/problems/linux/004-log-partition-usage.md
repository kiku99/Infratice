---
id: "linux-004"
title: "로그 파일이 더 이상 생성되지 않는 원인 분석"
category: "linux"
difficulty: 2
tags: ["mount", "partition", "df", "log-rotation"]
hints:
  - "`/var/log`가 루트 파일시스템과 다른 장치에 마운트되어 있는지 확인해 보세요."
  - "`df`와 `mount` 명령어를 함께 사용하여 마운트 정보를 분석해 보세요."
  - "해당 파티션의 크기가 로그 용량에 비해 적절한지 평가해 보세요."
---

## 상황

로그 로테이션이 정상적으로 동작하지 않고, 새로운 로그 파일이 생성되지 않는 문제가 발생했습니다. 애플리케이션은 정상 실행 중이지만 최근 로그가 기록되지 않고 있습니다. `/var/log` 디렉터리의 파일시스템 상태를 확인하여 원인을 분석하세요.

## 데이터

### 에러 로그

```log
logrotate: error: failed to rename /var/log/app.log to /var/log/app.log.1: No space left on device
logrotate: error: failed to create new /var/log/app.log: No space left on device
```

### df -h 출력

```bash
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   45G   55G  45% /
/dev/sdb1        10G  9.8G  200M  98% /var/log
tmpfs           3.9G     0  3.9G   0% /dev/shm
```

### mount | grep var 출력

```bash
/dev/sdb1 on /var/log type ext4 (rw,relatime)
```

### ls -lh /var/log 출력

```bash
total 9.6G
-rw-r--r-- 1 root   root   4.2G Mar 01 09:00 app.log
-rw-r--r-- 1 root   root   3.1G Feb 28 23:59 app.log.1
-rw-r--r-- 1 root   root   2.0G Feb 27 23:59 app.log.2.gz
-rw-r--r-- 1 syslog syslog  24K Mar 01 09:01 syslog
-rw-r--r-- 1 root   root    56K Mar 01 09:00 auth.log
```

## 해설

### 원인 분석

`/var/log`가 루트(`/`)와 별도의 파티션(`/dev/sdb1`)에 마운트되어 있으며, 이 파티션은 10GB로 크기가 제한적입니다. 현재 사용률이 **98%**로, 로그 로테이션 시 새 파일을 생성할 공간이 부족합니다.

루트 파일시스템은 55GB의 여유가 있지만, `/var/log`는 별도 파티션이므로 이 여유 공간을 활용할 수 없습니다. `app.log`(4.2G)와 이전 로테이션 파일들이 10GB 파티션을 거의 가득 채우고 있습니다.

### 해결 방법

```bash
# 1. 오래된 로테이션 파일 정리로 즉시 공간 확보
rm /var/log/app.log.2.gz
truncate -s 0 /var/log/app.log

# 2. logrotate 설정 수정 (보관 파일 수 줄이기)
cat > /etc/logrotate.d/app << 'EOF'
/var/log/app.log {
    daily
    rotate 3
    compress
    delaycompress
    maxsize 1G
    copytruncate
    missingok
    notifempty
}
EOF

# 3. 디스크 여유 확인
df -h /var/log

# 4. (장기) 파티션 크기 확장이 필요한 경우
# resize2fs /dev/sdb1 (LVM 사용 시 lvextend 먼저 실행)
```

### 실무 팁

`/var/log`를 별도 파티션으로 분리하는 것은 보안과 안정성 측면에서 좋은 관행이지만, 파티션 크기를 로그 발생량에 맞게 충분히 설정해야 합니다. logrotate의 `maxsize` 옵션으로 파일 크기 상한을 두고, `rotate` 횟수를 파티션 크기에 맞게 조정하세요. LVM을 사용하면 온라인으로 파티션 크기를 확장할 수 있어 유연한 운영이 가능합니다.
