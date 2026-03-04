---
id: "linux-025"
title: "업로드 크기 제한을 위한 대용량 파일 분할"
category: "linux"
difficulty: 2
tags: ["split", "file", "upload", "size-limit"]
hints:
  - "`find`로 특정 크기 이상의 파일을 검색할 수 있습니다."
  - "`split`의 `-b` 옵션으로 바이트 단위 분할이 가능합니다."
  - "분할 파일의 접두사를 원본 파일명과 연결하면 관리가 편합니다."
---

## 상황

애플리케이션이 `/tmp/app/` 디렉터리의 파일을 외부 서비스에 업로드하는데, 최대 허용 파일 크기가 1MB입니다. 일부 파일이 이 제한을 초과하여 업로드에 실패하고 있습니다. 초과 파일을 1MB 단위로 분할하여 업로드가 가능하도록 처리하세요.

## 데이터

### 업로드 에러 로그

```log
ERROR: Upload failed - /tmp/app/uploads/video.mp4 (3.2MB) exceeds 1MB limit
ERROR: Upload failed - /tmp/app/data/archive.tar.gz (2.5MB) exceeds 1MB limit
```

### find /tmp/app -type f -size +1M

```bash
/tmp/app/uploads/video.mp4
/tmp/app/data/archive.tar.gz
```

### ls -lh /tmp/app/uploads/ /tmp/app/data/

```bash
/tmp/app/uploads/:
-rw-r--r-- 1 app app 3.2M Mar 04 video.mp4
-rw-r--r-- 1 app app 512K Mar 04 photo.jpg

/tmp/app/data/:
-rw-r--r-- 1 app app 2.5M Mar 04 archive.tar.gz
-rw-r--r-- 1 app app 800K Mar 04 report.csv
```

## 해설

### 원인 분석

`video.mp4`(3.2MB)와 `archive.tar.gz`(2.5MB)가 1MB 업로드 제한을 초과합니다. `photo.jpg`(512KB)와 `report.csv`(800KB)는 제한 내이므로 문제없습니다. 초과 파일을 1MB 단위로 분할하면 업로드가 가능합니다.

### 해결 방법

```bash
# 1. 1MB 초과 파일 확인
find /tmp/app -type f -size +1M

# 2. 각 초과 파일을 1MB 단위로 분할 (원본 디렉터리에 저장)
find /tmp/app -type f -size +1M -exec sh -c '
  split -b 1m "$1" "${1}.part_"
' _ {} \;

# 3. 분할 결과 확인
ls -lh /tmp/app/uploads/
# video.mp4          (원본 유지)
# video.mp4.part_aa  (1MB)
# video.mp4.part_ab  (1MB)
# video.mp4.part_ac  (1MB)
# video.mp4.part_ad  (0.2MB)

# 4. 분할 파일 합치기 (수신 측에서 복원)
cat /tmp/app/uploads/video.mp4.part_* > /tmp/app/uploads/video_restored.mp4
```

### 실무 팁

파일 분할 후 수신 측에서 `cat`으로 합칠 수 있으므로 데이터 손실 없이 복원 가능합니다. 무결성 검증을 위해 원본 파일의 `md5sum`을 저장하고, 복원 후 비교하세요. 실무에서는 S3 multipart upload, `rsync`, `scp` 등 대용량 파일 전송을 기본 지원하는 도구를 사용하는 것이 더 적절합니다.
