---
id: "linux-010"
title: "좀비 프로세스 누적으로 인한 프로세스 테이블 포화"
category: "linux"
difficulty: 2
tags: ["zombie", "process", "defunct", "kill", "ppid"]
hints:
  - "`ps` 출력에서 STAT 컬럼이 `Z`인 프로세스를 찾아보세요."
  - "좀비 프로세스를 직접 kill할 수는 없습니다. 부모 프로세스를 확인해 보세요."
  - "부모 프로세스를 종료하면 좀비가 init에 인계되어 정리됩니다."
---

## 상황

프로덕션 서버의 프로세스 수가 새로운 워크로드 배포 없이 지속적으로 증가하고 있습니다. 시스템이 느려지고 있으며, 새로운 프로세스를 생성할 수 없다는 에러가 간헐적으로 발생합니다. 원인을 분석하고 해결하세요.

## 데이터

### top 출력 (상단)

```bash
top - 15:30:22 up 12 days, 7:45, 3 users, load average: 2.15, 1.98, 1.87
Tasks: 487 total, 2 running, 340 sleeping, 0 stopped, 145 zombie
```

### ps aux | grep defunct | head -10

```bash
devops    8234  0.0  0.0      0     0 ?  Z    14:20  0:00 [worker.sh] <defunct>
devops    8235  0.0  0.0      0     0 ?  Z    14:20  0:00 [worker.sh] <defunct>
devops    8236  0.0  0.0      0     0 ?  Z    14:21  0:00 [worker.sh] <defunct>
devops    8237  0.0  0.0      0     0 ?  Z    14:21  0:00 [worker.sh] <defunct>
...
(총 145개의 zombie 프로세스)
```

### ps -o pid,ppid,stat,comm -p 8234

```bash
  PID  PPID STAT COMMAND
 8234  7100    Z worker.sh
```

### ps -o pid,user,comm -p 7100

```bash
  PID USER     COMMAND
 7100 devops   batch-manager
```

## 해설

### 원인 분석

시스템에 **145개의 좀비 프로세스**가 존재합니다. 좀비 프로세스(상태 `Z`, `<defunct>`)는 실행이 종료되었지만 부모 프로세스가 `wait()` 시스템 콜로 종료 상태를 수집하지 않아 프로세스 테이블에 남아 있는 상태입니다.

모든 좀비의 부모 프로세스(PPID)가 **7100번(batch-manager)**입니다. `batch-manager`가 자식 프로세스의 종료 상태를 제대로 처리하지 않아 좀비가 누적되고 있습니다.

### 해결 방법

```bash
# 1. 좀비 프로세스 수 확인
ps aux | awk '$8 == "Z" {count++} END {print "Zombies:", count}'

# 2. 좀비의 부모 프로세스 확인
ps -o ppid= -p $(ps -eo pid,stat | awk '$2 ~ /Z/ {print $1}' | head -1)

# 3. 부모 프로세스 종료 (좀비가 init에 인계되어 정리됨)
kill 7100

# 4. SIGTERM으로 종료되지 않으면 SIGKILL 사용
kill -9 7100

# 5. 좀비 제거 확인
ps aux | grep defunct | grep -v grep | wc -l
```

### 실무 팁

좀비 프로세스 자체는 리소스(CPU, 메모리)를 거의 소비하지 않지만, 프로세스 테이블 슬롯을 차지하여 새 프로세스 생성을 방해합니다. 근본 해결은 부모 프로세스의 코드를 수정하여 자식 프로세스 종료 시 `wait()`를 호출하거나, 시그널 핸들러에서 `SIGCHLD`를 처리하도록 하는 것입니다. 모니터링 시스템에 좀비 프로세스 수 알림을 추가하여 조기에 감지하세요.
