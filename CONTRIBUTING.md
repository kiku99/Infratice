# 기여 가이드

Infratice는 커뮤니티 기여로 함께 만들어 가는 DevOps 트러블슈팅 플랫폼입니다.  
기여 유형에 따라 가이드가 다르니, 아래에서 해당하는 항목을 확인해 주세요.

---

## 기여 유형

| 유형 | 설명 | 가이드 |
|---|---|---|
| **문제(콘텐츠) 기여** | 실무 인프라 장애 시나리오 추가 | [→ 문제 기여 가이드](#문제콘텐츠-기여) |
| **기능 기여** | 새로운 UI/UX 기능, 편의 기능 추가 | [→ 코드 기여 가이드](#기능-기여--버그-픽스) |
| **버그 픽스** | 기존 기능의 오류 수정 | [→ 코드 기여 가이드](#기능-기여--버그-픽스) |

---

## 공통: 로컬 개발 환경 설정

**요구사항:** Node.js 18+, pnpm

```bash
# 저장소 포크 후 클론
git clone https://github.com/{your-username}/Infratice.git
cd Infratice

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
# → http://localhost:3000
```

| 명령어 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 실행 (핫 리로드) |
| `pnpm build` | 프로덕션 정적 빌드 (`out/` 생성) |
| `pnpm start` | 빌드 결과물로 서버 실행 |

---

## 문제(콘텐츠) 기여

실무에서 경험한 인프라 장애 시나리오를 문제로 기여해 주세요.  
PR로 `.md` 파일을 추가하면 자동으로 사이트에 반영됩니다.

### 1. 기여 전 확인사항

- [ ] 동일하거나 유사한 문제가 이미 등록되어 있지 않은지 확인
- [ ] 실제 실무에서 발생할 수 있는 장애 시나리오인지 확인
- [ ] 개인 정보, 실제 도메인/IP/토큰이 포함되어 있지 않은지 확인

### 2. 카테고리 및 ID 규칙

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

### 3. 문제 작성 방법

#### Step 1. 템플릿 복사

```bash
cp content/problems/TEMPLATE.md content/problems/{카테고리}/{NNN}-{설명}.md
```

#### Step 2. Frontmatter 작성

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

#### Step 3. 본문 3개 섹션 작성

| 섹션 | 역할 | 분량 |
|---|---|---|
| `## 상황` | 문제 상황 설명 | 2~4문장 |
| `## 데이터` | 로그·설정 파일 등 원인 분석에 필요한 데이터 | 탭 2~4개 |
| `## 해설` | 원인 분석 / 해결 방법 / 실무 팁 | 자유 |

### 4. 데이터 작성 규칙

#### 코드 블록 언어 지정 (필수)

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

#### 데이터 품질 기준

- **최소화**: 문제 해결에 필요한 내용만 남기고 나머지는 `...`로 생략
- **익명화**: 실제 도메인 → `example.com`, 실제 IP → `192.168.x.x` 또는 `10.0.x.x`
- **재현 가능성**: 제공된 데이터만으로 원인을 추론할 수 있어야 함

### 5. 힌트 작성 기준

| 좋은 힌트 | 나쁜 힌트 |
|---|---|
| "error.log에서 포트 충돌 관련 메시지를 찾아보세요." | "포트가 이미 사용 중입니다." (정답 노출) |
| "upstream 서버가 실제로 실행 중인지 확인하세요." | "백엔드를 재시작하면 됩니다." (해결책 직접 제공) |
| "`kubectl describe`의 Events 섹션을 확인하세요." | "힌트: 환경변수가 없습니다." (너무 구체적) |

### 6. 난이도 기준

| 난이도 | 기준 | 예시 |
|---|---|---|
| `1` | 단일 로그 또는 설정 파일에서 에러 메시지를 찾으면 바로 원인 파악 | 디스크 풀, 포트 충돌 |
| `2` | 2~3개 데이터를 교차 분석하거나 단계적 추론이 필요 | 502 에러, CrashLoopBackOff |
| `3` | 복합 원인이거나 심화 개념 이해가 필요 | 네트워크 레이턴시 + 타임아웃 복합, OOM 분석 |

### 7. PR 제출 전 셀프 체크리스트

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

## 기능 기여 / 버그 픽스

UI 개선, 새 기능 추가, 버그 수정 등 코드 기여를 환영합니다.

### 1. 기여 전 확인사항

- [ ] [GitHub Issues](https://github.com/kiku99/Infratice/issues)에 동일한 이슈나 진행 중인 작업이 없는지 확인
- [ ] 큰 변경 사항(새 기능, 아키텍처 변경)은 PR 전에 이슈를 먼저 열어 방향을 논의

### 2. 이슈 등록 및 브랜치 전략

작업 시작 전 이슈를 먼저 등록하고, 이슈 번호를 브랜치명에 포함해 주세요.

```bash
# 이슈 번호를 포함한 브랜치 생성
git checkout -b feat/42-problem-filter     # 기능 추가
git checkout -b fix/57-dark-mode-bullet    # 버그 수정
git checkout -b refactor/61-content-parse  # 리팩터링
```

| 접두사 | 사용 상황 |
|---|---|
| `feat/` | 새로운 기능 추가 |
| `fix/` | 버그 수정 |
| `refactor/` | 동작 변경 없는 코드 개선 |
| `perf/` | 성능 개선 |
| `docs/` | 문서 수정 |

### 3. 코딩 컨벤션

이 프로젝트는 **Next.js (App Router) + TypeScript + Tailwind CSS v4** 스택을 사용합니다.

- **TypeScript**: 명시적 타입 선언 권장, `any` 사용 지양
- **컴포넌트**: `src/components/`에 위치, 파일명은 PascalCase
- **유틸리티 함수**: `src/lib/`에 위치
- **타입 정의**: `src/types/`에 위치
- **스타일링**: Tailwind CSS 유틸리티 클래스 사용, 인라인 스타일 지양
- **임포트 순서**: 외부 라이브러리 → 내부 모듈 → 타입

### 4. PR 제출 전 셀프 체크리스트

```
[ ] pnpm dev로 로컬에서 정상 동작을 확인했다
[ ] pnpm build가 에러 없이 완료된다
[ ] 변경 사항이 기존 기능을 깨뜨리지 않는다
[ ] TypeScript 타입 에러가 없다
[ ] 관련 이슈 번호를 PR 본문에 포함했다 (예: Closes #42)
[ ] 스크린샷 또는 동작 GIF를 PR 본문에 첨부했다 (UI 변경 시)
```

### 5. PR 작성 양식

PR 본문에 아래 항목을 포함해 주세요.

```markdown
## 변경 사항
<!-- 무엇을 왜 변경했는지 간략히 설명 -->

## 관련 이슈
Closes #이슈번호

## 스크린샷 (UI 변경 시)
<!-- 변경 전 / 변경 후 스크린샷 또는 GIF -->

## 체크리스트
- [ ] 로컬 동작 확인
- [ ] 빌드 성공 확인
```

---

## 커밋 메시지 규칙

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

## 문의

기여 관련 질문이나 제안은 [GitHub Issues](https://github.com/kiku99/Infratice/issues)를 통해 남겨주세요.
