---
id: "network-006"
title: "비인가 서비스가 점유한 고포트 정리"
category: "network"
difficulty: 1
tags: ["ss", "port", "security", "audit", "kill"]
hints:
  - "`ss` 또는 `netstat`으로 특정 포트 범위에서 수신 중인 프로세스를 찾을 수 있습니다."
  - "`-tlnp` 옵션으로 TCP 리스닝 포트와 프로세스 정보를 함께 확인할 수 있습니다."
---

## 상황

보안 감사에서 8000~9000 포트 범위에 비인가 애플리케이션이 수신 대기 중인 것이 발견되었습니다. 해당 포트를 점유 중인 프로세스를 식별하고 종료하세요.

## 데이터

### ss -tlnp | grep -E ':(8[0-9]{3}|9000)'

```bash
LISTEN  0  128  0.0.0.0:8080  0.0.0.0:*  users:(("node",pid=5678,fd=3))
LISTEN  0  128  0.0.0.0:8443  0.0.0.0:*  users:(("python3",pid=6789,fd=4))
LISTEN  0  128  0.0.0.0:8888  0.0.0.0:*  users:(("ruby",pid=7890,fd=5))
LISTEN  0  128  0.0.0.0:9000  0.0.0.0:*  users:(("java",pid=8901,fd=6))
```

### ps aux | grep -E '(5678|6789|7890|8901)' | grep -v grep

```bash
deploy    5678  1.2  3.4  456780  34560 ?  Sl  Mar02  2:30 node /tmp/test-server.js
nobody    6789  0.5  1.2  234560  12340 ?  S   Mar03  0:45 python3 -m http.server 8443
deploy    7890  0.8  2.1  345670  21230 ?  Sl  Mar03  1:15 ruby sinatra-app.rb
nobody    8901  2.1  4.5  567890  45670 ?  Sl  Mar01  8:30 java -jar unknown-service.jar
```

## 해설

### 원인 분석

8000~9000 포트 범위에 4개의 비인가 서비스가 수신 대기 중입니다:
- 포트 8080: `node` (테스트 서버, /tmp에서 실행)
- 포트 8443: `python3` (간이 HTTP 서버)
- 포트 8888: `ruby` (Sinatra 앱)
- 포트 9000: `java` (출처 불명 JAR 파일)

`nobody` 사용자로 실행되거나 `/tmp`에서 실행되는 프로세스는 비인가 또는 테스트 목적일 가능성이 높습니다.

### 해결 방법

```bash
# 1. 8000-9000 범위의 수신 포트 확인
ss -tlnp | awk -F: '$2 >= 8000 && $2 <= 9000'

# 2. 비인가 프로세스 종료
kill 5678 6789 7890 8901

# 3. 강제 종료 필요 시
kill -9 5678 6789 7890 8901

# 4. 정리 확인
ss -tlnp | grep -E ':(8[0-9]{3}|9000)'
# (출력 없음 = 정리 완료)

# 5. 관련 파일 제거
rm -f /tmp/test-server.js
```

### 실무 팁

정기적으로 `ss -tlnp`로 수신 포트를 감사하여 비인가 서비스를 조기에 발견하세요. `firewalld`나 `ufw`로 필요한 포트만 허용하고 나머지는 차단하는 화이트리스트 방식을 적용하면 비인가 서비스가 외부에 노출되는 것을 방지할 수 있습니다. 감사 자동화를 위해 스크립트를 cron에 등록하는 것도 좋은 방법입니다.
