---
id: "kubernetes-027"
title: "HPA가 메트릭을 읽지 못해 스케일링하지 않는 문제"
category: "kubernetes"
difficulty: 2
tags: ["hpa", "autoscaling", "metrics-server", "resource-requests"]
hints:
  - "kubectl describe hpa 출력에서 Metrics 섹션의 에러 메시지를 확인하세요."
  - "metrics-server가 설치되어 있고 정상 동작하는지 확인하세요."
  - "HPA가 메트릭을 읽으려면 대상 Pod에 resource requests가 설정되어 있어야 합니다."
---

## 상황

트래픽 증가에 대비해 HPA(HorizontalPodAutoscaler)를 설정했지만 CPU 사용률이 90%를 넘어도 Pod가 스케일아웃되지 않습니다. HPA의 현재 상태가 `<unknown>/50%`로 표시됩니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get hpa 출력

```bash
NAME          REFERENCE                TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
web-app-hpa   Deployment/web-app       <unknown>/50%   2         10        2          15m
```

### kubectl describe hpa web-app-hpa (발췌)

```yaml
Metrics:
  Resource  cpu on pods (as a percentage of request):  <unknown> / 50%
Conditions:
  Type            Status  Reason                   Message
  ----            ------  ------                   -------
  AbleToScale     True    SucceededGetScale        the HPA controller was able to get the target's current scale
  ScalingActive   False   FailedGetResourceMetric  the HPA was unable to compute the replica count: failed to get cpu utilization: missing request for cpu in container "web" of Pod "web-app-6d8f9c4b7-k3m2n"
Events:
  Type     Reason                        Age                From                       Message
  ----     ------                        ----               ----                        -------
  Warning  FailedComputeMetricsReplicas  12s (x15 over 14m) horizontal-pod-autoscaler  failed to get cpu utilization: missing request for cpu
```

### Deployment 스펙 (발췌)

```yaml
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: web
        image: registry.example.com/web-app:v1.2.0
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: "500m"
            memory: "256Mi"
          # requests 섹션 없음
```

### kubectl top pods 출력

```bash
NAME                       CPU(cores)   MEMORY(bytes)
web-app-6d8f9c4b7-k3m2n   456m         180Mi
web-app-6d8f9c4b7-r8n5p   478m         175Mi
```

## 해설

### 원인 분석

HPA의 에러 메시지가 원인을 정확히 알려줍니다:

> `missing request for cpu in container "web"`

HPA는 CPU 사용률을 **requests 대비 백분율**로 계산합니다. Deployment 스펙을 보면 `resources.limits`는 설정되어 있지만 `resources.requests`가 **누락**되어 있습니다. requests가 없으면 HPA가 "현재 CPU가 목표 대비 몇 %인지"를 계산할 수 없어 `<unknown>`으로 표시됩니다.

`kubectl top pods`에서 실제 CPU 사용량이 456m~478m으로 높은 상태임에도 불구하고, HPA는 메트릭을 읽지 못해 스케일링 결정을 내릴 수 없습니다.

### 해결 방법

```bash
# 1. Deployment에 resource requests 추가
kubectl edit deployment web-app
# containers[0].resources에 requests 추가:
#   resources:
#     requests:
#       cpu: "200m"
#       memory: "128Mi"
#     limits:
#       cpu: "500m"
#       memory: "256Mi"

# 2. Pod가 재생성된 후 HPA 상태 확인
kubectl get hpa web-app-hpa

# 3. 정상적으로 TARGETS에 백분율이 표시되는지 확인
# 예: 228%/50% → 즉시 스케일아웃 시작
```

### 실무 팁

HPA를 사용할 때는 반드시 대상 컨테이너에 `resources.requests`를 설정하세요. requests 없이 limits만 설정하면 HPA뿐 아니라 스케줄러의 리소스 할당도 예측하기 어려워집니다. 일반적으로 requests는 평균 사용량, limits는 최대 허용량으로 설정하는 것이 좋습니다.
