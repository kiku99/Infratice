---
id: "linux-011"
title: "장시간 실행 서비스의 메모리 누수 탐지"
category: "linux"
difficulty: 2
tags: ["memory", "rss", "leak", "process", "oom"]
hints:
  - "`free -h`로 전체 메모리 상태를 확인하고, 어떤 프로세스가 메모리를 많이 사용하는지 살펴보세요."
  - "RSS(Resident Set Size) 값이 시간에 따라 증가하는 프로세스를 찾아보세요."
  - "프로세스의 가동 시간과 메모리 사용량의 상관관계를 분석해 보세요."
---

## 상황

서버에서 실행 중인 Node.js 서비스가 몇 시간마다 느려지다가 결국 OOM Killer에 의해 종료됩니다. CPU와 디스크 I/O는 정상이지만, 서버의 가용 메모리가 점진적으로 감소하고 있습니다. 메모리 누수 프로세스를 찾아 조치하세요.

## 데이터

### free -h 출력

```bash
              total        used        free      shared  buff/cache   available
Mem:           7.8G        7.1G        120M        45M        580M        350M
Swap:          2.0G        1.8G        200M
```

### ps aux --sort=-%mem | head -6

```bash
USER       PID  %CPU  %MEM    VSZ     RSS  TTY  STAT START   TIME COMMAND
node      3421   2.1  78.5 1845320 6289560  ?    Sl   Mar01  12:34 node /app/server.js
postgres  2100   1.5   8.2  645320  656280  ?    Ss   Mar01   8:45 postgres: main
redis     2200   0.8   3.1  125680  248540  ?    Ssl  Mar01   4:12 redis-server
nginx     1500   0.2   1.0   98760   80120  ?    S    Mar01   1:23 nginx: worker
root         1   0.0   0.1   16924    3240  ?    Ss   Mar01   0:05 /sbin/init
```

### dmesg | grep -i oom (이전 로그)

```log
[285432.123456] Out of memory: Killed process 2987 (node) total-vm:1823456kB, anon-rss:6145280kB
[285432.123457] oom_kill_process: 1 callbacks suppressed
```

## 해설

### 원인 분석

`free -h` 결과 물리 메모리 7.8GB 중 7.1GB가 사용 중이고, Swap도 1.8GB/2.0GB로 거의 소진된 상태입니다. `ps` 출력에서 `node` 프로세스(PID 3421)가 RSS **6.2GB(78.5%)**를 차지하고 있습니다.

`dmesg` 로그에서 이전에도 `node` 프로세스가 OOM Killer에 의해 종료된 기록이 있어, 이 서비스에 메모리 누수가 있는 것으로 판단됩니다. 서비스 시작 후 시간이 지남에 따라 RSS가 계속 증가하는 패턴입니다.

### 해결 방법

```bash
# 1. 메모리 누수 프로세스 확인
ps -o pid,user,rss,vsz,comm --sort=-rss | head -5

# 2. 즉시 조치: 문제 프로세스 재시작
kill 3421
# 또는 서비스 관리자를 통해 재시작
systemctl restart node-app

# 3. 메모리 회복 확인
free -h

# 4. Node.js 메모리 제한 설정으로 재발 방지
# ExecStart=node --max-old-space-size=2048 /app/server.js
```

### 실무 팁

메모리 누수가 의심되면 `smem -rs rss` 또는 `ps`로 RSS를 주기적으로 기록하여 증가 추세를 확인하세요. Node.js의 경우 `--max-old-space-size`로 힙 메모리 상한을 설정하고, `--inspect` 플래그로 힙 스냅샷을 수집하여 근본 원인을 분석할 수 있습니다. systemd의 `MemoryMax=` 옵션으로 서비스의 메모리 사용량 상한을 cgroup 레벨에서 강제하는 것도 효과적입니다.
