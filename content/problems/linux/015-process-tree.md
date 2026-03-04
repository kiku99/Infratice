---
id: "linux-015"
title: "대량 자식 프로세스를 생성하는 프로세스 트리 추적"
category: "linux"
difficulty: 1
tags: ["process", "pstree", "fork", "hierarchy"]
hints:
  - "`pstree` 명령어로 프로세스 계층 구조를 확인해 보세요."
  - "자식 프로세스 수가 가장 많은 부모 프로세스를 찾아보세요."
---

## 상황

시스템 리소스가 비정상적으로 큰 프로세스 트리에 의해 소비되고 있습니다. 가장 많은 자식 프로세스를 가진 부모 프로세스를 찾아 프로세스 계층 구조를 파악하세요.

## 데이터

### ps -ef | wc -l

```bash
312
```

### ps -eo ppid --no-headers | sort | uniq -c | sort -rn | head -5

```bash
    187 159
     23 1
     12 120
      8 2
      5 345
```

### pstree -p 159 | head -10

```bash
spawn_workers.sh(159)─┬─sleep(209)
                      ├─spawn_workers.sh(190)───sleep(220)
                      ├─spawn_workers.sh(191)───sleep(221)
                      ├─spawn_workers.sh(192)───sleep(222)
                      ├─spawn_workers.sh(193)───sleep(223)
                      ├─spawn_workers.sh(194)───sleep(224)
                      ├─spawn_workers.sh(195)───sleep(225)
                      ├─spawn_workers.sh(196)───sleep(226)
                      ...
```

### ps -o pid,user,comm -p 159

```bash
  PID USER     COMMAND
  159 devops   spawn_workers.sh
```

## 해설

### 원인 분석

PID 159(`spawn_workers.sh`)가 **187개의 자식 프로세스**를 생성하고 있으며, 이는 전체 프로세스(312개)의 약 60%에 해당합니다. `pstree` 출력에서 이 스크립트가 재귀적으로 자신을 fork하면서 각각 `sleep` 프로세스를 실행하고 있음을 확인할 수 있습니다.

워커 스크립트가 동시 실행 수 제한 없이 무한히 자식 프로세스를 생성하는 구조입니다.

### 해결 방법

```bash
# 1. 프로세스 트리 확인 (PID와 명령어 인자 포함)
pstree -ap 159

# 2. 해당 프로세스 트리 전체 파일로 저장
pstree -ap 159 > /home/devops/process_tree_report.txt

# 3. 프로세스 트리 전체 종료 (부모와 모든 자식)
kill -- -$(ps -o pgid= -p 159 | tr -d ' ')
# 또는
pkill -P 159   # 자식 프로세스 종료
kill 159        # 부모 프로세스 종료

# 4. 정리 확인
pstree -p 159 2>/dev/null || echo "프로세스 트리 제거 완료"
```

### 실무 팁

`pstree -ap`는 PID와 전체 명령어 인자를 포함하여 프로세스 계층을 시각적으로 보여주므로 트러블슈팅에 유용합니다. 프로세스 그룹 전체를 종료하려면 `kill -- -<PGID>` 명령을 사용하세요. 워커 스크립트에는 반드시 최대 동시 실행 수(`max_workers`) 제한을 구현하고, `ulimit -u`로 사용자별 프로세스 생성 수를 제한하는 것이 좋습니다.
