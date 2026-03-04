---
id: "linux-023"
title: "임시 디렉터리의 빈 폴더 정리하기"
category: "linux"
difficulty: 1
tags: ["find", "directory", "cleanup", "tmp"]
hints:
  - "`find` 명령어에서 빈 디렉터리를 찾는 옵션이 있는지 확인해 보세요."
  - "`-empty`와 `-type d` 옵션을 조합해 보세요."
  - "삭제 전에 대상을 먼저 확인하는 습관을 들이세요."
---

## 상황

`/tmp` 디렉터리에 이전 애플리케이션 실행과 임시 스크립트에서 남긴 빈 디렉터리가 대량으로 존재합니다. 파일이 포함된 디렉터리는 유지하면서 빈 디렉터리만 안전하게 정리하세요.

## 데이터

### ls -la /tmp/ (일부)

```bash
drwxr-xr-x  2 root   root   4096 Feb 15 build_cache/
drwxr-xr-x  2 deploy deploy 4096 Feb 20 session_temp_1234/
drwxr-xr-x  2 root   root   4096 Feb 22 extract_workspace/
drwxr-xr-x  2 app    app    4096 Feb 25 app_tmp_5678/
drwxr-xr-x  3 dev    dev    4096 Mar 01 active_project/
-rw-r--r--  1 dev    dev    8192 Mar 01 active_project/data.csv
```

### find /tmp -maxdepth 1 -type d -empty

```bash
/tmp/build_cache
/tmp/session_temp_1234
/tmp/extract_workspace
/tmp/app_tmp_5678
```

## 해설

### 원인 분석

`/tmp` 디렉터리에 4개의 빈 디렉터리가 존재합니다. `active_project/`는 `data.csv` 파일을 포함하고 있어 빈 디렉터리가 아닙니다. `find`의 `-empty` 옵션으로 내용이 없는 디렉터리만 정확히 식별할 수 있습니다.

### 해결 방법

```bash
# 1. 빈 디렉터리 확인 (삭제 전 검증)
find /tmp -type d -empty

# 2. 빈 디렉터리 삭제
find /tmp -type d -empty -delete

# 3. 정리 확인
find /tmp -type d -empty
# (출력 없음 = 빈 디렉터리 모두 제거됨)
```

```bash
# find -delete 옵션은 -depth를 암시적으로 적용하여
# 하위 디렉터리부터 상위 방향으로 삭제합니다.
# 이로 인해 중첩된 빈 디렉터리도 올바르게 처리됩니다.

# 안전한 대안: -exec 사용
find /tmp -type d -empty -exec rmdir {} +
```

### 실무 팁

정기적인 `/tmp` 정리를 위해 `systemd-tmpfiles`나 `tmpreaper` 패키지를 활용하세요. `systemd-tmpfiles`는 `/etc/tmpfiles.d/`에 설정 파일을 추가하면 부팅 시와 주기적으로 임시 파일을 자동 정리합니다. 삭제 명령을 실행하기 전에 항상 `-delete` 없이 먼저 대상을 확인하는 것이 안전합니다.
