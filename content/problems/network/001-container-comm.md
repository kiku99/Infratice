---
id: "network-001"
title: "컨테이너 간 통신 불가 원인 분석"
category: "network"
difficulty: 2
tags: ["docker", "iptables", "network", "firewall"]
hints:
  - "두 컨테이너가 같은 Docker 네트워크에 속해 있는지 확인하세요."
  - "docker network inspect 출력에서 각 컨테이너의 네트워크를 비교해 보세요."
  - "Docker 네트워크 기본값(bridge)의 특성을 생각해 보세요."
---

## 상황

Docker로 운영 중인 서비스에서 `web` 컨테이너가 `api` 컨테이너에 HTTP 요청을 보내지 못하고 있습니다. 두 컨테이너 모두 같은 호스트에서 실행 중입니다. 네트워크 설정을 분석하여 통신 불가 원인을 찾으세요.

## 데이터

### docker ps 출력

```bash
CONTAINER ID   IMAGE          PORTS                  NAMES       NETWORK
a1b2c3d4e5f6   web:latest     0.0.0.0:80->80/tcp     web         bridge
f6e5d4c3b2a1   api:latest     0.0.0.0:8080->8080/tcp api         my-app-network
```

### web 컨테이너에서 통신 테스트

```bash
root@a1b2c3d4e5f6:/# curl http://api:8080/health
curl: (6) Could not resolve host: api

root@a1b2c3d4e5f6:/# curl http://172.18.0.2:8080/health
curl: (7) Failed to connect to 172.18.0.2 port 8080: No route to host
```

### docker network inspect bridge (발췌)

```json
{
    "Name": "bridge",
    "Containers": {
        "a1b2c3d4e5f6": {
            "Name": "web",
            "IPv4Address": "172.17.0.2/16"
        }
    }
}
```

### docker network inspect my-app-network (발췌)

```json
{
    "Name": "my-app-network",
    "Driver": "bridge",
    "Containers": {
        "f6e5d4c3b2a1": {
            "Name": "api",
            "IPv4Address": "172.18.0.2/16"
        }
    }
}
```

## 해설

### 원인 분석

두 컨테이너가 **서로 다른 Docker 네트워크**에 연결되어 있습니다:
- `web` 컨테이너: `bridge` 네트워크 (172.17.0.0/16)
- `api` 컨테이너: `my-app-network` 네트워크 (172.18.0.0/16)

서로 다른 Docker 브릿지 네트워크에 속한 컨테이너는 기본적으로 통신할 수 없습니다. 또한 기본 `bridge` 네트워크에서는 컨테이너 이름으로 DNS 해석이 불가능합니다. (사용자 정의 네트워크에서만 가능)

### 해결 방법

```bash
# 방법 1: web 컨테이너를 my-app-network에 추가 연결
docker network connect my-app-network web

# 연결 확인
docker exec web curl http://api:8080/health

# 방법 2: (더 깔끔한 방법) 두 컨테이너를 같은 네트워크로 재구성
docker stop web
docker rm web
docker run -d --name web --network my-app-network -p 80:80 web:latest

# 방법 3: docker-compose.yml로 네트워크를 명시적으로 관리
# (근본적 해결)
```

### 실무 팁

Docker Compose를 사용하면 같은 `docker-compose.yml`에 정의된 서비스들은 자동으로 하나의 네트워크를 공유하여 이런 문제를 예방할 수 있습니다. 마이크로서비스 환경에서는 네트워크를 기능 단위로 분리하고, 필요한 서비스만 공유 네트워크에 연결하는 것이 보안상 좋습니다.
