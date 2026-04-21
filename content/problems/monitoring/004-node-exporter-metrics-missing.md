---
id: "monitoring-004"
title: "Node Exporter 디스크 메트릭 누락 원인 분석"
category: "monitoring"
difficulty: 2
tags: ["node-exporter", "prometheus", "disk", "collector"]
hints:
  - "Node Exporter의 시작 로그에서 비활성화된 collector가 있는지 확인하세요."
  - "node_filesystem 관련 메트릭이 존재하는지 Prometheus에서 직접 조회해 보세요."
  - "Node Exporter의 실행 인자(args)에서 collector 필터링 옵션을 확인하세요."
---

## 상황

서버 모니터링 대시보드에서 디스크 사용량 패널이 비어 있습니다. CPU, 메모리 등 다른 시스템 메트릭은 정상 수집되고 있으며, Node Exporter가 실행 중인 것도 확인했습니다. 제공된 정보를 분석하여 디스크 메트릭만 누락된 원인을 찾으세요.

## 데이터

### Prometheus 메트릭 조회 결과

```log
# 쿼리: node_cpu_seconds_total
결과: 16개 시계열 반환 (정상)

# 쿼리: node_memory_MemTotal_bytes
결과: 2개 시계열 반환 (정상)

# 쿼리: node_filesystem_avail_bytes
결과: empty query result

# 쿼리: node_disk_read_bytes_total
결과: empty query result

# 쿼리: {__name__=~"node_filesystem.*"}
결과: empty query result

# 쿼리: {__name__=~"node_disk.*"}
결과: empty query result
```

### Node Exporter systemd 서비스 설정

```ini
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter \
  --collector.disable-defaults \
  --collector.cpu \
  --collector.meminfo \
  --collector.loadavg \
  --collector.netdev
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Node Exporter 시작 로그

```log
ts=2024-03-10T08:00:01Z caller=node_exporter.go:112 level=info msg="Starting node_exporter" version="1.7.0"
ts=2024-03-10T08:00:01Z caller=node_exporter.go:118 level=info msg="Disabled collectors"
ts=2024-03-10T08:00:01Z caller=node_exporter.go:120 level=info collector=diskstats disabled
ts=2024-03-10T08:00:01Z caller=node_exporter.go:120 level=info collector=filesystem disabled
ts=2024-03-10T08:00:01Z caller=node_exporter.go:125 level=info msg="Enabled collectors"
ts=2024-03-10T08:00:01Z caller=node_exporter.go:127 level=info collector=cpu
ts=2024-03-10T08:00:01Z caller=node_exporter.go:127 level=info collector=loadavg
ts=2024-03-10T08:00:01Z caller=node_exporter.go:127 level=info collector=meminfo
ts=2024-03-10T08:00:01Z caller=node_exporter.go:127 level=info collector=netdev
ts=2024-03-10T08:00:01Z caller=node_exporter.go:199 level=info msg="Listening on" address=:9100
```

## 해설

### 원인 분석

Node Exporter 시작 로그에서 원인을 직접 확인할 수 있습니다:

> `collector=diskstats disabled`
> `collector=filesystem disabled`

서비스 설정에서 `--collector.disable-defaults` 플래그를 사용하고 있습니다. 이 플래그는 **모든 기본 collector를 비활성화**한 뒤, 명시적으로 나열한 collector만 활성화합니다. 현재 `cpu`, `meminfo`, `loadavg`, `netdev`만 활성화되어 있고, 디스크 관련 collector인 `diskstats`와 `filesystem`은 포함되지 않았습니다.

그 결과 `node_filesystem_*`, `node_disk_*` 계열 메트릭이 수집되지 않아 Grafana 대시보드에서 디스크 관련 패널이 비어 있는 것입니다.

### 해결 방법

```bash
# 1. Node Exporter 서비스 파일 수정
sudo vi /etc/systemd/system/node_exporter.service

# ExecStart 라인에 diskstats와 filesystem collector 추가:
#   --collector.diskstats \
#   --collector.filesystem

# 2. systemd 데몬 리로드 및 Node Exporter 재시작
sudo systemctl daemon-reload
sudo systemctl restart node_exporter

# 3. 메트릭 수집 확인
curl -s http://localhost:9100/metrics | grep node_filesystem_avail_bytes | head -3

# 4. Prometheus에서 타겟 재스크래핑 후 데이터 확인
```

### 실무 팁

`--collector.disable-defaults` 사용 시 필요한 collector를 빠뜨리기 쉽습니다. 보안이나 성능상 특정 collector만 필요한 경우가 아니라면, 기본 collector를 유지하고 불필요한 것만 `--no-collector.<name>`으로 비활성화하는 방식이 더 안전합니다.
