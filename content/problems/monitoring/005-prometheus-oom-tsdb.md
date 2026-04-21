---
id: "monitoring-005"
title: "Prometheus 메모리 부족으로 인한 반복 재시작 해결"
category: "monitoring"
difficulty: 3
tags: ["prometheus", "oom", "tsdb", "cardinality", "retention"]
hints:
  - "Prometheus의 메모리 사용량과 시계열(time series) 수를 확인하세요."
  - "TSDB의 head series 수가 비정상적으로 높지 않은지 확인해 보세요."
  - "특정 메트릭의 카디널리티가 폭발적으로 증가한 원인이 될 수 있습니다."
---

## 상황

Kubernetes 클러스터에서 Prometheus가 OOMKilled로 반복 재시작되고 있습니다. 메모리 제한을 4Gi에서 8Gi로 늘렸지만 여전히 문제가 발생합니다. 지난주까지는 4Gi에서 안정적으로 동작했습니다. 제공된 정보를 교차 분석하여 근본 원인을 찾으세요.

## 데이터

### kubectl describe pod prometheus-server-0 (발췌)

```yaml
Containers:
  prometheus:
    Image:       prom/prometheus:v2.49.0
    Limits:
      memory: 8Gi
    Requests:
      memory: 4Gi
    State:       Waiting
      Reason:    CrashLoopBackOff
    Last State:  Terminated
      Reason:    OOMKilled
      Exit Code: 137
    Restart Count: 7
```

### Prometheus TSDB 상태 (장애 직전 스냅샷)

```log
prometheus_tsdb_head_series:             2,847,531
prometheus_tsdb_head_series (1주 전):      312,408
prometheus_tsdb_head_chunks:             8,542,593
prometheus_tsdb_compactions_failed_total: 3
prometheus_tsdb_storage_blocks_bytes:     12,847,293,440
```

### 카디널리티 상위 메트릭 (promtool tsdb analyze)

```log
Top 10 label names with highest cumulative label value count:
  request_id         2,104,832
  trace_id             421,506
  pod                    1,247
  namespace                 12
  instance                  45

Top 10 series count by metric name:
  http_request_duration_seconds_bucket    1,892,416
  http_request_duration_seconds_count       214,773
  http_request_duration_seconds_sum         214,773
  node_cpu_seconds_total                        128
  container_memory_usage_bytes                1,247
```

### 최근 배포 변경 사항 (git log 발췌)

```log
commit a3f2e1d (3일 전)
Author: dev-team
Message: feat: add distributed tracing labels to HTTP metrics

  - Added request_id and trace_id labels to http_request_duration histogram
  - Updated ServiceMonitor to scrape new labels
```

## 해설

### 원인 분석

이 문제는 **메트릭 카디널리티 폭발**(cardinality explosion)이 원인입니다. 여러 데이터를 교차 분석하면 전체 그림이 보입니다.

1. **TSDB 상태**: head series가 1주 만에 312K → 2.85M으로 **약 9배 증가**했습니다.
2. **카디널리티 분석**: `request_id` 라벨이 210만 개의 고유 값을 가지고 있으며, `http_request_duration_seconds_bucket` 메트릭 하나가 189만 개의 시계열을 차지합니다.
3. **변경 이력**: 3일 전 커밋에서 HTTP 메트릭에 `request_id`와 `trace_id` 라벨을 추가했습니다.

`request_id`는 요청마다 고유한 값이므로, 요청이 올 때마다 새로운 시계열이 생성됩니다. histogram 메트릭(`_bucket`)은 버킷 수만큼 시계열이 곱해지므로, 기본 버킷 10개 × 고유 request_id 수만큼 시계열이 폭발적으로 증가합니다. 이로 인해 TSDB의 메모리 사용량이 8Gi를 초과하여 OOMKilled가 발생합니다.

### 해결 방법

```bash
# 1. 긴급 조치: 문제 메트릭의 수집을 즉시 중단
#    prometheus.yml에 metric_relabel_configs 추가:
#    - source_labels: [__name__]
#      regex: "http_request_duration_seconds_(bucket|count|sum)"
#      action: drop

# 2. Prometheus 설정 리로드
curl -X POST http://prometheus:9090/-/reload

# 3. 근본 해결: 애플리케이션에서 request_id, trace_id 라벨 제거
#    이 라벨들은 트레이싱 시스템(Jaeger, Tempo 등)에서 관리해야 하며,
#    Prometheus 메트릭에 포함시키면 안 됨

# 4. 변경 배포 후 시계열 수 모니터링
curl -s http://prometheus:9090/api/v1/status/tsdb | python3 -m json.tool

# 5. TSDB의 stale 시계열이 정리될 때까지 대기 (기본 5분 후 stale marking)
#    이전 시계열은 head compaction 이후 메모리에서 해제됨
```

### 실무 팁

Prometheus 메트릭에 요청 ID, 사용자 ID, 세션 ID 같은 고카디널리티 라벨을 절대 추가하면 안 됩니다. 이런 값들은 로그나 트레이싱 시스템에서 관리해야 합니다. 카디널리티 폭발을 사전에 방지하려면 `prom-label-proxy`나 recording rule로 라벨 수를 제한하고, `prometheus_tsdb_head_series` 메트릭에 대한 알림을 설정하여 시계열 수 급증을 조기에 감지하세요.
