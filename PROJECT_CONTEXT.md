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
- 인증 관련 role 체계 (2026-07-14 개편): `user_roles.role`은 `student`/`admin`/`owner` 3단계만
  남았고, "선생님" 권한은 `is_teacher` boolean 플래그로 완전히 분리되어 role과 **동시에** 가질 수
  있음(예: role=owner + is_teacher=true). 과거에는 `role='teacher'`라는 4번째 값으로 처리해서
  owner와 teacher를 동시에 가질 수 없었는데, 이 한계를 없앤 것. 프론트에서 권한 체크는 반드시
  `isStaffRole()`(admin/owner/is_teacher 중 하나라도) / `isOwnerTier()`(owner 또는 is_teacher)
  헬퍼로 통일해서 쓸 것 — `currentRole==='teacher'` 같은 예전 패턴은 더 이상 없음. 백엔드
  `requireAdmin`도 `role`과 `is_teacher`를 함께 조회해서 판단하고, `req.callerIsOwnerTier`로
  owner 전용 액션(계정 삭제 등)을 구분함. 또한 `can_appoint_teacher` 플래그가 있어서 "선생님
  지정" 액션 자체를 아무 owner나 할 수 있는 게 아니라 이 플래그를 가진 owner만 가능 — 기본으로는
  30122(제작자) 계정에만 부여되어 있고, 다른 owner에게 위임(관리자 탭에서 부여/회수) 가능.
  관리자/선생님 탭은 `navigate()`가 admin/teacher 페이지로 이동할 때마다 `loadMyRole()`을 다시
  호출해서 새로고침하므로, 방금 권한이 바뀌어도 재로그인 없이 반영됨(예전에는 로그인 시점에만
  로드돼서 재로그인이 필요했음).

## Supabase 스키마 (주요 테이블, 2026-07-14 기준)
- `study_sessions` — 공부 타이머 기록. `started_at`/`ended_at`/`duration_seconds`. **주의**:
  `duration_seconds`는 타이머를 정지할 때만 기록되므로, 진행 중인 세션은 `ended_at IS NULL`이고
  `duration_seconds`가 아직 0인 상태 — 실시간 경과 시간이 필요하면 `now() - started_at`으로
  계산해야 함(친구 랭킹 로직 참고). 타이머를 켠 채 새로고침/탭 종료하면 `ended_at`이 영영 안
  채워지는 고아 row가 생길 수 있어서, 로그인 시점(`initApp`→`closeOrphanSessions()`)에 본인의
  안 끝난 세션을 자동 마감함(`duration_seconds=0`으로, 시간을 부풀리지 않음).
- `study_tasks` — 플래너의 하루 할 일(투두) 목록. `user_id`/`subject`/`task_name`/`is_done`/
  `date`. **student_id 컬럼이 없다** — 다른 학생 걸 조회하려면 `/api/users` 응답의 uuid(`id`
  필드)로 `user_id`를 알아내야 함. RLS는 원래 본인만 SELECT 가능했는데(`study_sessions`와
  다르게 "전체 공개" 정책이 없었음), 선생님 학생 상세 학습현황 기능 때문에 `study_sessions`와
  동일하게 "class can view all"(SELECT는 `true`) 정책을 추가함 — 쓰기는 여전히 본인만.
- `user_roles` — `student_id`(PK) / `role`(student/admin/owner) / `is_teacher` /
  `can_appoint_teacher` / `cam_allowed`. RLS는 SELECT/ALL 모두 `true`(사실상 프론트 role
  체크로만 게이팅되는, 이 프로젝트의 기존 컨벤션 — `study_sessions`처럼 `auth.uid()` 기반으로
  진짜 제한하는 테이블도 있으니 새 테이블 만들 때 어느 쪽이 맞는지 판단할 것).
- `user_devices` — 계정당 등록 기기 수 제한(기본 2대) 기능용. `student_id`+`device_id`(브라우저
  localStorage에 저장된 UUID) unique. **로그인 자체는 무제한**이고, 캠스터디 입장(`joinStudy()`)
  시점에만 `checkDeviceLimit()`이 체크함(2026-07-14에 로그인 게이트에서 이쪽으로 옮김).
- `user_profiles` — `student_id`(PK) / `user_id` / `display_name` / `avatar_url`. 친구 랭킹 등
  학급 전체에 실명·프로필사진을 보여주기 위한 테이블. RLS는 SELECT는 전체 공개(`true`), 쓰기는
  `study_sessions`처럼 `auth.uid() = user_id`로 본인만 가능하게 제한(진짜 보안 정책). 로그인
  시(`syncMyProfile()`)마다 본인 이름을 이 테이블에 upsert해서 최신 상태 유지.
