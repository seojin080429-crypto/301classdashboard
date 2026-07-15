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
  `/api/create-user`, `/api/delete-user`, `/api/reset-password`, `/api/change-student-id`
  (2026-07-15 추가 — 학생 본인이 마이페이지에서 아이디를 바꿀 때 사용, `requireAdmin`이 아니라
  `requireAuth`로 게이팅해서 관리자 권한 없이 본인 access_token만으로 호출 가능)
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
- `simo_members` — 실모반(신청제) 가입 상태. `student_id`(PK) / `status`(pending/approved/
  rejected) / `applied_at` / `decided_by` / `decided_at`. RLS는 `user_roles`와 동일하게
  permissive(SELECT/ALL `true`), 프론트에서만 게이팅.
- `notices.audience`('all'/'simo') — 실모반 전용 공지는 별도 테이블(`simo_notices`, 폐기됨
  2026-07-15) 대신 기존 `notices`에 이 컬럼으로 통합. `loadNotices()`가
  `audience==='simo'`인 공지를 `canSeeSimoContent()`가 아니면 걸러내고, 보이면 "실모반"
  배지를 붙임. 공지 작성 페이지(`page-notice-write`)의 "대상" 선택(운영자/선생님에게만
  보임)으로 지정. `news.image_url`(text, nullable, 2026-07-15 추가) — 백엔드 수집기가 아직
  안 채워줘서 항상 null, 프론트는 없으면 카테고리별 플레이스홀더 타일로 대체.
- `notice_polls`(2026-07-15 신설) — 공지에 달리는 투표. `notice_id`(FK→notices, on delete
  cascade) / `question` / `options`(jsonb 문자열 배열) / `is_anonymous` / `created_by`(auth
  uid). `notice_poll_votes` — `poll_id`(FK→notice_polls, cascade) / `user_id`(auth uid) /
  `student_id` / `voter_name`(투표 시점 이름 스냅샷) / `option_index`,
  `unique(poll_id,student_id)`+`unique(poll_id,user_id)`로 중복투표 방지(재투표는 upsert로
  덮어씀). **이 프로젝트의 기존 RLS 컨벤션(대부분 SELECT/ALL `true` permissive)과 다르게,
  두 테이블 모두 SELECT는 `true`(투표 결과·참여 여부를 학급 전체가 봐야 함)지만 INSERT/
  UPDATE/DELETE는 `auth.uid()`가 본인 행일 때만 허용** — Claude Code의 자동실행 안전장치가
  실명/투표선택지처럼 민감한 데이터에 permissive(`true`/`true`) 쓰기 정책을 만드는 걸
  막아서(unrestricted write 경고), `study_sessions`/`user_profiles`처럼 이 저장소에 이미
  있는 "진짜 제한하는" 패턴으로 대신 설계함. 새로 비슷한 민감 테이블을 만들 때 참고할 것.
