---
id: "linux-014"
title: "과도한 프로세스를 실행 중인 사용자 식별"
category: "linux"
difficulty: 2
tags: ["process", "ps", "user", "resource", "monitoring"]
hints:
  - "`ps` 명령어로 사용자별 프로세스 수를 집계해 보세요."
  - "`awk`와 `sort`를 조합하여 사용자별 프로세스 카운트를 구할 수 있습니다."
---

## 상황

서버의 리소스 사용률이 전반적으로 높아지고 있습니다. 이 서버는 여러 팀(dev-team, qa-team, ops-team 등)이 공유하고 있으며, 특정 사용자가 지나치게 많은 프로세스를 실행하고 있는 것으로 의심됩니다. 어떤 사용자가 가장 많은 프로세스를 실행 중인지 찾으세요.

## 데이터

### ps aux | head -15

```bash
USER       PID  %CPU  %MEM    VSZ    RSS TTY  STAT START   TIME COMMAND
root         1   0.0   0.1  16924   3240 ?    Ss   Mar01   0:05 /sbin/init
root       120   0.0   0.0  12456   1280 ?    Ss   Mar01   0:01 /usr/sbin/cron
qa-team   3001   5.2   2.1  45678  12340 ?    S    09:00   1:23 pytest runner
qa-team   3002   4.8   2.0  45678  11890 ?    S    09:00   1:20 pytest runner
qa-team   3003   4.5   1.9  45678  11200 ?    S    09:01   1:18 pytest runner
...
(qa-team 프로세스 다수)
dev-team  4001   2.1   1.5  34567   8900 ?    S    08:30   0:45 node dev-server
dev-team  4002   1.8   1.2  34567   7800 ?    S    08:30   0:42 node dev-server
ops-team  5001   0.5   0.8  23456   5600 ?    S    07:00   0:12 ansible-playbook
```

### ps -eo user --no-headers | sort | uniq -c | sort -rn

```bash
    156 qa-team
     23 root
     12 dev-team
      8 ops-team
      4 www-data
      2 postgres
      1 redis
```

## 해설

### 원인 분석

사용자별 프로세스 수를 집계하면 `qa-team`이 **156개**의 프로세스를 실행하고 있어 다른 사용자(root 23개, dev-team 12개)와 비교해 압도적으로 많습니다. QA 팀의 테스트 러너가 병렬 프로세스를 과도하게 생성한 것으로 보입니다.

이는 서버의 CPU, 메모리, 프로세스 테이블 등 공유 리소스를 특정 사용자가 독점하는 상황으로, 다른 팀의 작업에도 영향을 미칩니다.

### 해결 방법

```bash
# 1. 사용자별 프로세스 수 확인
ps -eo user --no-headers | sort | uniq -c | sort -rn

# 2. 해당 사용자의 프로세스 상세 확인
ps -u qa-team -o pid,%cpu,%mem,comm --sort=-%cpu

# 3. 불필요한 프로세스 일괄 종료
pkill -u qa-team -f "pytest runner"

# 4. 사용자별 프로세스 수 제한 설정
echo "qa-team hard nproc 50" >> /etc/security/limits.conf
```

### 실무 팁

공유 서버에서는 `/etc/security/limits.conf`로 사용자별 최대 프로세스 수(`nproc`), 메모리(`as`), 열린 파일 수(`nofile`)를 제한하세요. `ulimit -u`로 현재 제한값을 확인할 수 있습니다. cgroups v2를 활용하면 사용자 또는 그룹 단위로 CPU, 메모리, I/O를 더 세밀하게 제어할 수 있습니다.