- Storage 버킷: `board-photos`(자유/질문 게시판 첨부, 공개), `avatars`(프로필 사진, 공개 —
  업로드/수정/삭제는 `storage.foldername(name)[1] = auth.uid()`인 본인 uid 폴더에만 가능).
- ⚠️ `notices`/`meals`/`teacher_messages` 테이블은 RLS가 아예 꺼져 있음(anon key로 누구나
  읽기/쓰기 가능) — Supabase 어드바이저가 critical로 표시하는 항목. 정책 추가 전에는 끄면 안
  되므로(전체 접근 차단됨) 방치 중, 필요시 사용자와 상의 후 정책 설계.

## 주요 기능 (커밋 이력 기반)
- 로그인 / 사용자 관리 (관리자 탭에서 계정 생성·삭제·비밀번호 초기화·등록기기 초기화)
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
- 2026-07-14: 계획 이수 캘린더(주간 계획 이수 표)에서 집계 "계획 이수"(완료 개수/퍼센트) 컬럼
  제거. 사용자가 원한 건 날짜 셀에 그날의 투두리스트와 체크 여부가 그대로 나오는 것뿐이었고,
  아래 표에 별도로 집계된 "계획 이수 %" 자체를 없애달라는 요청 — 표에는 이제 주차별 공부시간만
  남음(`renderMonthCalendar()`).
- 2026-07-14: 플래너 상단 "내 등수"가 "3/2등"처럼 분자가 분모보다 커지는 버그 수정
  (`refreshStats()`). 오늘 기록이 없는 학생은 `byStudent`에 안 잡혀 분모(participants)에서
  빠지는데 등수는 꼴찌(participants+1)로 매겨지던 게 원인 — 그런 경우 본인을 포함한 인원수를
  분모로 쓰도록 수정. 겸사겸사 "상위 X%"가 1등일 때 100%로 나오는 부호 반전 버그도 같이 수정.
- 2026-07-14: 기기제한 위치 변경. 원래 로그인 성공 직후 `doLogin()`에서 `checkDeviceLimit()`을
  불러서 미등록 3번째 기기는 로그인 자체를 막았는데, 요구사항이 "로그인은 무제한, 캠스터디
  입장만 기기 수 제한"으로 바뀌어서 체크 위치를 `joinStudy()` 시작 부분으로 옮김. 등록/판정
  로직(`checkDeviceLimit`, `user_devices` 테이블)은 그대로 재사용.
- 2026-07-14: 선생님 학생 상세 학습현황 + 학생 본인 계획 이수 현황을 **월간 캘린더**로 추가.
  (처음엔 좁은 모달 안에 7일치만 보여주는 주간 리스트로 만들었다가, 사용자가 참고 이미지로
  보내준 "달력 형태"(요일 헤더 + 날짜별 그리드, 앞뒤 달 여백 포함)에 맞춰 다시 만들었음 —
  다음에 비슷한 요청이 오면 처음부터 월간 캘린더로 잡을 것.)
  - 선생님 탭 학생 카드를 클릭하면 전체화면 오버레이(`#student-detail-fullscreen`)로 해당
    학생의 월간 캘린더(날짜별 계획 목록 + 완료 체크, 과목은 이름 해시 기반 색상 점) + 주차별
    공부시간/계획이수율 표를 볼 수 있음. 이전/다음 달 이동 가능
    (`openStudentDetail`/`shiftStudentDetailMonth`).
  - 학생 본인도 학습 플래너 하단에 동일한 형태의 "계획 이수 현황" 카드가 있음(읽기전용,
    `renderMyMonthCalendar`/`shiftMyPlannerMonth`).
  - 공용 렌더 함수 `renderMonthCalendar(prefix,userId,year,month)` 하나를 두 곳에서 재사용
    (prefix로 DOM id만 분리 — 학생용은 `pw-`, 선생님용은 `sd-`). 날짜 그리드는
    `getMonthGridDates()`가 월요일 시작 기준으로 앞뒤 달 여백까지 채워서 7의 배수로 반환.
  - `study_tasks`가 `study_sessions`와 달리 "본인만 조회 가능" RLS였어서 선생님이 다른 학생
    계획을 못 보는 문제가 있었음 → "class can view all" SELECT 정책 추가로 해결(위 스키마
    섹션 참고).
  - `/api/users`(bugwang-server) 응답에 `id`(uuid)를 추가 — `study_tasks`/`study_sessions`가
    `student_id`가 아닌 `user_id`로만 연결되어 있어서 필요했음. 겸사겸사 `/api/create-user`가
    role 개편 때 `req.callerIsOwnerTier`로 안 바뀌고 예전 `role==='teacher'` 체크가 남아있던
    버그(owner가 아닌 is_teacher 조합 계정은 계정 생성이 막혀있었음)도 같이 수정.