- `simo_materials` — 실모반 전용 자료(`file_url`로 Storage 파일 링크). `notices`처럼
  **RLS 자체가 없음(비활성)** — 승인 안 된 학생이 개발자도구로 API를 직접 두드리면 볼 수
  있음. 사용자에게 이 트레이드오프를 확인받고 의도적으로 이렇게 함(2026-07-15, "UI에서만
  가리고 개발자도구까지 막지는 말자"는 요청).
- Storage 버킷: `board-photos`(자유/질문 게시판 첨부, 공개), `avatars`(프로필 사진, 공개 —
  업로드/수정/삭제는 `storage.foldername(name)[1] = auth.uid()`인 본인 uid 폴더에만 가능),
  `simo-materials`(실모반 자료 파일, 공개 — 업로드/삭제는 로그인 사용자면 누구나 가능한
  단순 정책이고 실제 업로드 버튼은 프론트에서 운영자/선생님에게만 노출).
- ⚠️ `notices`/`meals`/`teacher_messages`/`simo_materials` 테이블은 RLS가
  아예 꺼져 있음(anon key로 누구나 읽기/쓰기 가능) — Supabase 어드바이저가 critical로
  표시하는 항목. 정책 추가 전에는 끄면 안 되므로(전체 접근 차단됨) 방치 중, 필요시 사용자와
  상의 후 정책 설계.

## 주요 기능 (커밋 이력 기반)
- 로그인 / 사용자 관리 (관리자 탭에서 계정 생성·삭제·비밀번호 초기화·등록기기 초기화)
- 실모반(신청제 전용 그룹) — 신청/승인, 전용 공지사항, 전용 자료(파일 업로드)
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
- 2026-07-15: 새로고침 관련 3건 (학습 타이머 유지, 마지막 화면 유지, 새로고침 버튼 추가).
  - **새로고침해도 기록 중이던 학습 타이머가 안 끊기도록 수정**. 예전엔 새로고침하면
    클라이언트 상태(`activeTimer`, `setInterval`)가 통째로 날아가고, 로그인 시점마다 도는
    `closeOrphanSessions()`가 "끝나지 않은 세션은 전 세션에서 비정상 종료된 고아"로 보고
    `duration_seconds=0`으로 마감해버려서 — 단순히 화면이 리셋되는 게 아니라 **그때까지
    기록된 공부 시간 자체가 사라졌음**. `startTaskTimer()`가 시작할 때마다 재개에 필요한
    최소 정보(과목/할일 인덱스, DB 세션 id, 시작 시각, 시작 전 누적 시간, 소유자 user_id)를
    `localStorage`에 저장해두고, 앱을 다시 켤 때(`resumeActiveTimerIfAny()`, `initApp()`
    안에서 `subjects`에 태스크가 다 채워진 뒤 실행) 그 DB 세션이 아직 열려있고 지금
    로그인한 사람 것이 맞으면 이어서 타이머를 재개하도록 함. `closeOrphanSessions(exceptId)`는
    이렇게 이어받은 세션만 쏙 빼고 나머지 진짜 고아만 정리하도록 인자를 받게 수정.
    **소유자 확인이 핵심** — 학교 공용 컴퓨터/태블릿처럼 여러 학생이 같은 브라우저를 쓸 수
    있어서, 저장된 타이머의 `userId`가 지금 로그인한 사람과 다르면(기기를 안 씻고 다른
    학번으로 로그인) 무조건 버리고 이어받지 않게 이중으로 확인함(localStorage에 저장된
    userId 비교 + DB에서 다시 조회한 세션의 user_id 비교). 로그아웃 시에도 이 정보를
    명시적으로 지움. 참고: 사이드바 "타이머" 탭(쪽잠/모의고사/스톱워치, 바로 아래 항목)은
    DB에 아무것도 안 남기는 순수 클라이언트 타이머라 이번 수정 대상이 아니고, 여전히
    새로고침하면 초기화됨(원한다면 요청 시 같은 방식으로 확장 가능).
  - **새로고침해도 대시보드로 안 튕기고 보던 화면 유지**. `navigate()`가 페이지 이동마다
    마지막으로 본 페이지를 `localStorage`에 저장해두고, 로그인 완료 시점(`initApp()` 끝
    부분, 역할 로드가 끝나 사이드바 메뉴 노출 여부가 확정된 뒤) `restoreLastPage()`가 그
    페이지로 돌아감 — 단, 그 사이 권한이 바뀌어 사이드바에서 사라진 페이지(예: 관리자 권한
    회수)라면 조용히 대시보드에 남음(`offsetParent!==null`로 확인). 로그아웃 시 이 값도
    같이 지워서 다음 로그인한 사람이 이어받지 않게 함.
  - **새로고침 버튼 추가**. PWA로 홈 화면에 추가해 실행하면(standalone) 브라우저 새로고침
    버튼/당겨서 새로고침이 아예 안 보이는 경우가 많아서, 사이드바 헤더(데스크톱)와 모바일
    상단바 오른쪽(기존에 비어있던 균형용 spacer 자리)에 새로고침 버튼을 추가함
    (`refreshApp()`→`location.reload()`). 위 두 가지를 먼저 고쳐서 새로고침 자체가
    안전해졌기 때문에 별다른 확인 절차 없이 바로 새로고침하도록 함.
- 2026-07-15: 사이드바 "학습" 그룹에 타이머 탭 신설(`page-timer`). DB에 아무것도 안 남기는
  순수 클라이언트 타이머라 학습 타이머(`activeTimer`)와 달리 새로고침하면 초기화됨(앱을 켜둔
  채로만 동작). 세 가지 종류를 탭으로 전환:
  - **쪽잠 알림**: 10/15/20/30분 프리셋 + 직접 입력(분). "걸린 시간"/"남은 시간"을 동시에
    표기. 알림음이 다른 사람에게 방해되지 않도록 이어폰 착용을 안내하는 문구를 넣었는데,
    브라우저에서 "이어폰이 꽂혀있는지"를 안정적으로 감지하는 API가 없어서(기기/브라우저마다
    달라 신뢰 불가) 실제로 이어폰으로만 소리가 나가게 강제하지는 못하고 UI 안내 문구로만
    처리함 — 필요하면 사용자에게 이 한계를 먼저 알릴 것.
  - **모의고사용 알림**: 국어 80분/수학 100분 프리셋(둘 다 걸린 시간/남은 시간 동시 표기).
    실제 시험처럼 정해진 시간만 쓰므로 직접 입력은 없음. 필요하면 `startExamTimer(subject,
    minutes)` 호출을 프리셋 버튼에 추가하는 식으로 다른 과목(영어 70분 등)도 쉽게 늘릴 수 있음.
  - **스톱워치**: 목표 없이 그냥 흐른 시간만 누적, 시작/정지/초기화.
  - 카운트다운 종료 시 전체화면 알람(`#timer-alarm-overlay`, z-index:600으로 다른 오버레이보다
    위)이 뜨고, Web Audio API로 직접 생성한 비프음(별도 음원 파일 불필요)과
    `navigator.vibrate()`(지원 기기만, iOS Safari는 미지원)가 "확인"을 누르기 전까지
    1.5초 간격으로 반복됨 — 한 번만 울리면 자다가 못 들을 수 있어서 의도적으로 반복시킴.
    쪽잠/모의고사/스톱워치 모두 `navigate()`로 다른 탭에 가 있어도(SPA라 페이지 div가
    DOM에서 안 사라지고 display:none만 됨) 백그라운드에서 계속 돌아가다가 시간이 되면
    다른 화면을 보고 있어도 알람이 뜬다.
- 2026-07-15: 캠스터디 기기 2대 제한 동작 확인(요청은 있었지만 코드 변경 없음) —
  `checkDeviceLimit()`는 `joinStudy()`(캠스터디 입장) 시점에만 호출되고 로그인 경로
  (`doLogin`/`restoreSession`)에는 기기 관련 코드가 전혀 없어서, "로그인은 무제한, 캠스터디
  입장만 기기 2대 제한"이라는 요청 사항이 이미 코드에 그대로 반영돼 있음을 재확인함. 혹시
  이 항목이 다시 이슈가 되면(예: 로그인만 했는데 기기 제한에 걸렸다는 제보) 여기부터 다시
  볼 것 — 이 시점엔 원인을 못 찾음.
- 2026-07-15: 버그 제보 게시판 추가 + 이번 세션 전체 diff에 대한 멀티에이전트 코드 리뷰 후속 수정.
  - **버그 제보 게시판 추가**. 사이드바 게시판 그룹에 "버그 제보" 탭 신설(`page-bug-report`).
    자유/질문게시판과 동일한 글쓰기+사진/동영상 첨부+댓글 UI를 재사용 — `posts.category`에
    새 값 `'bug'`을 추가하는 방식(별도 테이블 없음, CHECK 제약 없어서 안전 확인 후 적용).
    기존에 `type==='free'?A:B` 식으로 두 게시판만 가정하고 여기저기 흩어져 있던 삼항연산을
    `BOARD_SUBMIT_LABEL`/`boardLoader()`/`loadBoardPosts()` 조회 테이블·공용 함수로 정리하면서
    세 번째 게시판을 끼워 넣음(자유/질문 게시판 동작은 그대로, 새 게시판 추가할 때 앞으로는
    한두 줄만 더하면 되도록).
  - **이번 세션(모바일 최적화 이후) 전체 변경사항에 대해 8앵글 멀티에이전트 코드 리뷰 실행**.
    실제로 심각한 버그 여러 개를 잡아냄:
    - `bugwang-server`의 `/api/change-student-id`가 `oldStudentId`를 로그인 이메일에서
      유추했는데, Supabase Auth가 이메일을 저장 시 소문자로 정규화하기 때문에 대문자가 섞인
      아이디(학번과 달리 영문 허용된 선생님 계정 등)는 실제 `student_id` 컬럼 값과 안 맞아서
      모든 테이블 UPDATE가 0건 매칭되면서도 에러 없이 "성공"으로 응답할 뻔했음 — 대소문자가
      보존되는 `user_metadata.student_id`를 우선 쓰도록 수정(프론트 `restoreSession()`의
      우선순위와 동일하게 맞춤).
    - 이 세션에서 고쳤던 "정지 눌러도 시간이 계속 올라가는" 타이머 버그의 수정(`timerStarting`
      락)이 불완전했음 — 같은 버튼 더블탭은 막았지만, `tfSwitchTask`처럼 "다른 태스크로 바로
      전환"하는 정상 흐름에서 `stopCurrentTimer()`가 자기 await 이후에야 `activeTimer=null`
      처리를 하는 바람에, 방금 시작된 새 타이머를 뒤늦게 지워버리는 별도의 경쟁 상태가 남아있어
      같은 증상이 다른 경로로 재현될 수 있었음. 시작/정지 각 시도에 순번을 매기는
      `timerGen`으로 통일해서 "자신보다 더 최신 시도가 있으면 activeTimer를 건드리지 않고
      물러난다"는 하나의 규칙으로 양쪽 다 해결(락 하나로 증상만 덮는 대신 근본 원인인 공유
      상태 경쟁 자체를 없앰).
    - 아이디 변경 성공 후 `currentStudentId`는 갱신했지만 `currentUser.user_metadata`는
      그대로 둬서, 이후 `saveResolution()`처럼 "기존 metadata를 그대로 복사해서 저장"하는
      다른 동작이 낡은 아이디로 되돌려버릴 수 있었음 — 갱신하도록 수정. 또한 일부 테이블 갱신만
      실패하는 partial(207) 응답을 일반 토스트로만 알려서 놓치기 쉬웠고, 특히 `user_roles`
      갱신이 실패하면 그 사람의 관리자/선생님 권한이 새 아이디로 안 넘어가 조용히 사라지는
      심각한 경우인데도 구분 없이 처리됐음 — 백엔드가 실패한 테이블명을 응답에 포함하도록
      하고, `user_roles` 실패 시 별도 경고 문구를 추가했으며, 프론트는 partial일 때 사라지는
      토스트 대신 확인이 필요한 alert로 알리도록 수정.
    - 게시판 동영상 판별을 업로드 시점의 실제 URL 확장자 화이트리스트(mp4/webm/mov 등)로만
      추측해서 avi/wmv/mkv 등은 이미지 태그로 잘못 렌더링될 수 있었음 — 업로드 시점에
      `file.type`으로 실제 종류를 판별해 파일명에 `vid_`/`img_` 접두사를 새겨두고, 렌더링
      때는 그 접두사를 우선 보고(접두사가 없는 이전 업로드 파일은 기존 확장자 추측으로 폴백)
      판단하도록 변경 — 확장자에 의존하지 않는 방식으로 근본 수정.
    - 사진/동영상 미리보기를 `URL.createObjectURL`로 바꾸면서 `revokeObjectURL`을 한 번도
      안 불러서, 하루 종일 켜두는 모바일 PWA에서 첨부를 여러 번 갈아끼우면 blob이 계속
      누적되던 메모리 누수 수정.
    - `getSafeAreaBottom()`이 `env(safe-area-inset-bottom)` 값을 처음 한 번만 재고 영구
      캐시해서, 회전/창 크기 변경으로 그 값이 바뀌면 캐시가 낡아 튜토리얼 카드 위치 계산이
      다시 어긋날 수 있었음(이번 세션에 고친 바로 그 버그가 좁은 트리거로 재발) — `resize`
      이벤트에 캐시 무효화를 걸어 수정.
    - **의도적으로 고치지 않고 사용자 판단에 맡긴 것들**: (1) `requireAdmin` 미들웨어가
      토큰 검증 없이 `req.body.student_id`를 그대로 신뢰하는 기존 패턴 — 새로 추가한
      `requireAuth`(진짜 토큰 검증)가 그 옆에 나란히 생겼을 뿐, 기존 관리자 API들의 인증
      모델 자체를 바꾸는 건 이번 요청 범위를 넘어서는 더 큰 보안 변경이라 그대로 둠. (2)
      `loadStudentReportData`/`renderStudentReport`가 학생 본인 리포트 로직과 약 55줄
      중복됨 — PROJECT_CONTEXT에도 이미 "로직은 대응되지만 학생 본인 전제가 아님"이라고
      의도적 중복임을 적어뒀던 부분이라 그대로 둠. (3) 아이디 변경 시 두 사람이 동시에 같은
      새 아이디를 신청하는 극히 드문 경쟁 상태(30명 학급 규모에서 현실성 낮음, 핵심 3개
      PK 테이블은 실제 DB 유니크 제약이 있어 충돌 시 조용히 중복되는 대신 partial 실패로
      드러남).
