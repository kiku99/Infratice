---
id: "monitoring-002"
title: "Alertmanager 알림이 Slack에 전달되지 않는 문제"
category: "monitoring"
difficulty: 1
tags: ["alertmanager", "slack", "alert", "notification"]
hints:
  - "alertmanager.yml의 route 설정에서 receiver 이름이 정확히 일치하는지 확인하세요."
  - "Alertmanager UI에서 알림이 silenced 상태인지 확인해 보세요."
  - "Slack webhook URL이 유효한지, receiver 설정에 오타가 없는지 검토하세요."
---

## 상황

Prometheus에서 알림 규칙이 firing 상태이지만, Slack 채널에 알림이 도착하지 않습니다. Alertmanager 웹 UI에서는 알림이 보이는데 Slack으로 전달이 안 되는 상황입니다. 제공된 설정을 분석하여 원인을 찾으세요.

## 데이터

### alertmanager.yml

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ["alertname", "namespace"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: "default"
  routes:
    - match:
        severity: critical
      receiver: "slack-critical"
    - match:
        severity: warning
      receiver: "slack_warning"

receivers:
  - name: "default"
    webhook_configs: []
  - name: "slack-critical"
    slack_configs:
      - api_url: "https://hooks.slack.com/services/T00000/B00000/XXXX"
        channel: "#alerts-critical"
        title: "[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}"
        text: "{{ .CommonAnnotations.summary }}"
  - name: "slack-warning"
    slack_configs:
      - api_url: "https://hooks.slack.com/services/T00000/B00000/YYYY"
        channel: "#alerts-warning"
        title: "[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}"
        text: "{{ .CommonAnnotations.summary }}"
```

### Alertmanager UI - Active Alerts

```log
Alert: HighMemoryUsage
  severity: warning
  namespace: production
  instance: api-server-7d4f8b6c9-x2k8p
  summary: Memory usage is above 85%
  Status: active (not inhibited, not silenced)
  Receiver: <no matching receiver>
```

## 해설

### 원인 분석

Alertmanager UI에서 `Receiver: <no matching receiver>`가 표시되고 있습니다. 이는 route 설정에서 이 알림에 매칭되는 receiver를 찾지 못했다는 뜻입니다.

`alertmanager.yml`의 routes를 보면 `severity: warning` 알림은 `"slack_warning"` (언더스코어)으로 라우팅되지만, receivers에 정의된 이름은 `"slack-warning"` (하이픈)입니다. **receiver 이름 불일치**로 인해 매칭에 실패하고, 알림이 어떤 receiver에도 전달되지 않는 것입니다.

### 해결 방법

```bash
# 1. alertmanager.yml에서 route의 receiver 이름을 수정
# 변경 전: receiver: "slack_warning"
# 변경 후: receiver: "slack-warning"

# 2. 설정 파일 문법 검증
amtool check-config alertmanager.yml

# 3. Alertmanager 설정 리로드
curl -X POST http://alertmanager:9093/-/reload
# 또는 Kubernetes 환경이라면:
kubectl rollout restart statefulset alertmanager

# 4. Slack 채널에 알림이 도착하는지 확인
```

### 실무 팁

Alertmanager 설정에서 receiver 이름 불일치는 흔한 실수입니다. `amtool check-config`로 문법 오류는 잡히지만, receiver 이름 불일치는 경고 없이 넘어갈 수 있습니다. CI 파이프라인에서 `amtool config routes test` 명령으로 각 severity 라벨이 의도한 receiver로 라우팅되는지 자동 검증하면 이런 문제를 사전에 방지할 수 있습니다.
