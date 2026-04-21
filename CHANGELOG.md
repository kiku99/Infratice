# Changelog

> 이 파일은 릴리즈 시 자동으로 생성됩니다. 직접 수정하지 마세요.
> 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/ko/) 형식을 따릅니다.

## [1.8.0] — 2026-04-21

### 🐛 버그 수정
- Resolve bold markdown not rendering in monitoring-005 solution ([`4402237`](https://github.com/kiku99/Infratice/commit/440223763e00410e7b476e50d8970f723514c5d3))
- Handle bold markdown followed by CJK characters in parser ([`c1165c9`](https://github.com/kiku99/Infratice/commit/c1165c91c5af89840e260a7991b8ce660723eb67))


### 📦 기타
- Add monitoring category problems (001-005) ([`7aaac60`](https://github.com/kiku99/Infratice/commit/7aaac60fe3a477159ff6343ae54a5e69913d5111))
- Add kubernetes problems 024-033 ([`81e282e`](https://github.com/kiku99/Infratice/commit/81e282efec601269a592ca65bbd72ffd6f55c943))


## [1.7.1] — 2026-04-21

### ♻️  리팩터링
- Extract formatNoticeDate to shared utility ([`75eda53`](https://github.com/kiku99/Infratice/commit/75eda532a0844c5e29d3bd145f02fd82c40b79c6))
- Extract snapshot caching pattern to shared utility ([`29a19cb`](https://github.com/kiku99/Infratice/commit/29a19cb989c4484dc2b59718e9bc64164d47a45e))
- Improve type safety in notice types and remove unsafe casts ([`0342dcd`](https://github.com/kiku99/Infratice/commit/0342dcddb8f0824492cda3856766127188eb278a))
- Strengthen CategoryProgress types and add profile page description ([`97be950`](https://github.com/kiku99/Infratice/commit/97be950647c0c2d2cc862eab77f40434c2a7a1e1))
- Simplify MarkdownEditor ref synchronization ([`a2973a6`](https://github.com/kiku99/Infratice/commit/a2973a6f02fe2c461830c8448c3a5705bc2eea7f))
- Extract magic numbers to named constants ([`f6ed99a`](https://github.com/kiku99/Infratice/commit/f6ed99af61c7a2c5c1c0d74c072cc096aefb031e))
- Replace unsafe type cast with explicit check in getTheme() ([`3d9b0fb`](https://github.com/kiku99/Infratice/commit/3d9b0fb7b1d1eb2e733fc977814bd38310361eb2))
- Remove unnecessary Suspense wrappers ([`09973a2`](https://github.com/kiku99/Infratice/commit/09973a2bd8ea69e31013e1989f5d0a7843987f15))
- Deduplicate notice query logic into shared helper ([`5135249`](https://github.com/kiku99/Infratice/commit/5135249926c0c71c9463f5abaafb58e37936fef3))
- Remove unnecessary nullable from NoticeItem createdAt/updatedAt ([`76bc0bf`](https://github.com/kiku99/Infratice/commit/76bc0bf285f6f7dabb85a1a453864fe6da85e303))


### ⚡ 성능 개선
- Memoize AuthContext value to prevent unnecessary re-renders ([`9daf06d`](https://github.com/kiku99/Infratice/commit/9daf06d88291b384b80f94d4ece4dd4e49827cff))


### 🐛 버그 수정
- Resolve Shiki highlighter race condition and add error handling in content.ts ([`cad446a`](https://github.com/kiku99/Infratice/commit/cad446a46b4513d3b640290db68a57d584a818de))
- Add aria-expanded to HintAccordion for accessibility ([`3a7d4e4`](https://github.com/kiku99/Infratice/commit/3a7d4e44cd7cb7dddb656e87221864b8ec3e415a))
- Remove nested <main> tags for valid HTML ([`10dfcd5`](https://github.com/kiku99/Infratice/commit/10dfcd5fc100b58e8ffc40ffd5cf06d8d62759b2))
- Handle missing problem with notFound() in dynamic route ([`73316d1`](https://github.com/kiku99/Infratice/commit/73316d1b44ffee07f761052799685ec6b6d7e69a))
- Improve dark mode text contrast ([`c5c339d`](https://github.com/kiku99/Infratice/commit/c5c339d9fdb4f1a377df66f3d42792f8d5086fe1))
- Restore required Suspense boundary for useSearchParams ([`b4fbeba`](https://github.com/kiku99/Infratice/commit/b4fbebaf5e17e7e391d065e9d658ec63c239d6ac))


## [1.7.0] — 2026-03-24

### ✨ 새 기능
- Add notice page ([`900ae2f`](https://github.com/kiku99/Infratice/commit/900ae2f857733a8df93246d12bb1b555cd9de35d))


## [1.6.0] — 2026-03-17

### 📦 기타
- Improve problem statements for evidence-based troubleshooting ([`d97dc21`](https://github.com/kiku99/Infratice/commit/d97dc21565bd27845fb6c968cfc8fb13b0e35a7a))


## [1.5.0] — 2026-03-17

### 📦 기타
- Improve network-004 with evidence-based tcpdump analysis ([`9828810`](https://github.com/kiku99/Infratice/commit/98288105b7b400255cc7e7c15af2446b484c17e4))


## [1.4.1] — 2026-03-16

### 🐛 버그 수정
- Remove smooth scroll page transition ([`6f70d2b`](https://github.com/kiku99/Infratice/commit/6f70d2b0b9585067aeae366af970d89a7589b907))


## [1.4.0] — 2026-03-06

### ✨ 새 기능
- Add keyword search ([`fa6264a`](https://github.com/kiku99/Infratice/commit/fa6264aa870b1788f4a67eb9fe988cefc9f26dae))
- Add pagination in problem list ([`811d9ae`](https://github.com/kiku99/Infratice/commit/811d9ae7a65df578b9d5ceb7e7f6c46bc20fc627))
- Add problem list search, pagination, and detail tag display ([`591870c`](https://github.com/kiku99/Infratice/commit/591870ceac60ca14903592ecdb16754570f96fb0))


### 🐛 버그 수정
- Improve problem list search visibility and pagination ([`02cb504`](https://github.com/kiku99/Infratice/commit/02cb5046b26860632a784aa386accfeb7f922e23))


## [1.3.0] — 2026-03-04

### ✨ 새 기능
- Add FNB ([`717c796`](https://github.com/kiku99/Infratice/commit/717c79613cda0a6f18017d71f4be3713a42a4829))
- Add profile page with category-based progress tracker ([`9dc4b55`](https://github.com/kiku99/Infratice/commit/9dc4b552a04b365c7bf23118c3bbfb9a1d6bc0cd))


### 🐛 버그 수정
- Improve prose code block visibility in light mode ([`5f87989`](https://github.com/kiku99/Infratice/commit/5f879893f412f52ea8537496355625008c7363d1))
- Update font size ([`b2ea19b`](https://github.com/kiku99/Infratice/commit/b2ea19b0f07077c987039e0cabfe0bbd6175da62))


## [1.2.0] — 2026-03-04

### ✨ 새 기능
- Limit home page to 6 problems per category ([`323b4d6`](https://github.com/kiku99/Infratice/commit/323b4d68ae9293d94a65a213a855f3964c408f39))


### 🐛 버그 수정
- Persist filter state on back navigation and fix TerminalBlock title bar layout ([`93bd94e`](https://github.com/kiku99/Infratice/commit/93bd94ebd41cc565c068656410aab68a143c6d82))
- Remove difficulty sort from home page category problem list ([`69350bf`](https://github.com/kiku99/Infratice/commit/69350bfc0b9d6876f4ae777885fa65f207fd9830))
- Allow solution panel to scroll with page when model answer is long ([`7517fec`](https://github.com/kiku99/Infratice/commit/7517fecd0ba5ea501d8ced600611a82e302019bc))


### 📦 기타
- K8s 카테고리 문제(003 ~ 023) 추가 ([`8d273ae`](https://github.com/kiku99/Infratice/commit/8d273aef6acb088a8211ac5854ba12816a8b3539))
- Cicd, network, linux 카테고리 문제 추가 ([`32fc633`](https://github.com/kiku99/Infratice/commit/32fc633a054b32e4172557988c4d7a7f1420024f))


## [1.1.1] — 2026-03-04

### 🐛 버그 수정
- Make data block height expand dynamically instead of always filling ([`9f9c03a`](https://github.com/kiku99/Infratice/commit/9f9c03ae90b09f095d47366d2bef9afd271c6ed1))


## [1.1.0] — 2026-03-03

### ✨ 새 기능
- Allow users to unmark a problem as solved ([`7d4e587`](https://github.com/kiku99/Infratice/commit/7d4e58770f77fd106db87958999cbda5e965dc39))
- Make solution note editor fill available height ([`7a4467a`](https://github.com/kiku99/Infratice/commit/7a4467a2265d2abb2114885d3bb245e59d00020e))
- Make data blocks panel fill available height ([`48f14be`](https://github.com/kiku99/Infratice/commit/48f14beafbca5166363485b17870edbeda2567b1))
- Visually distinguish solved problem cards in the list ([`80c2fce`](https://github.com/kiku99/Infratice/commit/80c2fceb6e470451161afbe4bdca5c8cf6af50ef))


### 🐛 버그 수정
- Update note editor label and placeholder text ([`103439e`](https://github.com/kiku99/Infratice/commit/103439e49808ad335a7629b5821e701bb56d4cc8))


## [1.0.4] — 2026-03-03

### ✨ 새 기능
- Add sorting by difficulty ([`75a18d8`](https://github.com/kiku99/Infratice/commit/75a18d8aff2a8bf6df4f26267636e030c0bb53d5))


### 🐛 버그 수정
- Login issues when refreshing ([`503a283`](https://github.com/kiku99/Infratice/commit/503a2831f009e3b0206ddd27407db4d58eaedb6c))


## [1.0.0] — 2026-02-27

### ✨ 새 기능
- Project setup ([`6d01828`](https://github.com/kiku99/Infratice/commit/6d01828c0f998bdd12d1327cf9c296a1f9a3a46b))
- Add problems page ([`c914e26`](https://github.com/kiku99/Infratice/commit/c914e26c0ed8484f4f673437658cf86e0e81842d))
- Set google login & OAuth ([`2b8e328`](https://github.com/kiku99/Infratice/commit/2b8e3282e22689a89942479f285469ecc169bb56))
- Add github workflows ([`ed2727a`](https://github.com/kiku99/Infratice/commit/ed2727a309cd7ee875b067aea989057c10d870ba))
- Add 002-imagepullbackoff.md ([`3aecc00`](https://github.com/kiku99/Infratice/commit/3aecc009f35abd0286e11fd9b529777506bf9d26))