- 2026-07-15: "오늘 시간표"의 "현재" 교시 표시가 시간이 지나도 안 바뀌던 버그 수정.
  `checkDateRollover()`는 "날짜"가 바뀔 때만 `renderTimetable()`을 다시 불러서, 하루 안에서
  교시가 넘어가는 건 전혀 감지하지 못했음 — 아침에 앱을 켜서 1교시 하이라이트가 뜬 채로
  계속 켜두면(모바일 PWA는 앱을 껐다 켰다 안 하고 오래 백그라운드에 켜두는 경우가 많아서
  특히 두드러짐) 종일 그 교시만 "현재"로 표시된 채 멈춰있었음. `periodNowIndex()`가 바뀔
  때마다(30초 주기 + 탭 복귀 시) `renderTimetable()`을 다시 호출하는 `checkPeriodChange()`를
  추가해서 해결. 겸사겸사 "현재 교시" 판정 로직 자체도 리팩터링함 — 예전엔 별도의 전역
  `PT` 배열(교시 배열 인덱스별 시각)을 두고 그날 시간표 배열의 위치(index)로만 대조했는데,
  주말 자율학습(10:00–16:00처럼 평일 교시와 전혀 다른 시간대인데 배열 위치는 항상 0)은
  `PT[0]`(1교시 08:50–09:40)과 비교되면서 실제 자율학습 시간과 안 맞게 "현재"가 표시되던
  잠재 버그가 있었음. `PT` 배열을 없애고, 각 시간표 항목이 이미 갖고 있는 자기 시간
  문자열(`t`)을 직접 파싱해 대조하는 `periodNowIndex(periods)`로 교체 — 평일/주말 상관없이
  항상 정확하고, 앞으로 시간표를 또 바꿀 때 `PT` 배열을 별도로 맞춰줄 필요도 없어짐.
