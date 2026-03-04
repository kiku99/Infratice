---
id: "linux-005"
title: "/var 파티션 급격한 용량 증가 원인 분석"
category: "linux"
difficulty: 3
tags: ["disk", "du", "lsof", "logrotate", "var"]
hints:
  - "`du` 명령어로 /var 하위에서 가장 큰 파일들을 찾아보세요."
  - "`lsof`로 해당 파일을 열고 있는 프로세스가 있는지 확인해 보세요."
  - "logrotate 설정이 해당 로그 파일을 커버하고 있는지 점검해 보세요."
---

## 상황

모니터링 알림에 의하면 `/var` 파티션 사용률이 92%에 도달했고 빠르게 증가하고 있습니다. 어떤 파일이 공간을 소비하고 있는지, 해당 파일을 프로세스가 사용 중인지, 로그 로테이션이 제대로 설정되어 있는지 종합적으로 분석하여 해결하세요.

## 데이터

### df -h 출력

```bash
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   92G  8.0G  92% /
```

### du -sh /var/* | sort -rh | head -5

```bash
45G     /var/log
12G     /var/lib
2.5G    /var/cache
320M    /var/spool
48K     /var/tmp
```

### find /var -type f -size +500M 출력

```bash
/var/log/mysql/mysql-slow.log     2.3G
/var/log/nginx/access.log         1.3G
/var/log/myapp/app.log           38G
/var/log/syslog.1                655M
```

### lsof +D /var/log/myapp/

```bash
COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF    NODE NAME
java     2341   app    1w   REG  253,1  38G     131074 /var/log/myapp/app.log
java     2341   app    2w   REG  253,1  38G     131074 /var/log/myapp/app.log
```

### ls /etc/logrotate.d/

```bash
apt  dpkg  mysql-server  nginx  rsyslog
```

## 해설

### 원인 분석

`/var/log/myapp/app.log`가 **38GB**로 /var 파티션 사용량의 대부분을 차지하고 있습니다. `lsof` 결과 `java` 프로세스(PID 2341)가 이 파일을 열고 있어 단순 삭제로는 공간이 회복되지 않습니다.

`/etc/logrotate.d/`에 `myapp` 설정이 **존재하지 않아** 로그 로테이션이 전혀 적용되지 않은 상태입니다. mysql-server와 nginx는 logrotate가 설정되어 있지만, 커스텀 애플리케이션(myapp)은 누락되었습니다.

### 해결 방법

```bash
# 1. 즉시 공간 확보 (프로세스가 파일을 잡고 있으므로 truncate 사용)
truncate -s 0 /var/log/myapp/app.log

# 2. 디스크 회복 확인
df -h /

# 3. myapp용 logrotate 설정 생성
cat > /etc/logrotate.d/myapp << 'EOF'
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    delaycompress
    maxsize 500M
    copytruncate
    missingok
    notifempty
}
EOF

# 4. logrotate 설정 테스트
logrotate -d /etc/logrotate.d/myapp

# 5. 다른 대용량 로그도 정리
truncate -s 0 /var/log/mysql/mysql-slow.log
```

### 실무 팁

새로운 애플리케이션을 배포할 때 logrotate 설정을 함께 배포하는 것을 체크리스트에 포함하세요. `rm`으로 파일을 삭제해도 프로세스가 파일 핸들을 잡고 있으면 디스크 공간이 해제되지 않습니다(`lsof +L1`로 삭제되었지만 열려 있는 파일 확인 가능). `copytruncate` 옵션은 프로세스 재시작 없이 로그를 로테이션할 수 있어 서비스 중단이 불가능한 환경에서 유용합니다.
