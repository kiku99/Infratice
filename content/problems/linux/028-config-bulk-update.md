---
id: "linux-028"
title: "여러 환경의 설정 파일 일괄 수정하기"
category: "linux"
difficulty: 2
tags: ["sed", "find", "config", "bulk-edit", "automation"]
hints:
  - "`find`와 `sed`를 조합하면 여러 파일을 한 번에 수정할 수 있습니다."
  - "`sed -i`는 파일을 직접(in-place) 수정합니다."
  - "여러 `sed` 표현식을 `-e` 옵션으로 연결할 수 있습니다."
---

## 상황

AWS 인프라의 가용 영역 설정을 단일 AZ에서 멀티 AZ로 변경해야 합니다. staging, dev, prod 등 여러 환경의 설정 파일이 `/etc/app/envs/` 하위에 분산되어 있으며, 모든 `.conf` 파일에서 동일한 변경이 필요합니다. 수동 편집은 실수 가능성이 높아 자동화하세요.

## 데이터

### 설정 파일 위치

```bash
$ find /etc/app/envs -name "*.conf"
/etc/app/envs/staging/app.conf
/etc/app/envs/dev/app.conf
/etc/app/envs/prod/app.conf
```

### 현재 설정 (모든 파일 동일)

```ini
region = "us-east-1"
availability_zone = "us-east-1a"
multi_az = false
instance_type = "t3.medium"
```

### 변경 요구사항

```ini
availability_zone = "us-east-1a,us-east-1b"
multi_az = true
```

## 해설

### 원인 분석

3개 환경 파일에서 `multi_az`를 `false`에서 `true`로, `availability_zone`에 두 번째 AZ를 추가해야 합니다. 수동 편집 시 파일을 누락하거나 오타가 발생할 수 있으므로 `find`와 `sed`를 조합하여 일괄 수정합니다.

### 해결 방법

```bash
# 1. 대상 파일 확인
find /etc/app/envs -name "*.conf" -type f

# 2. 변경 전 백업
find /etc/app/envs -name "*.conf" -exec cp {} {}.bak \;

# 3. 일괄 수정
find /etc/app/envs -name "*.conf" -exec sed -i \
  -e 's/multi_az = false/multi_az = true/' \
  -e 's/availability_zone = "us-east-1a"/availability_zone = "us-east-1a,us-east-1b"/' \
  {} \;

# 4. 변경 결과 확인
find /etc/app/envs -name "*.conf" -exec grep -H "multi_az\|availability_zone" {} \;

# 5. 변경 전후 diff 확인
diff /etc/app/envs/prod/app.conf /etc/app/envs/prod/app.conf.bak
```

### 실무 팁

`sed -i`는 되돌리기가 어려우므로 반드시 백업 후 실행하세요. macOS에서는 `sed -i ''`처럼 빈 백업 확장자를 명시해야 합니다. 인프라 설정 변경은 Ansible, Terraform 같은 IaC(Infrastructure as Code) 도구로 관리하면 버전 관리와 롤백이 가능하여 더 안전합니다. `grep -H`로 변경 결과를 파일명과 함께 확인하면 누락 여부를 빠르게 검증할 수 있습니다.