- 2026-07-15: 시간표 변경 + 버그 4건 + 신규 기능 3건 묶음 (프론트 `index.html` +
  백엔드 `bugwang-server/server.js`).
  - **시간표 시간 전면 수정**. 사용자가 알려준 실제 교시(1교시 8:50~9:40 ~ 6교시
    14:40~15:30, 점심 12:40~13:40)에 맞춰 `PT` 배열과 `TT_A/TT_B/TT_C`의 모든 교시별
    시각 문자열을 일괄 치환(같은 옛 시각 문자열이 항상 같은 교시를 가리켜서 전역
    치환으로 안전하게 처리 가능했음). 교시 개수(6교시+점심)는 기존과 동일해서 구조는
    안 건드림.
  - **모바일에서 한글이 안 써지는 버그 수정**. `onkeydown="if(event.key==='Enter')..."`
    패턴으로 Enter 시 제출하는 입력(댓글/할일 추가/캠스터디 채팅/로그인/이름 설정)이
    `event.isComposing` 체크가 없어서, 한글 IME로 조합 중 Enter로 음절을 확정하는
    순간에도 제출이 같이 트리거되던 게 원인으로 추정됨 — 전부
    `event.key==='Enter'&&!event.isComposing`으로 수정.
  - **게시판(자유/질문) 동영상 첨부 지원**. 첨부 input을 `accept="image/*,video/*"`로
    확장, 미리보기는 `URL.createObjectURL`로 이미지/동영상 전환 표시, 업로드는 기존
    `board-photos` 버킷 그대로 재사용(MIME 제한 없음 확인). `posts.image_url`엔 이미지든
    동영상이든 URL만 저장되므로, 렌더링 시 확장자(`.mp4/.webm/.mov/.m4v/.ogg`)로
    동영상 여부를 판별해 `<video controls>`로 표시. 동영상 용량 제한은 50MB(이미지는
    기존대로 10MB).
  - **마이페이지에서 아이디(학번) 직접 변경 기능 추가**. 로그인 아이디가
    `student_id`이자 로그인 이메일(`{학번}@bugwang3-1.app`)이고, `user_roles`/
    `user_profiles`/`simo_members`/`user_devices`/`study_sessions`/`posts`/`comments`/
    `notice_poll_votes` 등 여러 테이블에 텍스트로 흩어져 있어서(FK 제약은 없음)
    프론트에서 직접 바꿀 수 없음 — `bugwang-server`에 서비스 롤로 실행하는
    `POST /api/change-student-id` 신설(로그인한 본인 확인은 `requireAdmin`이 아니라
    새로 만든 `requireAuth`로, access_token만 검증하고 관리자 권한은 요구하지 않음).
    새 아이디 형식 검증 + 이메일 중복 확인 + `user_roles`/`user_profiles`/`simo_members`
    (PK 테이블)에 이미 같은 아이디로 남은 행이 있는지(예전 계정 삭제 잔재) 확인한 뒤,
    `sb.auth.admin.updateUserById`로 로그인 이메일부터 바꾸고 나머지 테이블들은
    `Promise.allSettled`로 일괄 갱신(일부 실패 시 207 + "관리자에게 문의" 안내,
    `/api/delete-user`의 기존 정리 패턴과 동일한 위험 감수 수준). `study_tasks`는
    `student_id` 컬럼이 없이 `user_id`(uuid, 안 바뀜)로만 연결돼 있어서 손댈 필요 없음.
    프론트는 마이페이지에 "아이디 변경" 카드 추가(현재 비밀번호로 본인 확인 후
    `fetch`로 호출) — 비밀번호 변경 카드(`changePw`)와 동일한 재인증 패턴을 따름.
    **실행 주체를 학생 자기 자신으로 할지 관리자 승인으로 할지는 사용자에게 직접
    확인 후 "학생이 직접" 쪽으로 결정함.**
  - **선생님 탭 학생 상세 화면에 "리포트" 탭 추가**. 기존엔 월간 캘린더(날짜별
    계획/완료 목록)만 있었는데, 사용자가 "학생 본인의 학습 리포트(`page-report`)와
    똑같이 구성해달라"고 요청 — 캘린더를 통째로 대체할지 탭으로 분리할지 확인한 뒤
    "리포트 + 캘린더 탭 분리"로 결정. `#student-detail-fullscreen`에 `.view-toggle`
    탭(`switchStudentDetailView`)을 추가해 기본은 리포트 탭으로 열림. 리포트 탭은
    오늘 통계/주간 총합·평균/일별 막대그래프/오늘 과목별 도넛그래프/반 랭킹으로
    학생 본인 리포트와 동일 구성이되, `subjects`(로그인한 사람의 메모리 상태)를 쓸 수
    없어서 `study_sessions`를 대상 `user_id` 기준으로 직접 재집계하는
    `loadStudentReportData`/`renderStudentReport`를 새로 작성(기존 `loadReportData`/
    `renderReport`와 로직은 대응되지만 학생 본인 전제가 아님). 캘린더 탭은 처음
    열 때 로드 안 하고 탭을 눌러야 지연 로드(`sdState.calLoaded`)하도록 해서 불필요한
    쿼리를 줄임. **원본 학생 리포트의 "연속 공부일"(`rep-streak`)은 사실 어디서도
    계산 로직이 없어 항상 "0"만 표시되는 미구현 상태였음** — 그대로 복제하지 않고
    이 자리엔 대상 학생의 "오늘 반 랭킹"(`X/Y등`)을 대신 넣음.
  - **PWA(홈 화면 추가)에서 튜토리얼 "건너뛰기" 버튼이 안 보이는 문제 수정**. 원인
    두 가지: (1) `positionTourCard()`가 하이라이트 대상이 화면 위쪽 절반에 걸치기만
    하면 무조건 카드를 그 아래에 붙였는데, 아래쪽에 남은 공간이 카드 높이보다 작으면
    카드(그리고 맨 아래 "건너뛰기"/버튼 줄)가 뷰포트 밖으로 밀려났음 — 대상 위/아래
    남은 공간을 비교해서 실제로 들어갈 수 있는 쪽에 배치하고, `top` 값도 항상
    뷰포트 안으로 clamp하도록 수정. (2) iOS PWA(standalone) 모드에서는 하단 홈
    인디케이터 영역(`env(safe-area-inset-bottom)`)만큼 실제 상호작용 가능한 화면이
    `window.innerHeight`보다 작은데 이걸 고려하지 않고 있었음 — 숨김 프로브
    엘리먼트로 `env()` 값을 픽셀로 읽어와(`getSafeAreaBottom()`) 카드 배치 계산에서
    뷰포트 높이 대신 `innerHeight - safeAreaBottom`을 쓰도록 수정.
  - **모바일에서 정지 버튼을 눌러도 총 공부시간이 계속 올라가는 버그 수정**. 원인은
    `startTaskTimer(si,ti)`가 `await`(세션 insert)를 타기 전까지 `activeTimer`를
    설정하지 않는 것 — 모바일에서 재생 버튼을 네트워크 왕복 중 시각적 피드백 없이
    빠르게 두 번 누르면(흔한 사용 패턴) `openTimerView`/`toggleTaskTimer`의
    `if(!activeTimer)` 가드가 두 번 다 통과해서 `startTaskTimer`가 겹쳐 실행되고,
    `setInterval`이 두 개 생겨버림. 정지 버튼은 그 시점에 `activeTimer.interval`로
    참조되는(더 나중에 덮어쓴) 하나만 멈추고, 먼저 만들어졌던 인터벌은 참조를
    잃어버린 채(orphan) 계속 돌면서 시간을 올렸던 것. `activeTimer` 자체를 재사용해
    막으면 `tfSwitchTask`처럼 "정지 후 바로 다른 태스크 시작"하는 정상 흐름까지
    막혀버리므로, `startTaskTimer` 진입 동시성만 차단하는 전용 락(`timerStarting`)을
    별도로 둬서 해결.
