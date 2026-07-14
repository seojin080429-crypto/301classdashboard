# 부광고 3-1 대시보드 — 프로젝트 컨텍스트

> 이 파일은 새 채팅방/다른 AI 에이전트(Claude, Gemini, DeepSeek 등)에서 작업을 이어갈 때
> 맥락을 파악하기 위한 문서입니다. **개발 중 의미 있는 변경사항이 생기면 이 파일의
> "최근 변경사항" 섹션을 갱신해주세요.**

## 프로젝트 개요
- 부광고등학교 3학년 1반을 위한 학급 대시보드 웹앱 (PWA)
- 순수 프론트엔드 단일 파일(`index.html`) 구조 — 별도 빌드 시스템 없음
- 홈 화면에 앱처럼 추가 가능 (manifest.json + 아이콘)

## 파일 구조
- `index.html` — 전체 앱 (약 3,300줄). 로그인, 대시보드, 관리자 탭 등 모든 화면/로직 포함
- `manifest.json` — PWA 매니페스트 (앱 이름, 아이콘, 테마 색상)
- `icon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png` — 홈 화면/파비콘용 아이콘
- `logo-source.png` — 로고 원본 이미지
- `GitHub에 올리기.bat` — `git add . && git commit -m "dashboard update" && git push` 를 실행하는 원클릭 배포 스크립트
- `.gitignore` — `bugwang-server/`, `server.js` 제외 (백엔드는 이 저장소에 포함되지 않음)

## 백엔드
- 이 저장소에는 **프론트엔드만** 있습니다. 백엔드는 별도로 관리되며 Railway에 배포되어 있습니다.
- `SERVER_URL = 'https://bugwang-server-production.up.railway.app'` (index.html 상단 근처에 정의)
- 백엔드가 제공하는 API 예시: `/api/users`, `/api/fetch-news`, `/api/fetch-meal`, `/api/study/join`,
  `/api/create-user`, `/api/delete-user`, `/api/reset-password`
- 백엔드 코드 수정이 필요하면 이 저장소가 아닌 별도 위치(로컬의 `bugwang-server/` 또는 `server.js`,
  gitignore되어 있음)에서 작업해야 함 — 실수로 이 저장소에 커밋되지 않도록 주의 (과거에 실수로
  올렸다가 제거한 이력 있음: `b940993`, `0e90005` 커밋 참고)
- `bugwang-server/`는 이 폴더 하위에 **별도의 git 저장소**로 실제로 존재함 (`git remote`:
  `seojin080429-crypto/bugwang-server`, 로컬 `.git` 있음). 백엔드 작업 시 반드시
  `cd bugwang-server`로 이동해서 그 저장소 기준으로 커밋/push할 것 — 301대시보드 저장소와
  혼동하지 말 것. push하면 Railway에 자동 배포되는 것으로 보임.
- 이 저장소와 마찬가지로 `bugwang-server` 로컬 저장소도 Windows에서 push 시
  `SEC_E_UNTRUSTED_ROOT` 오류가 나서 `http.sslbackend`를 로컬 설정으로 `openssl`로 바꿔둠.
- 인증 관련 role은 3단계: `student`(기본) / `admin` / `owner`, 그리고 `teacher`가 추가로 있음.
  `requireAdmin` 미들웨어(서버)가 `admin`/`owner`/`teacher` 모두 통과하도록 되어 있어야
  프론트(관리자 탭, 선생님 탭)가 정상 동작함 — 과거에 `teacher`가 누락되어 있던 버그를 수정한 적
  있음 (2026-07-14).

## 주요 기능 (커밋 이력 기반)
- 로그인 / 사용자 관리 (관리자 탭에서 계정 생성·삭제·비밀번호 초기화)
- 시간표 (학생별 A/B/C 그룹 적용)
- 급식 정보 표시
- 뉴스 가져오기
- 캠스터디(화상 자습방) 기능 + 학생별 이용 권한 관리
- 다크모드
- D-day 계산 (타임존 이슈 수정 이력 있음)
- PWA 홈 화면 아이콘 지원, 모바일 레이아웃 최적화

## 배포
- GitHub 저장소: `seojin080429-crypto/301classdashboard`
- 배포는 `GitHub에 올리기.bat` 실행 또는 수동 `git add/commit/push`로 진행
- ⚠️ 로컬 git remote에 GitHub Personal Access Token이 URL에 그대로 노출되어 있었음
  (`git remote -v`로 확인 가능). 토큰이 새어나가지 않도록 이 폴더를 통째로 공유하지 않는 것을 권장.
- Windows 환경에서 git push 시 `SEC_E_UNTRUSTED_ROOT` SSL 오류가 발생할 수 있음 →
  이 저장소 로컬 설정에서만 `http.sslbackend`를 `openssl`로 변경해 해결함
  (시스템 전역 설정은 건드리지 않음)

## 작업 환경
- OS: Windows 11
- 셸: PowerShell 기본, Git Bash도 사용 가능
- 별도의 패키지 매니저/빌드 도구 없음 (node_modules, package.json 없음)

## 최근 변경사항 (최신순)
- 2026-07-14: teacher(선생님) role 관련 3가지 버그 수정
  - (프론트/index.html) 관리자 계정 목록이 `30101`~`30128` 학번만 하드코딩으로 표시하던 것을
    서버가 반환하는 전체 계정 기준으로 변경 → 학번 형식이 아닌 계정(선생님 등)도 목록에 표시됨
  - (백엔드/bugwang-server) 계정 생성 시 "5자리 숫자 학번"만 허용하던 정규식을 영문/숫자/-/_
    2~30자로 완화 → 선생님 계정처럼 숫자 학번이 아닌 아이디 생성 가능
  - (백엔드/bugwang-server) `requireAdmin` 미들웨어가 `teacher` role을 403으로 막고 있던 버그
    수정 → teacher로 로그인해도 관리자/선생님 화면의 API 호출(계정 목록, 학생 공부기록 조회 등)이
    정상 동작하도록 함
- 2026-07-14: 이미지 아이콘 파일 및 최신 커밋을 GitHub에 push (SSL 백엔드 문제 해결 후)
- 로고 교체 및 모바일 레이아웃 최적화
- 홈 화면 추가 시 앱 아이콘이 표시되도록 manifest.json과 PNG 아이콘 추가
- 관리자 탭에서 캠스터디 이용권한 학생별로 관리
- 캠스터디(화상 자습방) + 다크모드 추가
- 급식 카드에서 조식/석식 컬럼 제거
- 국어/수학 선택과목을 국어/수학 공부 시간으로 통합
- 로그인 불가 오류 수정 (시간표 코드가 주석에 묻혀 문법 오류 발생)
- 학생별 시간표 그룹 적용 (A/B/C그룹)
- D-day 계산 타임존 이슈 수정

## AI 에이전트를 위한 안내
- 이 프로젝트에서 작업할 때는 `index.html` 하나에 모든 로직이 들어있다는 점을 유념할 것
  (프론트엔드 프레임워크 없이 바닐라 JS/HTML/CSS)
- 백엔드 코드는 이 저장소에 없으므로, 백엔드 관련 요청이 오면 별도 위치에서 작업 중인지
  사용자에게 확인할 것
- 의미 있는 변경(새 기능, 구조 변경, 버그 수정 등)을 했다면 이 파일의
  "최근 변경사항" 섹션 최상단에 한 줄로 추가할 것
