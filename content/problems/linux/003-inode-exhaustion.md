---
id: "linux-003"
title: "디스크 여유 공간이 있는데 파일 생성 불가"
category: "linux"
difficulty: 2
tags: ["inode", "disk", "df", "no-space"]
hints:
  - "`df -h`로 블록 사용량과 `df -i`로 아이노드 사용량을 각각 확인해 보세요."
  - "아이노드를 대량으로 소비하는 디렉터리가 어디인지 찾아보세요."
  - "작은 파일이 대량으로 생성되는 시스템 서비스가 있는지 확인해 보세요."
---

## 상황

서버에서 `touch` 명령어로 새 파일을 만들려 하면 `No space left on device` 에러가 발생합니다. 그런데 `df -h`로 디스크 용량을 확인하면 여유 공간이 충분합니다. 원인을 분석하고 해결하세요.

## 데이터

### touch 실행 결과

```bash
$ touch /tmp/test.txt
touch: cannot touch '/tmp/test.txt': No space left on device
```

### df -h 출력

```bash
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   32G   18G  64% /
/dev/sdb1        10G  2.0G  8.0G  20% /data
```

### df -i 출력

```bash
Filesystem       Inodes   IUsed   IFree IUse% Mounted on
/dev/sda1       6553600 6553600       0  100% /
/dev/sdb1       3276800  125000 3151800    4% /data
```

## 해설

### 원인 분석

`df -h`는 블록(용량) 사용량을 보여주고, `df -i`는 아이노드 사용량을 보여줍니다. `/dev/sda1`의 블록 사용량은 64%로 여유가 있지만, 아이노드 사용량이 **100%**(6,553,600개 전부 사용)입니다.

아이노드(inode)는 파일 시스템에서 각 파일마다 하나씩 할당되는 메타데이터 구조체입니다. 아이노드가 고갈되면 디스크에 여유 공간이 있어도 새 파일을 생성할 수 없습니다. 이 문제는 작은 파일이 대량으로 생성되는 경우(메일 큐, 세션 파일, 캐시 등)에 주로 발생합니다.

### 해결 방법

```bash
# 1. 디렉터리별 파일 수 확인 (아이노드 소비가 큰 디렉터리 찾기)
for dir in /var/spool /tmp /var/lib /var/cache; do
  echo "$(find $dir -type f 2>/dev/null | wc -l) $dir"
done | sort -rn | head -5

# 2. 문제 디렉터리 내 파일 정리 (예: 메일 큐)
rm -rf /var/spool/postfix/maildrop/*

# 3. 아이노드 회복 확인
df -i /
```

### 실무 팁

아이노드 고갈은 `df -h`만 확인하는 습관이 있으면 놓치기 쉽습니다. 모니터링 시스템에 아이노드 사용률 알림을 반드시 추가하세요. PHP 세션 파일(`/var/lib/php/sessions`), 메일 큐(`/var/spool`), 임시 캐시 디렉터리 등이 주요 원인이므로 정기 정리 cron job을 구성하는 것이 좋습니다.