- 2026-07-14: 대규모 업데이트 묶음 (프론트 `index.html` + 백엔드 `bugwang-server/server.js`,
  Supabase 스키마) — 자세한 스키마는 위 "Supabase 스키마" 섹션 참고.
  - **role 체계 개편**: `is_teacher`/`can_appoint_teacher` 플래그 분리로 owner+선생님 동시 보유
    가능하게 함. 관리자 탭 진입 시 `loadMyRole()` 재호출로 재로그인 없이 권한 반영.
    기존에 `role='owner'`인데 `is_teacher`가 없어서 선생님 탭이 안 보이던 "teacher" 계정
    (이용휘)을 바로잡음. 계정 삭제 후 재생성 시 옛 권한이 남아있던 "test" 계정도 초기화함.
  - **계정 삭제 시 연계 데이터 정리**: `/api/delete-user`가 auth 계정만 지우고 `user_roles`/
    `user_devices`/`user_profiles`의 학번연결 기록은 안 지워서, 같은 학번으로 재생성하면 예전
    권한이 부활하던 버그 수정 — 이제 세 테이블 모두 함께 삭제됨(단, 게시글/공부기록은 보존).
  - **프로필 사진 + 친구 랭킹 실명 표시**: `user_profiles` 테이블 신설. 마이페이지에서 아바타
    클릭 → 사진 업로드(Storage `avatars` 버킷) 가능해짐. 이전엔 친구 랭킹에 본인 이름만 뜨고
    다른 학생은 전부 "학번+번"으로만 표시되던 문제도 이 테이블로 실명 표시하도록 수정.
  - **선생님 계정 마이페이지**: `is_teacher`면 학년/반/선택과목 대신 "담임반: 3-1"만 표시,
    최초 설정 화면에서도 선택과목 질문을 생략함.
  - **다크모드 대비 수정**: 토스트 알림, 아바타 이니셜(사이드바/마이페이지/게시판/랭킹),
    캠스터디 "화면 가리기" 오버레이가 다크모드에서 배경·글자색이 둘 다 흰색 계열로 겹쳐서 안
    보이던 문제. 원인은 라이트/다크 테마에서 값이 뒤집히는 `--ink` CSS 변수를 배경색에 쓰면서
    글자색은 고정 흰색으로 둔 것 — 배경을 고정 색상으로 바꿔 해결.
  - **입시뉴스 연도 수정**: 검색어가 "2026 수능 입시"로 고정되어 있었는데, 현재 3학년이 치르는
    수능은 2026년 11월 시행 "2027학년도" 입시라 한 학년도 어긋나 있었음. 검색어를 2027학년도로
    바꾸고, 다른 학년도만 언급된 기사를 걸러내는 필터 추가.
  - **뉴스 요약 글씨 깨짐 수정**: `bugwang-server`의 HTTP 응답 처리(`httpGet`/`httpPost`/Groq
    호출)가 스트리밍 청크를 문자열로 바로 이어붙이고 있었음(`data += chunk`) — 멀티바이트 UTF-8
    문자(한글)가 청크 경계에서 잘리면 깨지는 전형적인 Node.js 버그. 특히 길이가 긴 Groq 뉴스
    요약에서 두드러졌음. Buffer로 모았다가 끝에서 한 번에 `toString('utf8')`하도록 수정.
- 2026-07-14: 친구 랭킹(timer-fullscreen) 시간이 실시간보다 2배 이상 빠르게 올라가던 문제 수정.
  원인: 타이머를 켠 채로 새로고침/탭 종료하면 `stopCurrentTimer()`가 못 불려서
  `study_sessions`에 `ended_at`이 비어있는 세션이 고아로 남는데, 랭킹 로직(바로 위 항목)이
  "안 끝난 세션 = 진행중"으로 보고 `now - started_at`으로 합산하다 보니 같은 학생에게 고아
  세션이 여러 개(실측: 한 계정 4개, 다른 계정 2개) 쌓이면 그만큼 곱절로 카운트됐음. 로그인
  시점(`initApp`)에 `closeOrphanSessions()`를 추가해 안 끝난 세션을 자동으로 마감하도록
  수정(실제 공부 시간을 알 수 없으므로 `duration_seconds=0`으로 처리해 시간을 부풀리지 않음).
  기존에 쌓여있던 고아 세션 6건은 Supabase에서 직접 동일 방식으로 정리 완료.
