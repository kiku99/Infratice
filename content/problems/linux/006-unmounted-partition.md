---
id: "linux-006"
title: "사용되지 않는 파티션을 스토리지로 활용하기"
category: "linux"
difficulty: 2
tags: ["partition", "mount", "ext4", "lsblk", "mkfs"]
hints:
  - "`lsblk` 명령어로 마운트되지 않은 파티션이 있는지 확인해 보세요."
  - "파일시스템을 생성하지 않은 파티션은 마운트할 수 없습니다."
  - "`mkfs`로 파일시스템을 생성하고 `mount`로 마운트하는 순서를 따르세요."
---

## 상황

서버의 데이터 디스크 용량이 부족하여 추가 스토리지가 필요합니다. 서버에 물리 디스크가 추가되었으나 아직 사용 가능한 상태가 아닙니다. 디스크를 확인하여 추가 스토리지로 활용하세요.

## 데이터

### lsblk 출력

```bash
NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda       8:0    0   50G  0 disk
├─sda1    8:1    0   49G  0 part /
└─sda2    8:2    0    1G  0 part [SWAP]
sdb       8:16   0   20G  0 disk
└─sdb1    8:17   0   20G  0 part
```

### blkid 출력

```bash
/dev/sda1: UUID="a1b2c3d4" TYPE="ext4" PARTUUID="abc-001"
/dev/sda2: UUID="e5f6a7b8" TYPE="swap" PARTUUID="abc-002"
/dev/sdb1: PARTUUID="def-001"
```

### df -h 출력

```bash
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        49G   45G  4.0G  92% /
```

## 해설

### 원인 분석

`lsblk` 출력에서 `/dev/sdb1` 파티션(20GB)이 마운트 포인트 없이 존재합니다. `blkid`를 보면 `/dev/sdb1`에는 `TYPE` 필드가 없어 파일시스템이 아직 생성되지 않은 상태입니다. 파일시스템이 없으면 마운트가 불가능하므로 먼저 포맷이 필요합니다.

### 해결 방법

```bash
# 1. ext4 파일시스템 생성 (레이블 포함)
mkfs.ext4 -L data_extra /dev/sdb1

# 2. 마운트 포인트 생성
mkdir -p /mnt/data

# 3. 파티션 마운트
mount /dev/sdb1 /mnt/data

# 4. 마운트 확인
df -h /mnt/data
mount | grep sdb1

# 5. 재부팅 후에도 자동 마운트되도록 /etc/fstab에 추가
echo "UUID=$(blkid -s UUID -o value /dev/sdb1) /mnt/data ext4 defaults 0 2" >> /etc/fstab

# 6. fstab 설정 검증
mount -a
```

### 실무 팁

`/etc/fstab`에 추가할 때는 디바이스 경로(`/dev/sdb1`) 대신 UUID를 사용하세요. 디바이스 경로는 디스크 추가/제거 시 변경될 수 있지만 UUID는 고유합니다. `mount -a` 명령으로 fstab 설정을 검증하고, `fstab`에 오류가 있으면 부팅 불가 상태가 될 수 있으므로 `nofail` 옵션을 추가하는 것도 안전한 방법입니다.
