# Infratice

> 실무 인프라 장애를 마주하고, AI와 함께 해결하는 DevOps 트러블슈팅 실습 플랫폼

**[infratice.co.kr](https://infratice.co.kr)**

---

## 이런 분을 위한 서비스입니다

인프라/DevOps 직무를 준비하거나 실력을 키우고 싶은데, 마땅히 연습할 곳이 없으신가요?

- 코딩 테스트는 연습할 곳이 많지만, **실무 인프라 장애 상황**을 경험할 수 있는 곳은 거의 없습니다.
- SadServers 같은 플랫폼은 VM 로딩이 길고, 직접 환경을 구축하자니 비용과 시간이 너무 많이 듭니다.

Infratice는 **무거운 서버 없이** 실제 장애 상황의 로그와 설정 파일을 그대로 제공합니다. 분석하고, 해결책을 적고, 본인의 AI에게 검토받으며 실무 감각을 키워보세요.

---

## 핵심 기능

### 실무 장애 시나리오
Linux, Kubernetes, Network, CI/CD 등 카테고리별로 실제 업무에서 마주치는 장애 상황을 제공합니다.

### 터미널 스타일 데이터 뷰어
로그, 설정 파일을 코드 블록으로 제공합니다.

### 마크다운 해결 노트
내가 추론한 원인과 해결 시나리오를 마크다운으로 작성합니다.

### 원클릭 AI 검토
작성한 노트와 시나리오, 로그 데이터가 하나의 프롬프트로 자동 조립됩니다. 버튼 클릭 한 번으로 클립보드에 복사되어 ChatGPT나 Claude에 바로 붙여넣을 수 있습니다.

### 출제자 모범 답안
충분히 고민한 후, 출제자가 의도한 원인 분석 로직과 핵심 해결 명령어, 실무 팁을 확인할 수 있습니다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router, Static Export) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 코드 하이라이팅 | Shiki |
| 콘텐츠 관리 | GitHub Repository (`.md` 파일) |
| 호스팅 | Cloudflare Pages |

---

## 로컬 개발 환경 설정

**요구사항:** Node.js 18+, pnpm

```bash
# 저장소 클론
git clone https://github.com/your-org/infratice.git
cd infratice

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

## 프로젝트 구조

```
Infratice/
├── content/
│   └── problems/           # 문제 콘텐츠 (.md 파일)
│       ├── TEMPLATE.md     # 문제 작성 템플릿
│       ├── linux/
│       ├── kubernetes/
│       ├── network/
│       ├── cicd/
│       └── monitoring/
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/         # UI 컴포넌트
│   ├── lib/                # 콘텐츠 파싱, 유틸리티
│   └── types/              # TypeScript 타입 정의
```

---

## 문제 기여하기

실무에서 경험한 인프라 장애 시나리오를 문제로 기여해 주세요.  
PR로 문제 파일을 추가하면 자동으로 사이트에 반영됩니다.

```bash
# 템플릿 복사
cp content/problems/TEMPLATE.md content/problems/{카테고리}/{NNN}-{설명}.md

# 내용 작성 후 PR 제출
```

자세한 작성 규칙과 체크리스트는 **[CONTRIBUTING.md](./CONTRIBUTING.md)** 를 참고해 주세요.

---

## License

This project is licensed under the MIT License.  
See the [LICENSE](LICENSE) file for full details.
