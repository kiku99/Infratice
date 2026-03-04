---
id: "linux-030"
title: "systemd 서비스 자동 재시작 및 재시도 제한 설정"
category: "linux"
difficulty: 3
tags: ["systemd", "service", "restart", "recovery", "unit-file"]
hints:
  - "systemd unit 파일에서 `Restart` 관련 설정을 확인해 보세요."
  - "`StartLimitBurst`와 `StartLimitIntervalSec`로 재시작 횟수를 제한할 수 있습니다."
  - "`RestartSec`로 재시작 간 대기 시간을 설정할 수 있습니다."
---

## 상황

서버에서 `/usr/local/bin/check_app.sh` 스크립트가 주기적으로 실행되지만 비정상 종료됩니다. 현재는 수동으로 재실행하고 있습니다. 이 스크립트를 systemd 서비스로 등록하여 실패 시 자동 재시작하되, 60초 내 3회 이상 실패하면 재시도를 중단하도록 구성하세요.

## 데이터

### 스크립트 실행 결과

```bash
$ /usr/local/bin/check_app.sh
Checking application health...
Error: Application endpoint not responding
Exit code: 1
```

### 현재 상태

```bash
$ systemctl status check_app.service
Unit check_app.service could not be found.
```

### 요구 사항

```plaintext
1. 서비스명: check_app.service
2. 실패 시 자동 재시작
3. 재시작 간 대기: 5초
4. 60초 내 최대 3회 재시작 (초과 시 중단)
5. 부팅 시 자동 시작
```

## 해설

### 원인 분석

현재 `check_app.service`가 systemd에 등록되어 있지 않아, 스크립트 실패 시 수동으로 재실행해야 합니다. systemd의 서비스 유닛 파일을 생성하여 자동 복구와 재시도 제한을 모두 구현할 수 있습니다.

### 해결 방법

```bash
# 1. systemd 서비스 유닛 파일 생성
cat > /etc/systemd/system/check_app.service << 'EOF'
[Unit]
Description=Application Health Check Service
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
ExecStart=/usr/local/bin/check_app.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 2. systemd 데몬 리로드
systemctl daemon-reload

# 3. 서비스 활성화 (부팅 시 자동 시작)
systemctl enable check_app.service

# 4. 서비스 시작
systemctl start check_app.service

# 5. 상태 확인 (3회 재시도 후 실패 상태)
systemctl status check_app.service

# 6. 로그 확인
journalctl -u check_app.service --no-pager -n 20
```

```bash
# 주요 설정 설명:
# Restart=on-failure      : 비정상 종료(exit code != 0) 시 재시작
# RestartSec=5            : 재시작 전 5초 대기
# StartLimitBurst=3       : 재시작 제한 횟수
# StartLimitIntervalSec=60: 제한 적용 시간 구간
# → 60초 내 3회 실패하면 더 이상 재시작하지 않음
```

### 실무 팁

`Restart=on-failure`는 비정상 종료 시에만 재시작하고, `Restart=always`는 정상 종료 시에도 재시작합니다(데몬에 적합). 재시작 제한에 걸린 서비스는 `systemctl reset-failed check_app.service` 후 다시 시작할 수 있습니다. 프로덕션 환경에서는 서비스 실패를 모니터링 시스템으로 알림 전송하도록 `ExecStopPost`에 알림 스크립트를 추가하는 것이 좋습니다.
