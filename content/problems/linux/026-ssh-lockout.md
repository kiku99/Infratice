---
id: "linux-026"
title: "SSH 인증 실패 횟수 초과로 인한 계정 잠금"
category: "linux"
difficulty: 2
tags: ["ssh", "auth", "lockout", "sshd-config", "security"]
hints:
  - "보안 로그(`/var/log/auth.log`)에서 인증 실패 기록을 확인해 보세요."
  - "SSH 데몬의 최대 인증 시도 횟수 설정을 확인해 보세요."
  - "`MaxAuthTries` 설정 값과 실제 실패 횟수를 비교해 보세요."
---

## 상황

개발자 `dev` 계정이 서버에 SSH 접속할 수 없습니다. 비밀번호는 정확하지만 연결이 즉시 끊깁니다. 보안 로그를 확인한 결과 SSH 데몬의 인증 실패 제한에 걸린 것으로 보입니다. 원인을 분석하고 해결하세요.

## 데이터

### SSH 접속 시도

```bash
$ ssh dev@server
dev@server's password:
Permission denied, please try again.
dev@server's password:
Permission denied, please try again.
dev@server's password:
dev@server: Permission denied (publickey,password).
```

### /var/log/auth.log (오늘 날짜)

```log
Mar  4 09:12:01 server sshd[2201]: Failed password for dev from 10.0.0.5 port 5432 ssh2
Mar  4 09:12:05 server sshd[2201]: Failed password for dev from 10.0.0.5 port 5432 ssh2
Mar  4 09:12:08 server sshd[2201]: Failed password for dev from 10.0.0.5 port 5432 ssh2
Mar  4 09:12:12 server sshd[2201]: Failed password for dev from 10.0.0.5 port 5433 ssh2
Mar  4 09:12:15 server sshd[2201]: Failed password for dev from 10.0.0.5 port 5433 ssh2
Mar  4 09:12:18 server sshd[2201]: error: maximum authentication attempts exceeded for dev from 10.0.0.5 port 5433 ssh2 [preauth]
```

### /etc/ssh/sshd_config (발췌)

```bash
MaxAuthTries 3
PermitRootLogin no
PasswordAuthentication yes
```

## 해설

### 원인 분석

`/var/log/auth.log`에서 `dev` 사용자의 인증 실패가 오늘만 **5회** 발생했고, `MaxAuthTries`가 `3`으로 설정되어 있어 SSH 데몬이 연결을 거부하고 있습니다. SSH는 세션당 실패 횟수를 카운트하지만, 반복적인 세션 연결로 인해 계속 차단되는 상태입니다.

개발자가 비밀번호를 여러 번 잘못 입력한 후, `MaxAuthTries` 제한에 걸려 정확한 비밀번호를 입력해도 연결이 끊기는 상황입니다.

### 해결 방법

```bash
# 1. 오늘 dev 사용자의 인증 실패 횟수 확인
grep "$(date '+%b %e')" /var/log/auth.log | grep "Failed password for dev" | wc -l

# 2. MaxAuthTries를 실패 횟수 이상으로 증가
sed -i 's/MaxAuthTries 3/MaxAuthTries 6/' /etc/ssh/sshd_config

# 3. SSH 데몬 재시작
systemctl restart sshd

# 4. 접속 확인
ssh dev@server
```

### 실무 팁

`MaxAuthTries`를 너무 높이면 무차별 대입 공격(brute-force)에 취약해집니다. `fail2ban`을 설치하여 일정 횟수 이상 실패한 IP를 자동 차단하는 것이 보안과 편의성의 균형을 맞추는 좋은 방법입니다. 비밀번호 대신 SSH 키 인증(`PasswordAuthentication no`)을 사용하면 인증 실패 문제를 근본적으로 방지할 수 있습니다.