- 2026-07-14: 계정당 등록 기기 수 제한(2대) 기능 추가. 예전에 "캠스터디 원본"(이 저장소에는
  없는, 옮겨오지 않은 별도의 옛 프로젝트)에 있던 기능을 새로 설계해서 재구현한 것 — 이 저장소나
  bugwang-server git 히스토리에는 원본 코드가 없었음. 구현: Supabase에 `user_devices` 테이블
  신설(student_id, device_id, device_label, first_seen, last_seen / RLS는 `user_roles`와
  동일하게 SELECT·ALL 모두 `true`로 두고 프론트에서 역할 체크로 게이팅하는 기존 컨벤션을 따름).
  프론트는 `localStorage`에 기기별 고유 `device_id`를 생성해 보관하고, `doLogin()`에서
  로그인 성공 직후 `checkDeviceLimit()`으로 등록 여부/대수를 확인 — 미등록 기기이고 이미
  `MAX_DEVICES(=2)`대가 등록돼 있으면 로그인 직후 `signOut()`으로 세션을 끊고 에러 메시지 표시.
  관리자 탭 계정 목록에 "등록기기" 열(n/2 + 초기화 버튼) 추가, `resetDevices(sid)`로 학생의
  등록 기기를 전체 삭제하면 다음 로그인 시 새 기기로 재등록 가능. 기존 세션 복원(`restoreSession`)
  경로는 게이트를 타지 않음 — 이미 로그인돼있던 기기가 소급 차단되진 않고, 다음에 새로 로그인할
  때부터 적용됨.
- 2026-07-14: teacher role에 owner 수준 관리 권한 부여 (계정 생성/삭제 API가 owner로만
  제한되어 있던 것을 teacher도 허용하도록 완화). role 컬럼이 단일값이라 "역할 두 개 동시 보유"는
  불가능해서, teacher role은 유지한 채(학생 현황 탭 접근 유지) 백엔드 권한만 owner와 동등하게 맞춤.
- 2026-07-14: role은 로그인 시점에만 로드됨(`loadMyRole()`이 `initApp()`에서 한 번만 호출) —
  관리자 탭에서 역할을 방금 바꿨다면 해당 계정은 로그아웃 후 재로그인해야 반영됨. teacher 탭이
  안 보인다는 문의가 있으면 재로그인부터 확인할 것.
- 2026-07-14: "다른 학생 데이터가 안 보이는" 문제는 RLS 정책 완화로 해결된 것으로 보임(다른
  학생이 랭킹에 표시되기 시작). 다만 이어서 "친구 랭킹(timer-fullscreen 뷰)의 시간이 실시간으로
  올라가지 않고 멈춰있다"는 후속 제보가 있어 아래 항목으로 별도 수정함.
- 2026-07-14: 친구 랭킹(`renderTfRankGrid`, timer-fullscreen 뷰) 시간이 실시간 갱신 안 되던
  버그 수정. 원인 두 가지: (1) `renderTfRankGrid()`가 전체화면 타이머를 열 때 한 번만 호출되고
  이후 갱신 루프(매초 도는 `tfInterval`)에 포함돼 있지 않았음. (2) `study_sessions.duration_seconds`는
  타이머를 정지할 때만 기록되므로, 진행 중인 세션(본인 포함)은 DB상 값이 계속 0으로 남아있어
  재조회해도 시간이 안 올라가는 구조였음. 수정: `started_at`/`ended_at` 컬럼을 함께 select해서
  `ended_at`이 없는(진행 중) 세션은 `now - started_at`으로 실시간 경과 시간을 계산하도록 변경.
  DB 재조회는 5초마다, 화면 갱신(로컬 재계산)은 매초 수행 (`fetchTfRankData` / `renderTfRankGrid`
  분리, `index.html` openTimerView 부근). 학습 리포트의 반 랭킹(`renderReport`)은 실시간 틱이
  필요 없는 통계 페이지라 이번 수정 대상에서 제외함 — 필요시 별도 확인.
- 2026-07-14: UI 개선 3건
  - 학습 리포트 "과목별 비율"을 개별 진행바 목록 → 띠그래프(하나의 누적 가로 막대) + 범례 형태로 변경
  - 공지사항을 대시보드 미리보기 전용에서 좌측 메뉴의 독립 페이지(`page-notice`)로 분리
    (대시보드에는 최근 5개만 미리보기, 전체 목록은 새 페이지에서 확인)
  - 즐겨찾기 탭(`page-favorites`) 신설 — `FAVORITE_LINKS` 배열(대학어디가/리로스쿨/Gemini/
    메가스터디/대성마이맥/EBSi)을 수정하면 카드가 자동 갱신됨
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