- 2026-07-15: 게시물이 안 올라가는 오류 수정 (세션 만료 미감지 버그).
  실제로는 `posts` 테이블만의 문제가 아니었음 — Supabase 로그(`get_logs('postgres')`,
  `get_logs('auth')`)를 확인해보니 같은 시간대(03:55~04:01 KST)에 `study_sessions` insert도
  똑같이 "row-level security policy" 오류로 실패하고 있었고, 바로 직전에 auth 쪽에서
  `400 Invalid Refresh Token: Refresh Token Not Found` 에러가 찍혀 있었음. 즉 세션의 리프레시
  토큰이 무효화(오래 켜둔 탭, 또는 여러 탭에서 거의 동시에 토큰 갱신이 경합하는 경우 흔히
  발생)되면 supabase-js는 내부적으로 로그아웃 처리하는데, 이 앱은 `onAuthStateChange`를 전혀
  구독하지 않고 있어서 `currentUser` 같은 전역 상태가 그대로 남아있었음 — 화면은 계속
  로그인된 것처럼 보이지만 실제 세션은 anon이라 `auth.uid() = user_id`를 요구하는 모든 RLS
  쓰기(게시글 작성, 댓글, 공부 타이머 등)가 조용히 실패하는 구조였음. `sb.auth.onAuthStateChange()`
  구독을 추가해서 `SIGNED_OUT` 이벤트가 오면(리프레시 실패 포함) 앱도 로그인 화면으로 돌려보내고
  "로그인이 만료됐어요" 안내를 띄우도록 수정, `TOKEN_REFRESHED`에는 `currentUser`를 최신
  세션으로 동기화. 근본 원인이 인증 세션 쪽이라 게시판뿐 아니라 타이머/투표 등 auth 기반 쓰기
  전반에 적용되는 수정임.
