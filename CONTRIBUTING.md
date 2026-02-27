# 문제 기여 가이드

Infratice는 실무 인프라 장애 시나리오를 커뮤니티와 함께 만들어 갑니다.  
아래 가이드를 따라 PR을 열어주세요.

---

## 1. 기여 전 확인사항

- [ ] 동일하거나 유사한 문제가 이미 등록되어 있지 않은지 확인
- [ ] 실제 실무에서 발생할 수 있는 장애 시나리오인지 확인
- [ ] 개인 정보, 실제 도메인/IP/토큰이 포함되어 있지 않은지 확인

---

## 2. 카테고리 및 ID 규칙

| 카테고리 | 디렉터리 | ID 예시 |
|---|---|---|
| Linux | `content/problems/linux/` | `linux-003` |
| Kubernetes | `content/problems/kubernetes/` | `kubernetes-002` |
| 네트워크 | `content/problems/network/` | `network-002` |
| CI/CD | `content/problems/cicd/` | `cicd-002` |
| 모니터링 | `content/problems/monitoring/` | `monitoring-001` |

**파일명 규칙:** `{NNN}-{짧은-설명}.md`
- `NNN`: 해당 카테고리의 다음 번호 (3자리, 예: `003`)
- 짧은 설명: 소문자, 하이픈 구분, 20자 이내
- 예) `003-oom-killed.md`, `002-service-unreachable.md`

---

## 3. 문제 작성 방법

### Step 1. 템플릿 복사

```bash
cp content/problems/TEMPLATE.md content/problems/{카테고리}/{NNN}-{설명}.md
```

### Step 2. Frontmatter 작성

```yaml
---
id: "linux-003"           # 카테고리-번호
title: "문제 제목"
category: "linux"         # linux | kubernetes | network | cicd | monitoring
difficulty: 2             # 1(쉬움) | 2(보통) | 3(어려움)
tags: ["tag1", "tag2"]    # 소문자, 2~5개
hints:
  - "힌트 1"
  - "힌트 2"
---
```

### Step 3. 본문 3개 섹션 작성

| 섹션 | 역할 | 분량 |
|---|---|---|
| `## 상황` | 문제 상황 설명 | 2~4문장 |
| `## 데이터` | 로그·설정 파일 등 원인 분석에 필요한 데이터 | 탭 2~4개 |
| `## 해설` | 원인 분석 / 해결 방법 / 실무 팁 | 자유 |

---

## 4. 데이터 작성 규칙

### 코드 블록 언어 지정 (필수)

````markdown
### nginx.conf
```nginx
...
```

### error.log
```log
...
```

### kubectl describe pod
```yaml
...
```
````

**지원 언어:** `bash` `shell` `nginx` `yaml` `json` `dockerfile` `ini` `toml` `log` `plaintext`

### 데이터 품질 기준

- **최소화**: 문제 해결에 필요한 내용만 남기고 나머지는 `...`로 생략
- **익명화**: 실제 도메인 → `example.com`, 실제 IP → `192.168.x.x` 또는 `10.0.x.x`
- **재현 가능성**: 제공된 데이터만으로 원인을 추론할 수 있어야 함

---

## 5. 힌트 작성 기준

| 좋은 힌트 | 나쁜 힌트 |
|---|---|
| "error.log에서 포트 충돌 관련 메시지를 찾아보세요." | "포트가 이미 사용 중입니다." (정답 노출) |
| "upstream 서버가 실제로 실행 중인지 확인하세요." | "백엔드를 재시작하면 됩니다." (해결책 직접 제공) |
| "`kubectl describe`의 Events 섹션을 확인하세요." | "힌트: 환경변수가 없습니다." (너무 구체적) |

---

## 6. 난이도 기준

| 난이도 | 기준 | 예시 |
|---|---|---|
| `1` | 단일 로그 또는 설정 파일에서 에러 메시지를 찾으면 바로 원인 파악 | 디스크 풀, 포트 충돌 |
| `2` | 2~3개 데이터를 교차 분석하거나 단계적 추론이 필요 | 502 에러, CrashLoopBackOff |
| `3` | 복합 원인이거나 심화 개념 이해가 필요 | 네트워크 레이턴시 + 타임아웃 복합, OOM 분석 |

---

## 7. PR 제출 전 셀프 체크리스트

```
[ ] TEMPLATE.md를 복사하여 작성했다
[ ] id가 기존 문제와 중복되지 않는다
[ ] 파일명 규칙을 따랐다 (예: 003-oom-killed.md)
[ ] ## 상황 / ## 데이터 / ## 해설 섹션이 모두 있다
[ ] ## 해설 안에 ### 원인 분석 / ### 해결 방법 / ### 실무 팁이 있다
[ ] 코드 블록에 언어가 지정되어 있다
[ ] 힌트가 1개 이상 있으며, 정답을 직접 알려주지 않는다
[ ] 개인 정보 및 실제 자격증명이 없다
[ ] pnpm dev로 로컬에서 페이지가 정상 렌더링되는 것을 확인했다
```

---

## 8. 로컬에서 확인하는 방법

```bash
# 개발 서버 실행
pnpm dev

# 브라우저에서 확인
# http://localhost:3000/problems/{카테고리}/{파일명(확장자 제외)}
# 예) http://localhost:3000/problems/linux/003-oom-killed
```

---

## 9. 커밋 메시지 규칙

릴리즈 시 CHANGELOG.md가 자동 생성됩니다. 아래 형식을 따르면 변경 이력이 올바르게 분류됩니다.

```
<타입>: <설명>
```

| 타입 | CHANGELOG 분류 | 예시 |
|---|---|---|
| `content` | 문제 추가 | `content: K8s ImagePullBackOff 문제 추가` |
| `feat` | 새 기능 | `feat: 문제 목록 필터 기능 추가` |
| `fix` | 버그 수정 | `fix: 다크모드 bullet 렌더링 오류 수정` |
| `perf` | 성능 개선 | `perf: Shiki 싱글턴 캐싱 적용` |
| `refactor` | 리팩터링 | `refactor: content 파싱 로직 분리` |
| `chore`, `ci`, `docs`, `style` | (CHANGELOG 미포함) | `chore: 의존성 업데이트` |

---

## 10. 문의

문제 제안이나 기여 관련 질문은 [GitHub Issues](https://github.com/kiku99/Infratice/issues)를 통해 남겨주세요.
