---
id: "monitoring-003"
title: "Grafana 대시보드 No Data 해결하기"
category: "monitoring"
difficulty: 2
tags: ["grafana", "prometheus", "datasource", "query"]
hints:
  - "Grafana의 데이터소스 설정에서 Prometheus URL이 올바른지 확인하세요."
  - "Prometheus에서 직접 PromQL 쿼리를 실행해 데이터가 존재하는지 확인해 보세요."
  - "시간 범위(Time range)와 메트릭 이름이 정확한지 검토하세요."
---

## 상황

Grafana 대시보드에서 CPU 사용률 패널이 "No data" 상태입니다. 다른 패널들은 정상적으로 데이터를 표시하고 있으며, Prometheus 자체에서는 메트릭 수집이 진행되고 있는 것으로 보입니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### Grafana 패널 설정 (JSON)

```json
{
  "title": "CPU Usage by Pod",
  "datasource": "Prometheus-Production",
  "targets": [
    {
      "expr": "rate(container_cpu_usage_seconds[5m]) * 100",
      "legendFormat": "{{pod}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent"
    }
  }
}
```

### Prometheus 직접 쿼리 결과

```log
# 쿼리: container_cpu_usage_seconds_total
결과: 142개 시계열 반환 (정상)

# 쿼리: rate(container_cpu_usage_seconds[5m])
결과: empty query result

# 쿼리: rate(container_cpu_usage_seconds_total[5m])
결과: 142개 시계열 반환 (정상)
```

### Grafana 데이터소스 설정

```yaml
Name: Prometheus-Production
Type: Prometheus
URL: http://prometheus-server.monitoring.svc:9090
Access: Server (default)
Status: "Data source is working"
```

## 해설

### 원인 분석

Prometheus에서 직접 쿼리한 결과를 비교하면 원인이 명확합니다:

- `container_cpu_usage_seconds` → empty (존재하지 않는 메트릭)
- `container_cpu_usage_seconds_total` → 142개 시계열 (정상)

Grafana 패널의 PromQL에서 `container_cpu_usage_seconds`로 쿼리하고 있지만, 실제 메트릭 이름은 `container_cpu_usage_seconds_total`입니다. **`_total` 접미사가 누락**되어 빈 결과가 반환되고 있습니다.

`rate()` 함수는 counter 타입 메트릭에 사용하며, Prometheus의 counter 메트릭은 관례적으로 `_total` 접미사를 붙입니다. 데이터소스 연결 자체는 정상이므로 다른 패널들은 올바른 메트릭 이름을 사용하고 있어 문제가 없습니다.

### 해결 방법

```bash
# 1. Grafana 패널 편집 모드에서 PromQL 수정
# 변경 전: rate(container_cpu_usage_seconds[5m]) * 100
# 변경 후: rate(container_cpu_usage_seconds_total[5m]) * 100

# 2. 수정 후 패널에서 데이터가 표시되는지 확인

# 3. 유사한 문제 방지를 위해 Prometheus UI에서 메트릭 이름 자동완성 활용
#    브라우저에서 http://prometheus:9090/graph 접속 → 쿼리 입력 시 자동완성 확인
```

### 실무 팁

PromQL 작성 시 메트릭 이름은 Prometheus UI의 자동완성이나 `/api/v1/label/__name__/values` API로 먼저 확인하면 오타를 줄일 수 있습니다. Grafana에서도 쿼리 에디터의 Metrics Browser 기능을 활용하면 존재하는 메트릭만 선택할 수 있습니다. counter 타입에는 항상 `_total` 접미사가 붙는다는 점을 기억하세요.
