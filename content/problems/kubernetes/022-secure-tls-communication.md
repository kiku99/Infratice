---
id: "kubernetes-022"
title: "cert-manager를 이용한 내부 서비스 TLS 인증서 발급 실패"
category: "kubernetes"
difficulty: 3
tags: ["cert-manager", "tls", "clusterissuer", "certificate", "ca"]
hints:
  - "Certificate 리소스의 Status와 Events에서 발급 실패 원인을 확인하세요."
  - "Issuer 체인을 따라가 보세요: Certificate → CA Issuer → CA Certificate → SelfSigned ClusterIssuer 순서로 모두 정상인지 확인하세요."
  - "CA Issuer가 참조하는 Secret이 실제로 존재하고 올바른 키를 포함하는지 확인하세요."
---

## 상황

내부 서비스 간 TLS 통신을 위해 cert-manager를 사용하여 인증서를 발급하려 합니다. SelfSigned ClusterIssuer → CA Certificate → CA Issuer → 최종 Certificate 순서로 설정했지만, 최종 인증서가 `False` (Ready) 상태입니다. 제공된 정보를 분석하여 원인을 찾으세요.

## 데이터

### kubectl get certificate -n preparesh

```bash
NAME       READY   SECRET          AGE
ca-cert    True    ca-secret       10m
web-cert   False   web-cert-tls    5m
```

### kubectl describe certificate web-cert -n preparesh (발췌)

```bash
Status:
  Conditions:
    Type:    Ready
    Status:  False
    Reason:  DoesNotExist
    Message: Issuing certificate as Secret does not exist
  Next Private Key Secret Name: web-cert-tls-next
Events:
  Type     Reason           Age                From                    Message
  ----     ------           ----               ----                    -------
  Normal   Issuing          5m                 cert-manager-certificates-trigger  Issuing certificate as Secret does not exist
  Warning  ErrIssuerNotReady  3m (x5 over 5m)  cert-manager-certificates-issuing  Referenced "Issuer" not ready: issuer.cert-manager.io "ca-issuer" not found
```

### kubectl get issuer,clusterissuer --all-namespaces

```bash
NAMESPACE    NAME                                  READY   AGE
             clusterissuer.cert-manager.io/selfsigned-issuer   True    10m
```

### web-cert.yaml

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web-cert
  namespace: preparesh
spec:
  secretName: web-cert-tls
  issuerRef:
    name: ca-issuer
    kind: Issuer
  dnsNames:
  - web.preparesh.svc
  - web.preparesh.svc.cluster.local
```

### ca-cert.yaml

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ca-cert
  namespace: preparesh
spec:
  isCA: true
  commonName: preparesh-ca
  secretName: ca-secret
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
```

## 해설

### 원인 분석

Events에서 `Referenced "Issuer" not ready: issuer.cert-manager.io "ca-issuer" not found`가 핵심입니다. `web-cert`가 참조하는 `ca-issuer`라는 Issuer가 `preparesh` Namespace에 존재하지 않습니다.

`kubectl get issuer,clusterissuer --all-namespaces` 결과를 보면 `selfsigned-issuer` ClusterIssuer만 있고, CA Issuer인 `ca-issuer`가 생성되지 않았습니다. 인증서 발급 체인은 SelfSigned ClusterIssuer → CA Certificate(ca-cert) → **CA Issuer(ca-issuer)** → 최종 Certificate(web-cert) 순서인데, 중간 단계인 CA Issuer가 빠져 있어 최종 인증서 발급이 실패하는 것입니다.

### 해결 방법

```bash
# 1. CA Issuer 생성 (ca-secret을 CA로 사용)
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: ca-issuer
  namespace: preparesh
spec:
  ca:
    secretName: ca-secret
EOF

# 2. Issuer Ready 상태 확인
kubectl get issuer ca-issuer -n preparesh

# 3. Certificate가 자동으로 재발급되는지 확인
kubectl get certificate web-cert -n preparesh -w

# 4. TLS Secret 생성 확인
kubectl get secret web-cert-tls -n preparesh
```

### 실무 팁

cert-manager의 인증서 발급 체인은 SelfSigned → CA Certificate → CA Issuer → Application Certificate 순서로 구성됩니다. 문제가 발생하면 이 체인을 역순으로 추적하며 각 단계의 Ready 상태를 확인하세요. `cmctl status certificate <name>` 명령을 사용하면 전체 체인의 상태를 한눈에 파악할 수 있습니다.
