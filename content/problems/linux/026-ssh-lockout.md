---
id: "linux-026"
title: "비밀번호가 맞는데도 SSH 접속이 실패하는 원인 분석"
category: "linux"
difficulty: 2
tags: ["ssh", "auth", "lockout", "sshd-config", "security"]
hints:
  - "보안 로그(`/var/log/auth.log`)에서 인증 실패 기록을 확인해 보세요."
  - "SSH 데몬의 최대 인증 시도 횟수 설정을 확인해 보세요."
  - "`MaxAuthTries` 설정 값과 실제 실패 횟수를 비교해 보세요."
---

## 상황

개발자 `dev` 계정이 서버에 SSH 접속할 수 없습니다. 비밀번호는 맞다고 하지만 로그인 과정에서 연결이 반복적으로 종료됩니다. 제공된 접속 시도 결과와 보안 로그, SSH 설정을 바탕으로 원인을 분석하고 해결하세요.

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

개발자가 비밀번호를 여러 번 잘못 입력하면서, 각 SSH 세션에서 허용된 인증 시도 횟수를 초과해 연결이 종료되고 있습니다. 즉 일반적인 "계정 잠금"이라기보다, `MaxAuthTries` 값이 낮아 인증 과정이 너무 빨리 중단되는 상황입니다.

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

`MaxAuthTries`를 너무 높이면 무차별 대입 공격(brute-force)에 취약해질 수 있으므로, 값 조정은 신중해야 합니다. 반복적인 인증 실패 대응은 `fail2ban`처럼 IP 단위 차단 도구와 함께 운영하는 편이 안전하며, 가능하면 비밀번호 대신 SSH 키 인증(`PasswordAuthentication no`)을 사용해 인증 실패 자체를 줄이는 것이 좋습니다.
