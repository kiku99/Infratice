---
id: "linux-027"
title: "서버 가동 시간 및 부하 현황 점검"
category: "linux"
difficulty: 1
tags: ["uptime", "load-average", "monitoring", "performance"]
hints:
  - "`uptime` 명령어의 출력에서 가동 시간과 로드 평균을 구분해 보세요."
  - "로드 평균의 1분, 5분, 15분 값이 의미하는 바를 생각해 보세요."
  - "`awk`로 특정 필드만 추출할 수 있습니다."
---

## 상황

서버 안정성 점검 보고서를 작성해야 합니다. 서버의 가동 시간과 15분 평균 부하(load average)를 확인하여 파일에 저장하세요. 15분 로드 평균이 CPU 코어 수를 초과하면 서버 과부하 상태로 판단합니다.

## 데이터

### uptime 출력

```bash
 10:37:22 up 2 days, 5:37, 3 users, load average: 3.85, 2.10, 0.45
```

### nproc 출력

```bash
4
```

## 해설

### 원인 분석

`uptime` 출력에서:
- 가동 시간: `2 days, 5:37`
- 로드 평균: 1분 `3.85`, 5분 `2.10`, 15분 `0.45`

15분 로드 평균(0.45)이 CPU 코어 수(4)보다 낮으므로 장기 부하는 안정적입니다. 다만 1분 로드(3.85)가 높아 최근 부하가 급증하는 추세이며, 주의가 필요합니다.

### 해결 방법

```bash
# 1. 가동 시간 추출 및 저장
uptime | awk -F'(up |,  [0-9]+ user)' '{print $2}' > /home/devops/uptime.txt

# 2. 15분 로드 평균 추출 및 저장
uptime | awk -F'load average: ' '{print $2}' | awk -F', ' '{print $3}' > /home/devops/loadavg.txt

# 3. 결과 확인
cat /home/devops/uptime.txt    # 2 days, 5:37
cat /home/devops/loadavg.txt   # 0.45

# 4. CPU 코어 수 대비 부하 판단
CORES=$(nproc)
LOAD=$(cat /home/devops/loadavg.txt)
echo "CPU cores: $CORES, 15min load: $LOAD"
```

```bash
# 로드 평균 해석 기준 (4코어 서버):
# < 4.0  : 정상 (여유 있음)
# = 4.0  : 100% 활용 (한계점)
# > 4.0  : 과부하 (큐 대기 발생)
```

### 실무 팁

로드 평균은 CPU만이 아닌 I/O 대기 프로세스도 포함하므로, 높은 로드가 반드시 CPU 부족을 의미하지는 않습니다. `vmstat 1 5`이나 `mpstat -P ALL 1`로 CPU와 I/O를 구분하여 분석하세요. 모니터링 도구(Prometheus, Grafana)에서 로드 평균 대시보드를 구성하고, `load / nproc > 1.0` 조건으로 알림을 설정하는 것이 좋습니다.
