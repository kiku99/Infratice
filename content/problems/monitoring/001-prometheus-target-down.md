---
id: "monitoring-001"
title: "Prometheus 타겟 수집 실패 디버깅"
category: "monitoring"
difficulty: 1
tags: ["prometheus", "target", "scrape", "service-discovery"]
hints:
  - "Prometheus의 Targets 페이지에서 타겟 상태와 에러 메시지를 확인하세요."
  - "scrape 설정의 포트 번호와 실제 애플리케이션의 메트릭 포트를 비교해 보세요."
  - "애플리케이션이 /metrics 엔드포인트를 정상적으로 노출하고 있는지 확인하세요."
---

## 상황

Kubernetes 클러스터에서 Prometheus로 애플리케이션 메트릭을 수집하고 있습니다. 새로 배포한 `payment-service`의 메트릭이 Grafana 대시보드에 표시되지 않습니다. Prometheus Targets 페이지에서 해당 타겟이 DOWN 상태입니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### Prometheus Targets 페이지 출력

```log
Endpoint                                    State   Error
http://10.244.1.15:8080/metrics             DOWN    Get "http://10.244.1.15:8080/metrics": dial tcp 10.244.1.15:8080: connect: connection refused
http://10.244.2.8:9090/metrics              UP
http://10.244.3.12:9090/metrics             UP
```

### prometheus.yml (scrape_configs 발췌)

```yaml
scrape_configs:
  - job_name: "payment-service"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: payment-service
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${1}
    scrape_interval: 15s
    metrics_path: /metrics
```

### kubectl describe pod payment-service-6b8f9c7d4-k2m5n (발췌)

```yaml
Containers:
  payment:
    Image:       registry.example.com/payment-service:v1.3.0
    Ports:       8080/TCP (http), 9090/TCP (metrics)
    State:       Running
    Ready:       True
Annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
```

## 해설

### 원인 분석

Prometheus Targets 페이지에서 `payment-service`에 **포트 8080**으로 스크래핑을 시도하고 있지만, Pod의 annotation에는 메트릭 포트가 **9090**으로 명시되어 있습니다.

`prometheus.yml`의 relabel 설정을 보면, `__meta_kubernetes_pod_annotation_prometheus_io_port` 값을 `__address__`로 치환하는 규칙이 있지만 `replacement` 패턴이 잘못되어 Pod IP와 포트를 올바르게 조합하지 못하고 있습니다. 결과적으로 기본 컨테이너 포트인 8080으로 연결을 시도하여 `connection refused`가 발생합니다. 메트릭은 9090 포트에서 노출되므로 8080에는 `/metrics` 엔드포인트가 없습니다.

### 해결 방법

```bash
# 1. 먼저 메트릭 포트에서 정상 응답하는지 직접 확인
kubectl exec -it payment-service-6b8f9c7d4-k2m5n -- curl -s http://localhost:9090/metrics | head -5

# 2. prometheus.yml의 relabel_configs를 수정하여 포트를 올바르게 매핑
# 아래와 같이 __address__에 Pod IP + annotation 포트를 조합하도록 변경:
#
#   - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
#     action: replace
#     target_label: __address__
#     regex: ([^:]+)(?::\d+)?;(\d+)
#     replacement: ${1}:${2}

# 3. Prometheus 설정 리로드
kubectl exec -it prometheus-server-0 -- kill -HUP 1
# 또는 /-/reload 엔드포인트 호출
curl -X POST http://prometheus:9090/-/reload

# 4. Targets 페이지에서 payment-service가 UP인지 확인
```

### 실무 팁

Prometheus의 Kubernetes SD relabel 설정은 복잡하기 때문에, 처음 설정할 때 `metric_relabel_configs`와 `relabel_configs`의 차이를 명확히 이해해야 합니다. `prometheus.io/port` annotation을 활용하는 표준 패턴을 팀 위키에 문서화해 두면 반복 실수를 줄일 수 있습니다.