- 2026-07-15: 모바일 최적화 묶음 (다크모드 버튼, 튜토리얼, 날짜 계산, 공부시간 수정, 4시간
  연속 공부 확인).
  - **"오늘 날짜" 계산의 진짜 버그를 찾아 수정**. 기존에 이미 한 차례 자정 롤오버 버그를
    고쳤었는데(같은 날 아래 항목), 그 수정은 "날짜가 바뀐 걸 더 자주 감지하자"였을 뿐 원인
    자체는 못 잡았던 것으로 드러남. 진짜 원인은 앱 전체에서 "오늘"을 `new
    Date().toISOString().slice(0,10)`로 구했다는 것 — `toISOString()`은 **UTC** 기준이라
    한국(UTC+9)에서는 자정~오전 9시 사이에 실제 로컬 날짜보다 하루 이전 날짜가 나온다(예:
    로컬 7/15 03:00 → UTC로는 아직 7/14 18:00). 이 때문에 그 시간대에 접속하면 플래너 할
    일/공부 타이머/오늘 통계/급식/뉴스 요약 등 거의 모든 "오늘" 관련 기능이 전날 기준으로
    동작했고, `checkDateRollover()`의 날짜비교도 같은 방식이라 로컬 자정이 아니라 UTC
    자정(=한국시간 오전 9시)에야 날짜가 바뀐 걸로 인식했음 — "어제 접속해있던 사람이 오늘
    아침에 열면 전날로 나온다"는 제보와 정확히 일치. 새로 만든 `localDateStr(d=new Date())`
    (로컬 `getFullYear/getMonth/getDate` 기반, 월간 캘린더 쪽에서 이미 쓰던
    `ymdLocal()`과 동일한 방식)로 15곳의 `toISOString().slice(0,10)` 호출을 전부 교체.
    (`updated_at`/`started_at`/`ended_at`처럼 timestamptz 컬럼에 쓰는 `toISOString()`은
    타임존 정보가 그대로 들어가야 하므로 그대로 둠 — 문제는 순수 날짜 문자열 비교에서만
    발생.) 이 버그로 실제 DB에 잘못 찍힌 과거 기록도 발견함(`study_sessions`/`study_tasks`
    각 1건 — 자정 직후 KST 시간대에 생성돼 `date`가 하루 전으로 저장돼 있었음) — 사용자
    확인 후 올바른 날짜로 직접 UPDATE해서 보정함.
  - **모바일에서 다크모드 버튼이 안 보이던 버그 수정**. 원인은 모바일 상단바(`.topbar`,
    z-index:100)가 사이드바(`.sidebar`, z-index:50)보다 위에 떠 있어서, 햄버거 메뉴를 열면
    사이드바 헤더(다크모드 버튼·튜토리얼 버튼이 있는 곳)가 topbar 뒤에 깔려 반투명
    블러 너머로 흐릿하게 가려지고 클릭도 topbar가 가로채던 것. `.sidebar.open ~
    .topbar{display:none}`을 추가해서 드로어가 열리면 topbar 자체를 숨기도록 수정.
  - **튜토리얼 진행 중 모바일 메뉴바가 안 닫혀서 화면을 가리던 문제 수정**. 기존엔
    `startTour()`가 처음에 `openSidebar()`를 한 번 부르고 끝까지 안 닫아서, 대시보드
    요소(D-day 등)를 설명하는 단계에서도 드로어가 화면을 덮고 있었음. `showTourStep()`에서
    매 단계마다 대상 요소가 `#sidebar` 안에 있는지(`el.closest('#sidebar')`) 확인해서, 사이드바
    메뉴 항목/다크모드 버튼을 설명할 때만 열고 그 외에는 닫도록 변경.
  - **튜토리얼을 탭 안까지 들어가서 설명하도록 대폭 확장**. 기존엔 사이드바 메뉴 항목만
    가리키고 끝났는데, 공지사항/즐겨찾기/학습 플래너/학습 리포트/캠스터디/자유·질문게시판/
    내신 계산기/입시뉴스/마이페이지는 실제로 그 탭 안으로 들어가서(`navigate()`) 핵심 요소
    (공지 목록·투표, 즐겨찾기 카드, 과목별 할 일·타이머·계획이수 캘린더, 주간/과목별
    그래프·반랭킹, 캠스터디 참여 버튼, 글쓰기 폼, 교과군별 평균 등급, AI 뉴스 요약, 프로필
    사진)까지 순서대로 짚어주도록 단계를 추가함(`buildTourSteps()`의 각 step에 `page` 필드
    추가, `showTourStep()`이 있으면 먼저 `navigate(step.page)` 호출). 탭 내부 요소는 그
    탭이 비활성일 때 `display:none`이라 `offsetParent`로 직접 필터링할 수 없어서, 대신 그
    탭의 사이드바 nav-item이 보이는지로 권한 여부를 판단(공지 작성 버튼처럼 탭은 보여도
    버튼만 권한별로 숨겨지는 경우는 `visible` 콜백으로 개별 처리). 탭을 막 이동한 직후에는
    비동기 데이터 로딩(리포트 등)이 끝날 시간을 조금 더 준다(280ms→520ms).
  - **공부 시간 수정 기능 추가**. 플래너의 각 할 일 행에 시계 아이콘 버튼(`editTaskTime`)을
    추가 — 분 단위로 새 총 시간을 입력받아 목표 시간과의 차이(delta)만큼 오늘 기록된
    `study_sessions` 행을 보정한다. 시간이 늘면 가장 최근 행에 더하고(없으면 새 보정 행을
    insert), 줄면 최근 행부터 순서대로 깎아서(0 밑으로는 안 내려가게) 정확히 목표 총합에
    맞춤 — `study_sessions.duration_seconds`에 별도 제약조건이 없어 음수도 가능하지만,
    타임블록 뷰에 유령 블록이 생기는 걸 피하려고 실제 행을 고쳐쓰는 방식을 택함. 타이머가
    돌고 있는 태스크는(정지하자마자 덮어써지므로) 버튼을 숨김.
  - **한 태스크를 4시간 넘게 끊지 않고 계속 돌리면 확인 모달 추가**. SMS/푸시 인프라가 이
    저장소엔 없어서 앱 내 모달로 대체 — `checkStudyMarathon()`이 20초마다 현재 타이머의
    연속 경과 시간(`getActiveContinuousElapsed()`, 풀스크린 일시정지 중엔 멈춤)을 확인해서
    4시간(`MARATHON_LIMIT_SEC`)을 넘으면 그 시점에서 일단 `stopCurrentTimer()`로 멈추고
    "아직 공부하고 있나요?" 모달을 띄운다. 2분(`MARATHON_GRACE_SEC`) 안에 "계속 공부해요"를
    누르면 같은 과목·할 일로 `startTaskTimer()`를 다시 불러 이어서 기록하고(다음 확인은 그
    시점부터 다시 4시간 뒤), 응답이 없으면 그대로 멈춘 채로 둔다("확인 못하면 4시간에서
    스탑" 요구사항 그대로).
  - **아직 실제 브라우저 로그인 후 클릭 테스트는 못 했음** — 이 환경에 Playwright/
    chromium-cli 같은 브라우저 자동화 도구가 없고, 로그인에 필요한 실제 학생 계정 정보도
    없어서 문법 검사(JS 파싱, HTML id 중복, CSS 중괄호 균형)와 코드 추적으로만 검증함.
    Supabase MCP로 실제 DB 스키마(`study_sessions.duration_seconds`에 CHECK 제약 없음 등)는
    확인했음. 특히 튜토리얼의 탭 이동+타이밍, 4시간 확인 모달의 실제 타이밍은 실기기에서
    한 번 확인해보는 걸 권장.
- 2026-07-15: 대규모 기능 추가 묶음 (공지 투표, 뉴스 개선, 날짜 롤오버 버그, 온보딩 투어 등).
  **아직 실제 브라우저에서 로그인해 눌러보는 E2E 테스트는 못 했음** — 문법 검사(JS 파싱,
  CSS 중괄호 균형, HTML id 중복)만 통과 확인. 특히 투표 흐름과 튜토리얼 위치 계산(모바일
  폭 포함)은 실제로 한 번 눌러보길 권장.
  - **공지 투표 기능 추가**. `notice_polls`(질문/선택지 jsonb/익명여부/notice_id)과
    `notice_poll_votes`(poll_id/student_id/voter_name/option_index, `(poll_id,student_id)`
    unique) 테이블 신설. RLS는 이 프로젝트의 기존 permissive(`true`/`true`) 컨벤션과 다르게
    설계함 — 실명/학번/투표 선택지처럼 민감한 데이터를 다루는 테이블이라 **Claude Code의
    자동 실행 안전장치가 permissive 정책 생성을 막았음**(unrestricted write 경고). 그래서
    읽기는 전체 공개(SELECT `true`, 투표 결과·참여 여부를 학급 전체가 봐야 하는 기능
    특성상 필요) / 쓰기는 `auth.uid()`가 본인 것일 때만 허용(`study_sessions`/`user_profiles`
    처럼 진짜 제한하는 기존 테이블 패턴을 따름)하는 절충안으로 감. 투표 삭제는 공지
    삭제(`deleteNotice`)시 `notice_id` FK cascade로 자동 정리(cascade는 자식 테이블 RLS를
    안 타므로 문제없음).
    - 공지 작성 시(스태프만) "투표 추가" 체크 → 질문/선택지(최소 2개, 최대 8개)/공개방식
      (실명·익명) 입력. 실명이면 옵션별로 누가 골랐는지 이름이 그대로 보이고(투표 시
      `voter_name`을 함께 저장), 익명이면 개수/퍼센트만 보임. 어느 쪽이든 "미참여자 보기"
      토글로 아직 투표 안 한 학생 명단은 항상 볼 수 있음(참여 여부는 선택 내용과 별개
      정보라고 판단) — 명단은 `/api/users`(bugwang-server)로 가져온 전체 학생 목록에서
      투표자를 뺀 것(`loadClassRoster()`, 세션 내 캐시).
    - 투표 UI는 공지 목록의 펼침 영역(`notice-content`) 안에 들어가서, 대시보드 미리보기와
      공지사항 전체 페이지 양쪽에 동시에 렌더링될 수 있음 — DOM id 충돌을 피하려고
      `poll-nonvoters-${uid}`처럼 `dash-`/`page-` 접두사가 붙은 uid를 그대로 재사용함.
  - **공지 작성을 모달 → 전체 페이지(글쓰기 뷰)로 전환**. "+ 공지 작성" 클릭 시
    `openNoticeWritePage()`가 `.page` 전환 방식으로 `#page-notice-write`를 보여줌(사이드바
    nav에는 없는 페이지라 `navigate()` 대신 직접 `.page.active` 토글 + 나가기는
    `closeNoticeWritePage()`→`navigate('notice')`). 기존 모달의 id(`notice-title-input`
    등)는 그대로 재사용해서 `submitNotice()` 로직은 최소 수정.
  - **뉴스 중복 표시 문제 해결**. 원인은 백엔드 수집기(이 저장소 밖, `bugwang-server`)가
    같은 기사를 두 번 넣는 경우가 있었던 것으로 보임(DB에서 확인한 실제 중복 4건은 SQL로
    정리 완료). 백엔드 코드가 이 세션에 없어서 근본 수정은 못 했고, 대신 `dedupeNews()`로
    프론트에서 url(없으면 제목) 기준으로 항상 걸러서 렌더링하도록 방어 처리.
  - **뉴스 썸네일 표시 추가**. `news` 테이블에 `image_url`(nullable) 컬럼 추가하고
    프론트에서 표시하도록 준비했지만, **현재 백엔드 수집기가 이 컬럼을 채워주지 않아서
    당장은 전부 카테고리별 색상+이모지 플레이스홀더 타일로만 보임**(그래도 줄글보다는 덜
    밋밋함). 실제 기사 썸네일(예: og:image 스크래핑)을 보여주려면 `bugwang-server`의 뉴스
    수집 로직에서 `image_url`을 채워 insert하도록 별도로 고쳐야 함 — 이 저장소 담당 밖이라
    사용자에게 안내만 하고 넘어감.
  - **플래너/D-day 자정 롤오버 버그 수정**. 앱을 켜둔 채(특히 폰 화면 꺼놨다 켰을 때) 자정을
    넘기면 D-day/시간표/오늘 공부시간/플래너 할일이 전날 기준으로 멈춰있던 문제. `today`를
    계산하는 함수들 자체는 다 `new Date()`를 매번 새로 읽어서 문제없었는데, 아무도 그
    함수들을 자정 이후에 다시 안 불러준 게 원인. `checkDateRollover()`를 60초 주기
    `setInterval` + `visibilitychange`(탭 다시 보일 때)에 걸어서, 날짜 문자열이 바뀐 걸
    감지하면 `updateDday/renderTimetable/loadMeal/loadSubjectsFromDB/loadTodaySessions/
    refreshStats` 등을 다시 실행하도록 함.
  - **학습 리포트 도넛그래프 등장 애니메이션**. `conic-gradient`는 배경색이라 직접
    transition이 잘 안 먹어서, `@property --reveal`(각도/퍼센트 보간 가능하게 타입 등록) +
    `mask-image:conic-gradient(#000 var(--reveal),transparent var(--reveal))`로 이미 그려진
    도넛을 각도 방향으로 걷어내는 방식의 마스크 리빌 애니메이션을 씀. 리포트를 다시 열
    때마다 재생되도록 `renderReport()`에서 클래스를 뗐다 강제 리플로우 후 다시 붙임.
  - **사이드바 메뉴 아이콘에 색상 추가**. 아이콘마다 다른 고정 색(`style="stroke:#hex"`,
    인라인이라 `.nav-item svg{stroke:currentColor}` 전역 규칙보다 우선함)을 줘서, 선택
    여부(active)와 무관하게 항목마다 구분되는 색을 유지하도록 함(macOS 시스템 설정
    사이드바 스타일 참고) — 관리자는 `admin-role-badge.owner`와 같은 마젠타, 학생현황은
    `role-pill.teacher`와 같은 초록 등 기존에 쓰던 의미색을 최대한 재사용.
  - **신규 사용자 온보딩 투어 추가**. 사이드바 헤더에 물음표 버튼(`startTour()`) +
    마이페이지 설정 섹션에 "다시 보기" 버튼으로 언제든 재실행 가능. 로그인 후 최초
    1회(`localStorage.tour_done_v1` 없을 때) 0.9초 뒤 자동 시작. 대시보드 핵심 요소
    (D-day/오늘 공부현황/시간표) + 사이드바 nav 항목들을 순서대로 하이라이트(`box-shadow:
    0 0 0 9999px`로 스포트라이트 만드는 방식)하며 화살표 말풍선(`.tour-card::before`
    삼각형)으로 설명. `buildTourSteps()`가 `offsetParent!==null`로 각 대상이 실제로 화면에
    보이는지 걸러내므로, 관리자/선생님/실모반처럼 권한에 따라 숨겨진 nav 항목은 해당 계정의
    투어에서 자동으로 빠짐.
- 2026-07-15: 뉴스 삭제 버튼(운영자/선생님 전용)이 로그인 직후엔 안 보이다가 필터 탭을 눌러야
  나타나던 버그 수정. 원인: `initApp()`에서 `renderNews()`(뉴스 목록 로드)와 `loadMyRole()`(권한
  로드)가 둘 다 await 없이 거의 동시에 시작되는 경쟁 상태였는데, `renderNewsList()`의 삭제 버튼
  노출 여부(`isStaffRole()`)가 그 시점의 `currentRole`을 읽다 보니 `renderNews()`가 먼저 끝나면
  아직 role이 안 채워진 상태로 렌더링되고, 이후 role이 로드돼도 아무도 재렌더링을 안 시켜서 필터
  버튼을 눌러 수동으로 `renderNewsList()`를 다시 태울 때까지 삭제 버튼이 안 보였음. 수정:
  `filterNews()`가 현재 필터 카테고리를 `currentNewsCategory` 전역변수에 저장하도록 하고,
  `loadMyRole()`이 끝난 직후 이미 뉴스가 로드돼 있으면(`allNewsData.length`) 그 필터 상태 그대로
  `filterNews(currentNewsCategory)`를 한 번 더 호출해 삭제 버튼이 즉시 반영되도록 함(아직 뉴스
  자체가 안 왔으면 `renderNews()`가 나중에 끝날 때 이미 반영된 role로 그리므로 그대로 둠).
- 2026-07-15: 전체 UI에 마이크로인터랙션 대폭 추가. 기존(같은 날 앞선 커밋)에 모달 페이드/버튼
  hover·active 정도만 있던 것을, 거의 모든 인터랙티브 요소로 확장.
  - 전역 `button{}` 리셋에 `transition:transform .12s ease` + `button:active{transform:scale(.94)}`
    를 추가해서, 개별적으로 hover/active를 안 챙겨준 아이콘 버튼들(공지/댓글/게시글 삭제 버튼 등)이
    한 번에 눌림 피드백을 받도록 함 — 다크모드 대비 버그 때 썼던 "전역 리셋 한 곳만 고치기" 패턴을
    재사용. 단, 이미 `transition:` 속성을 자체 정의한 버튼(`.notice-del-btn`처럼 `color`만
    트랜지션하던 것들)은 전역 규칙이 transform을 못 얹으므로, 그런 것들은 개별적으로
    `,transform .12s ease`를 이어붙여 부드럽게 눌리도록 수정.
  - 사이드바: 다크모드 토글 버튼 누르면 살짝 회전(rotate)하며 축소, 햄버거 메뉴 버튼 누름 피드백,
    nav-item/user-row 탭 시 살짝 스케일.
  - 페이지 전환(`navigate()`가 `.page.active`를 붙일 때) 페이드+위로 슬라이드 진입
    애니메이션(`@keyframes page-in`) 추가 — 탭 전환마다 매번 재생.
  - 리스트/카드 항목 등장 애니메이션(`@keyframes item-in`, 페이드+슬라이드)을 공지 목록, 플래너
    태스크 행, 즐겨찾기 카드, 성적 계산기 결과(대학 매칭 행), 선생님 탭 학생 카드, 댓글 목록에
    적용. **주의**: 이 애니메이션은 해당 DOM 요소가 새로 생성(innerHTML 재렌더)될 때만 재생되고,
    `textContent`만 갱신하는 초당 타이머 갱신(`activeTimer.interval`)에는 걸리지 않는지 확인하고
    적용함(`renderSubjects()`는 타이머 값 변경 시가 아니라 과목/태스크 추가·삭제·시작·정지 같은
    이산적 이벤트에서만 호출되고, 매초 갱신은 `task-time` 등 특정 자식 엘리먼트의 textContent만
    바꾸는 구조라 안전). 다만 선생님 탭 학생 카드 그리드(`updateTeacherViewData`)는 5초마다
    전체 재렌더되므로 그 카드들은 5초마다 등장 애니메이션이 재생됨(의도적으로 허용 — "살아있는"
    느낌의 미묘한 새로고침 신호로 판단하고 정리 비용 대비 크게 거슬리지 않는다고 보고 넘어감).
  - 즐겨찾기 카드/친구 랭킹 카드(`tf-rank-card`)는 hover 시 살짝 떠오르는(`translateY`) 효과 +
    active 시 눌리는 효과 추가. "+" 과목 추가 버튼은 hover 시 90도 회전.
  - 이미지(게시판 첨부 사진) hover 시 살짝 확대(`scale(1.01)`) + opacity 트랜지션 추가(기존엔
    `transition` 자체가 없어서 순간적으로 튀었음).
- 2026-07-15: 실모반 탭을 nav-admin/nav-teacher와 동일하게 권한 없으면 사이드바에서 아예
  숨김(`updateSimoNavVisibility()`, `canSeeSimoContent()`일 때만 표시). 신청 UI는 실모반
  페이지에서 빼고 공지사항 페이지 상단 고정 카드(`#simo-pinned-notice`)로 옮김 — 상태별로
  안내문과 신청 버튼을 보여주고, `loadNotices()` 호출 시마다 갱신됨. 실모반 페이지 자체는
  이제 권한자만 도달 가능하므로 자료 목록만 표시.
- 2026-07-15: 실모반 공지를 별도 "실모반 공지" 섹션/테이블(`simo_notices`) 대신 기존
  공지사항에 통합. `notices.audience`('all'/'simo') 컬럼 추가, 공지 작성 모달에 운영자/
  선생님만 보이는 "대상" 선택 추가, 공지 목록에서 실모반 전용 공지는 "실모반" 배지로 표시
  (다른 사람에겐 아예 안 보임). 실모반 페이지에는 이제 자료 섹션만 남음. 자세한 내용은
  위 스키마 섹션 참고.
- 2026-07-15: 실모반(신청제) 기능 추가. 사이드바 "실모반" 탭에서 학생이 신청하면
  `simo_members`에 pending으로 등록되고, 운영자/선생님(`isOwnerTier()`)이 관리자 탭
  "실모반 신청 관리" 카드에서 승인/거절. 승인된 학생(+운영자/선생님은 신청 없이도)만
  실모반 전용 공지사항(`simo_notices`, 기존 공지사항 UI 재사용)과 자료(`simo_materials`,
  파일 업로드/다운로드, `simo-materials` 버킷)를 볼 수 있음. 접근 제한은 프론트 조건부
  렌더링으로만 처리(RLS는 미적용) — 자세한 내용은 위 스키마 섹션 참고.
- 2026-07-15: 시간표 교시 번호 버그 + 다크모드 재생버튼 버그 수정.
  - `renderTimetable()`이 교시 번호를 배열 인덱스(`i+1`)로 매겨서, 점심이 배열 한 칸을
    차지하는 바람에 점심 이후 교시가 "4, 점심, 6, 7"처럼 5교시 없이 밀려 보이던 버그.
    점심을 세지 않는 별도 카운터로 교체.
  - 전역 `button{}` 리셋에 `color:inherit`이 빠져있어서, `fill:currentColor`로 그리는
    아이콘(플래너 태스크 재생버튼 등)이 부모 테마색(`--ink`) 대신 브라우저 기본 버튼
    텍스트색(어두운 계열, 라이트모드에선 우연히 안 보였음)을 써서 다크모드 배경 위에서
    안 보이던 문제. **다크모드 대비 버그가 반복적으로 나오는데, 매번 개별 컴포넌트의
    배경/글자색을 고정값으로 바꾸는 대신, 이번처럼 전역 리셋 누락(`button{color:inherit}`
    같은) 여부부터 의심해볼 것** — 근본 원인이 한 군데인 경우가 많음.
- 2026-07-15: UI 폴리시 3건.
  - 계획 이수 캘린더 완료 항목 표시를 취소선 대신 초록색으로(처음엔 글씨를 초록색으로 했다가
    "글씨 말고 체크박스를 초록색으로"라는 피드백을 받고 `.mcal-task-chk input:checked{accent-color:...}`
    로 정정함 — 텍스트/체크박스 중 어느 쪽인지 헷갈리면 체크박스 쪽이 기본으로 안전한 선택).
  - 학습 리포트 "과목별 비율"을 띠그래프 대신 도넛(원)그래프로 변경(`conic-gradient` 사용,
    가운데 총 공부시간 표시) — 카드 오른쪽에 비는 공간을 범례로 채움.
  - 대시보드 D-day 타일 아래 날짜가 수능 날짜(2026년 11월 19일)로 하드코딩돼 있던 것을
    오늘 날짜가 매번 계산되어 나오도록 수정(`updateDday()`).
  - 전반적으로 마이크로인터랙션 추가: 모달 열림/닫힘 페이드+스케일 트랜지션(기존
    `display:none/flex` → `opacity`+`pointer-events`로 변경, 모든 `.modal-overlay`에 공통 적용),
    버튼/할일체크/학생카드/마이페이지 아바타에 hover·active 시 스케일·그림자 효과.
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
