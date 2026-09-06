# 부광고 3-1 대시보드 — 프로젝트 컨텍스트

> 이 파일은 새 채팅방/다른 AI 에이전트(Claude, Gemini, DeepSeek 등)에서 작업을 이어갈 때
> 맥락을 파악하기 위한 문서입니다. **의미 있는 변경사항이 생기면 아래 "최근 변경사항" 맨 위에
> 추가해주세요.**
>
> 이 파일은 **지금 상태**만 담습니다. 지난 변경 기록은 [docs/CHANGELOG.md](docs/CHANGELOG.md)로
> 옮겼고, 거기까지 다 읽을 일은 거의 없습니다 — 필요할 때 `grep`으로 찾아 쓰세요.

## 프로젝트 개요
- 부광고등학교 3학년 1반을 위한 학급 대시보드 웹앱 (PWA)
- 순수 프론트엔드 단일 파일(`index.html`) 구조 — 별도 빌드 시스템 없음
- 홈 화면에 앱처럼 추가 가능 (manifest.json + 아이콘)

## 파일 구조
- `index.html` — 전체 앱 (약 5,600줄, 계속 늘어나는 중). 로그인, 대시보드, 관리자 탭 등 모든 화면/로직 포함
- `sw.js` — 서비스 워커(2026-07-15 신설). 푸시 알림 수신/클릭 처리 + "새 버전 배포됐어요"
  새로고침 배너를 띄우는 업데이트 감지 신호용. **`index.html`에 의미 있는 변경을 배포할 때마다
  이 파일 맨 위의 `SW_BUILD` 상수 값을 반드시 같이 올릴 것** — 이 값이 안 바뀌면 브라우저가
  "새 버전이 배포됐다"는 걸 감지 못해서 새로고침 배너 자체가 안 뜸(서비스 워커 업데이트
  감지는 이 파일의 바이트가 실제로 달라졌을 때만 트리거되기 때문). 오프라인 캐싱은 안 함.
- `manifest.json` — PWA 매니페스트 (앱 이름, 아이콘, 테마 색상)
- `icon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png` — 홈 화면/파비콘용 아이콘
- `logo-source.png` — 로고 원본 이미지
- `GitHub에 올리기.bat` — `git add . && git commit -m "dashboard update" && git push` 를 실행하는 원클릭 배포 스크립트
- `.gitignore` — `bugwang-server/`, `server.js` 제외 (백엔드는 이 저장소에 포함되지 않음)

## 백엔드
- ⚠️ **2026-08-24 정정**: 아래 Railway/`bugwang-server` 관련 서술은 전부 **더 이상 사실이 아님**.
  Railway 무료 체험이 2026-08-14에 만료되면서 그 Express+Socket.IO 서버는 실제로 배포되어
  있지 않게 됐고, 백엔드는 **Supabase Edge Function** (`api`라는 이름 하나, project
  `pvrgwvfjnebsxnlxaxhc`, Deno 런타임)으로 옮겨졌음. 과거 세션이 이 사실을 모른 채
  `bugwang-server/server.js`를 계속 수정·커밋한 이력이 있는데(3개 커밋이 로컬에만 남아있고
  push도 안 됐음) 전부 **죽은 코드**임 — Railway 자체가 없으니 그 저장소에 뭘 push해도 아무
  효과가 없다. 아래 문단들은 과거(Railway 시절) 기록으로 남겨두되, **실제 동작 중인 구조는
  이 문단 바로 다음 항목들을 볼 것**.
- **현재 구조**: `index.html`의 `SERVER_URL = 'https://pvrgwvfjnebsxnlxaxhc.supabase.co/functions/v1'`
  가 실제 백엔드. 엣지 함수 하나(`api`)가 URL 경로(`/api/{나머지}`)를 자체 `switch(path)`로
  라우팅함 — Express 라우터가 아니라 이 파일 하나에 모든 엔드포인트가 들어있음(`users`,
  `create-user`, `delete-user`, `reset-password`, `change-student-id`, `push-subscribe`,
  `push-unsubscribe`, `notify/notice`, `notify/comment`, `notify/poll-vote`,
  `notify/teacher-message`, `notify/dm-message`, `notify/camstudy-join`, `notify/study-cert`,
  `notify/study-vote`, `fetch-news`, `fetch-meal`, `health`). `verify_jwt:false`로 배포되어
  있고 함수 자체가 `checkAuth`/`checkAdmin`/`checkStaff`로 자체 인증/인가함.
  - 배포는 `mcp__supabase__deploy_edge_function`(또는 claude.ai Supabase 커넥터의 동명
    MCP 도구)로 함 — `name:'api'`, `entrypoint_path:'index.ts'`, `verify_jwt:false`. 로컬에
    이 함수의 정본 소스 파일이 따로 없으므로, 수정할 때는 `get_edge_function`으로 현재
    배포본을 먼저 받아온 뒤 고쳐서 다시 `deploy_edge_function`으로 올리는 식으로 작업함(2026-08-24
    세션에서 이렇게 진행 — 스크래치패드에 임시로 받아뒀다가 검증 후 배포).
  - **Socket.IO는 완전히 걷어냈음(2026-08-28)** — 캠스터디 채팅/참가자 수와 기기 간 타이머
    동기화는 **Supabase Realtime private 채널**로 다시 만들었다(`connectTimerSync()`,
    `ensureStudyChannel()`). 토픽은 `camstudy`와 `timer:<auth uid>` 둘뿐이고, 접근 권한은
    앱 코드가 아니라 `realtime.messages`의 RLS(`public.realtime_topic_allowed`)가 판정한다.
    socket.io CDN 스크립트와 `SOCKET_URL` 상수도 삭제됨.
  - **엣지 함수가 하나 더 있음: `study`** (캠스터디 전용, `verify_jwt:false`). `study/join`은
    JaaS(8x8 Jitsi) 입장권 JWT를 RS256으로 서명해서 돌려주고, `study/config`는 영상 서버 키가
    등록돼 있는지만 알려준다. `api` 함수(계정·알림·급식)와 분리해서 배포 사고 반경을 줄였다.
    ⚠️ **시크릿 `JAAS_APP_ID`/`JAAS_API_KEY`/`JAAS_PRIVATE_KEY`가 등록돼야 영상이 켜진다**
    (없으면 `study/join`이 503 `not_configured`를 주고, 앱은 "채팅 전용"으로 입장시킨다).
  - **DM "지금 이 방을 보고 있음" 상태**(어떤 방을 열어둔 사람에게는 그 방 새 메시지 알림을
    안 보내는 기능)는 예전엔 Socket.IO 이벤트(`dm:open`/`dm:close`)로 했었는데, 소켓이 죽으면서
    2026-08-24에 `dm_active_viewers` 테이블(user_id PK/student_id/room_id/updated_at) +
    DM 폴링(7초)에 맞춘 하트비트 upsert 방식으로 재구현함. 엣지 함수의 `notify/dm-message`가
    `updated_at`이 30초 이내인 행만 "보는 중"으로 인정(탭을 그냥 닫아서 delete가 못 불려도
    오래 방치되지 않게 하는 안전장치).
- **환경변수**: `web-push`용 `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`는 이제 Supabase 프로젝트의
  엣지 함수 시크릿으로 관리함(과거 Railway 환경변수 대신). 값을 분실하면 새로 만들고 프론트
  `index.html`의 `VAPID_PUBLIC_KEY` 상수도 반드시 같이 갱신해야 함(둘이 같은 키 쌍이어야
  구독이 유효함) — 이 부분은 Railway 시절과 동일.
- `bugwang-server/`(Express+Socket.IO, 별도 git 저장소, gitignore됨)는 **더 이상 배포되지
  않는 죽은 코드**로 취급할 것 — 여기 뭘 고쳐도 실제 서비스에는 반영되지 않는다. 계속 유지할지
  아예 정리(레포 삭제 등)할지는 사용자와 상의 후 결정.
- 인증 관련 role 체계 (2026-07-14 개편, 지금도 유효 — Railway/Edge Function 어느 쪽이든 이
  스키마·프론트 로직은 그대로): `user_roles.role`은 `student`/`admin`/`owner` 3단계만
  남았고, "선생님" 권한은 `is_teacher` boolean 플래그로 완전히 분리되어 role과 **동시에** 가질 수
  있음(예: role=owner + is_teacher=true). 과거에는 `role='teacher'`라는 4번째 값으로 처리해서
  owner와 teacher를 동시에 가질 수 없었는데, 이 한계를 없앤 것. 프론트에서 권한 체크는 반드시
  `isStaffRole()`(admin/owner/is_teacher 중 하나라도) / `isOwnerTier()`(owner 또는 is_teacher)
  헬퍼로 통일해서 쓸 것 — `currentRole==='teacher'` 같은 예전 패턴은 더 이상 없음. 백엔드(엣지
  함수의 `checkAdmin`/`checkStaff`)도 `role`과 `is_teacher`를 함께 조회해서 판단하고,
  `callerIsOwnerTier`로 owner 전용 액션(계정 삭제 등)을 구분함. 또한 `can_appoint_teacher`
  플래그가 있어서 "선생님 지정" 액션 자체를 아무 owner나 할 수 있는 게 아니라 이 플래그를 가진
  owner만 가능 — 기본으로는 30122(제작자) 계정에만 부여되어 있고, 다른 owner에게 위임(관리자
  탭에서 부여/회수) 가능. 관리자/선생님 탭은 `navigate()`가 admin/teacher 페이지로 이동할
  때마다 `loadMyRole()`을 다시 호출해서 새로고침하므로, 방금 권한이 바뀌어도 재로그인 없이
  반영됨(예전에는 로그인 시점에만 로드돼서 재로그인이 필요했음).

## Supabase 스키마 (주요 테이블, 2026-07-14 기준)
- `study_sessions` — 공부 타이머 기록. `started_at`/`ended_at`/`duration_seconds` +
  (2026-07-17 추가) `start_timestamp`(bigint, epoch ms — 실행 중일 때만 값 있고 일시정지/정지면
  null)/`accumulated_seconds`(int, default 0 — 일시정지 시점까지 확정된 이번 행의 누적 초).
  **주의**: `duration_seconds`는 타이머를 정지할 때만 최종 기록되므로, 진행 중이거나 일시정지된
  세션은 `ended_at IS NULL`이고 `duration_seconds`가 아직 0인 상태 — 실시간 경과 시간은
  `accumulated_seconds + (실행 중이면 now()-start_timestamp)`로 계산해야 함(학습 플래너 타이머
  프론트의 `computeElapsedSeconds()`, 친구 랭킹 로직 참고). 타이머를 켠 채 새로고침/탭
  종료하면 `ended_at`이 영영 안 채워지는 고아 row가 생길 수 있어서, 로그인 시점
  (`initApp`→`resumeActiveTimerIfAny()`가 먼저 이어받고 →`closeOrphanSessions()`가 나머지만)에
  본인의 안 끝난 세션을 정리함. `resumeActiveTimerIfAny()`는 **기기별 localStorage가 아니라
  항상 DB의 `ended_at IS NULL` 행을 기준으로 이어받는다** — 같은 학생이 폰에서 시작한 타이머를
  PC에서 처음 열어도 그대로 이어받아야 하기 때문(그렇지 않으면 `closeOrphanSessions()`가 그걸
  고아로 오인해 0초로 마감시켜버림).
- `study_tasks` — 플래너의 하루 할 일(투두) 목록. `user_id`/`subject`/`task_name`/`is_done`/
  `date`. **student_id 컬럼이 없다** — 다른 학생 걸 조회하려면 `/api/users` 응답의 uuid(`id`
  필드)로 `user_id`를 알아내야 함. RLS는 원래 본인만 SELECT 가능했는데(`study_sessions`와
  다르게 "전체 공개" 정책이 없었음), 선생님 학생 상세 학습현황 기능 때문에 `study_sessions`와
  동일하게 "class can view all"(SELECT는 `true`) 정책을 추가함 — 쓰기는 여전히 본인만.
- `user_roles` — `student_id`(PK) / `role`(student/admin/owner) / `is_teacher` /
  `can_appoint_teacher` / `cam_allowed` / `is_external` / `mentor_student_id` /
  (2026-08-14 추가) `class_id`(uuid, nullable, FK→classes on delete set null). RLS는
  SELECT/ALL 모두 `true`(사실상 프론트 role 체크로만 게이팅되는, 이 프로젝트의 기존 컨벤션 —
  `study_sessions`처럼 `auth.uid()` 기반으로 진짜 제한하는 테이블도 있으니 새 테이블 만들 때
  어느 쪽이 맞는지 판단할 것).
- `classes`(2026-08-14 신설) — 타반/타학교 학생을 묶는 "반". `id`(uuid PK) / `name`(unique) /
  `created_at`. RLS는 `user_roles`와 동일한 permissive 컨벤션(SELECT/ALL `true`, 프론트에서
  owner-tier만 관리 UI 노출 — 반 이름 자체는 민감정보가 아니라고 판단). 멤버십은 별도 테이블
  없이 `user_roles.class_id`(FK→classes on delete set null)로 표현. 마이그레이션은 Supabase
  MCP로 실제 프로젝트(`pvrgwvfjnebsxnlxaxhc`)에 적용 완료
  (`add_classes_and_user_roles_class_id`, 2026-08-14 — 테이블/컬럼/정책 2개 생성 확인함).
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
- ⚠️ `notices`/`meals`/`simo_materials` 테이블은 RLS가 아예 꺼져 있음(anon key로 누구나
  읽기/쓰기 가능) — Supabase 어드바이저가 critical로 표시하는 항목. 정책 추가 전에는 끄면
  안 되므로(전체 접근 차단됨) 방치 중, 필요시 사용자와 상의 후 정책 설계. **`teacher_messages`는
  2026-07-15에 여기서 빠졌음** — 선생님-학생 1:1 비공개 메시지 기능을 실제로 만들면서 더 이상
  방치할 수 없어 RLS를 켬(아래 항목 참고). 새 테이블을 만들 때 "이 프로젝트는 대체로 permissive"
  라고 무심코 따라하지 말고, 그 데이터가 전체 공개돼도 괜찮은지부터 먼저 판단할 것.
- `teacher_messages` — 선생님↔학생 1:1 메시지 스레드. `student_id`(대화 상대 학생)/
  `author_name`/`content`/`sender_role`('student'|'teacher')/`is_read`. `user_id` 컬럼이
  없어서(text인 `student_id`만 있음) RLS에서 `auth.uid()`와 연결하려면
  `user_profiles(student_id, user_id)`를 거쳐야 함 — SELECT/UPDATE는 본인 스레드(자기
  student_id) 또는 스태프(admin/owner/is_teacher)만, INSERT는 `sender_role='student'`면
  본인 student_id로만, `sender_role='teacher'`면 스태프만 가능하도록 제한(2026-07-15,
  이 테이블에 실제 기능을 얹으면서 RLS를 처음 켬 — 그 전엔 스키마만 있고 아무 데서도 안 쓰던
  빈 테이블이었음). 프론트에서 직접 `sb.from('teacher_messages').insert(...)`로 쓰고,
  푸시 알림은 별도로 백엔드 `/api/notify/teacher-message`를 호출해서 트리거함(테이블
  쓰기 자체는 backend를 거치지 않음 — RLS가 이미 막아주므로).
- `push_subscriptions` — 기기별 웹 푸시 구독 정보(`endpoint`/`p256dh`/`auth_key`, `endpoint`
  유니크). RLS는 본인 것만 읽기/쓰기/삭제(진짜 제한). 실제 발송은 백엔드가 서비스 롤로 조회해서
  하므로 이 RLS는 프론트의 구독/해지 호출에서만 의미 있음. 2026-07-15 신설.
- `post_likes`(2026-07-16 신설, 자유게시판 좋아요) — `post_id`(FK→posts, cascade)/`student_id`/
  `user_id`, `(post_id,student_id)` PK. 처음엔 `posts.like_count` 정수 컬럼 + 증감 RPC로
  만들었었는데, "누가 눌렀는지" 요구사항이 생기면서 `notice_poll_votes`와 동일한 패턴(참가자별
  행 + SELECT는 전체 공개 `true`, INSERT/DELETE는 `auth.uid()=user_id`)으로 교체함 —
  `like_count` 컬럼과 `toggle_post_like()` 함수는 삭제됨(더 이상 없음). 좋아요 수/좋아요
  누른 사람 목록 둘 다 이 테이블만으로 클라이언트에서 계산(`boardLikesMap`).
- `notifications.source_id`(2026-08-26 추가) — 이 알림을 만들어낸 **원본 id**(댓글 id / DM
  메시지 id / 글 id). `ref_id`는 "묶어서 읽음 처리"용이라 글·방 단위라서 알림 하나를 콕 집을
  수 없어서 따로 뒀다. 원본을 지울 때 그 알림만 지우는 데 쓴다(purge_* 함수).
- `post_polls`/`post_poll_votes`(2026-08-26 신설, **게시글 비밀 투표**) — `post_polls`는
  `post_id`(FK→posts, cascade, 유니크 = 글당 투표 하나)/`question`/`options`(jsonb 배열),
  `post_poll_votes`는 `(poll_id,student_id)` PK + `user_id`/`option_index`.
  ⚠️ **`notice_poll_votes`와 RLS 설계가 다르다** — 공지 투표는 SELECT가 `true`(전체 공개)라
  프론트가 이름을 안 그려도 개발자도구로 누가 뭘 골랐는지 다 보인다. 게시글 투표는 "비밀
  투표"가 요구사항이라 **SELECT를 `auth.uid()=user_id`(내 표만)로 잠갔고**, 선택지별 표 수는
  security definer 함수 **`post_poll_results(pids uuid[])`** 로만 내보낸다(집계만 반환).
  그래서 누가 뭘 골랐는지는 글쓴이도 운영자도 알 수 없다.
- `dm_rooms`/`dm_participants`/`dm_messages`(2026-07-16 신설, 학생 간 DM 기능) — 1:1은
  `is_group=false`, 단톡방은 `is_group=true`+`name`(선택). `dm_participants`는
  (room_id,student_id) 복합 PK로 참가자를 기록하고 `last_read_at`으로 읽음 여부를 계산.
  세 테이블 모두 "참가자만 보고 쓸 수 있음"을 진짜 RLS로 강제하는데, `dm_participants`
  SELECT 정책이 자기 자신을 서브쿼리하면 "infinite recursion" 에러가 나서(정책 평가 중
  같은 테이블을 다시 조회) `is_dm_participant(room_id,user_id)` SECURITY DEFINER 함수로
  우회함 — 이 프로젝트에서 이런 다인원 멤버십 기반 RLS를 만들 때 표준으로 참고할 패턴.
  이 함수는 REST RPC로 익명 호출은 안 되게 `public`과 `anon` 양쪽 다 execute를 revoke하고
  `authenticated`에만 부여함(정책 평가 자체에는 필요, 프론트에서 직접 rpc()로 호출하지는
  않음). **`REVOKE ... FROM PUBLIC`만으로는 부족함** — Supabase 프로젝트는 `public` 스키마에
  새로 만든 함수에 기본적으로 `anon` 롤에도 별도의 직접 GRANT를 자동으로 붙여주기 때문에,
  PUBLIC pseudo-role에서만 회수하면 `anon`은 여전히 실행 가능한 상태로 남는다(Supabase
  보안 어드바이저가 `anon_security_definer_function_executable`로 잡아줌) — 새 SECURITY
  DEFINER 함수를 만들 때마다 `revoke execute ... from public` **그리고**
  `revoke execute ... from anon`을 둘 다 해줘야 함. `is_dm_room_creator(room_id,user_id)`
  라는 두 번째 헬퍼 함수도 있는데, 이유는 아래 "겪은 문제" 참고.
  - **겪은 문제 (RLS + INSERT...RETURNING 순환)**: `dm_rooms`를 만들 때 프론트가
    `.insert(...).select().single()`로 방금 만든 행을 돌려받으려 했는데, 계속
    "new row violates row-level security policy for table dm_rooms" 에러가 났음(INSERT의
    WITH CHECK 자체는 분명 통과하는데도). 원인은 Postgres의 문서화된 동작 — `INSERT ...
    RETURNING`은 새로 만든 행이 그 테이블의 **SELECT 정책도 통과해야** 실제로 반환되고,
    SELECT 정책이 이걸 거부하면(RETURNING을 요청했으므로 조용히 0행 반환이 아니라) 이
    RLS 위반 에러를 던짐. `dm_rooms`의 SELECT 정책은 "참가자만 조회"인데, 방을 막 만든
    시점엔 아직 `dm_participants`에 아무도(만든 사람 자신조차) 없어서 방금 만든 방이
    본인에게도 안 보였던 것 — 이후 `dm_participants`에 참가자 행을 넣는 다음 단계가
    있어야 비로소 보이는데, 그 전에 `.select()`로 즉시 돌려받으려 한 게 문제. 해결은 방
    `id`를 `crypto.randomUUID()`로 **클라이언트에서 미리 만들어서** 넣고, insert에서
    `.select()`를 아예 빼서 RETURNING 자체를 요청하지 않는 것(어차피 id를 이미 알고
    있으니 되돌려 받을 필요가 없음). 같은 이유로 `dm_participants`의 "방 생성자가 초대"
    분기도 `dm_rooms`를 직접 서브쿼리했더니 똑같이 막혔음(자기가 막 만든 방이 아직
    자기한테도 하나 안 보이는 상태라 서브쿼리가 0건) — `is_dm_room_creator()`
    SECURITY DEFINER 함수로 감싸서 이 서브쿼리만 RLS를 우회하게 해서 해결. **교훈: RLS
    정책(또는 그 정책이 참조하는 다른 테이블의 RLS)이 "지금 막 쓰려는 그 행/참가자 관계"
    자체에 의존하는 순환 구조라면, INSERT 직후 `.select()`로 되돌려 받거나 다른 테이블을
    직접 서브쿼리하지 말고 SECURITY DEFINER 헬퍼 함수를 쓰거나 미리 계산 가능한 값(id
    등)을 클라이언트에서 준비해둘 것.**
  캠스터디 채팅(소켓 기반 실시간)과 달리 DM은 teacher_messages와 같은 저장형+폴링
  방식(7초 간격, DM 페이지가 열려 있을 때만) — 새 인프라 없이 기존 패턴 재사용.
  사진 첨부는 `dm-photos` 스토리지 버킷에 저장하는데, board-photos/avatars와 달리
  **비공개 버킷**(`public:false`, 10MB 제한)이고 경로를 `{room_id}/파일명`으로 둬서
  storage RLS가 `is_dm_participant(경로의 첫 폴더::uuid, auth.uid())`로 업로드/조회/삭제를
  참가자로만 제한함 — `image_url` 컬럼엔 실제 URL이 아니라 이 storage 경로만 저장되고,
  프론트가 렌더링 시점마다 `createSignedUrls()`로 1시간짜리 서명URL을 발급해서 보여줌
  (대화 내용이 다른 게시판 사진처럼 URL만 알면 아무나 볼 수 있는 공개 상태가 되면 안 되므로).

## 주요 기능 (커밋 이력 기반)
- 로그인 / 사용자 관리 (관리자 탭에서 계정 생성·삭제·비밀번호 초기화·등록기기 초기화)
- DM (2026-07-16 신설) — 학생 간 1:1 대화 + 단톡방(그룹 채팅), 사진 첨부 지원. 사이드바
  "실시간" 그룹에 위치, 안 읽은 메시지 있으면 점 배지 표시
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
> 최신 5건만 둡니다. 그 이전 95건은 [docs/CHANGELOG.md](docs/CHANGELOG.md)에 있어요.
> 새 기록은 이 줄 바로 아래에 추가하고, 6번째로 밀려난 항목은 CHANGELOG 맨 위로 옮겨주세요.

- 2026-09-05 (53차): **DM 메시지를 꾹 누를 때 글씨가 파랗게 선택되던 것 해결**(제보: "모바일에서
  꾹 누르면 글씨가 파란색으로 선택되네"). `SW_BUILD`도 `2026-09-05-53`으로 올림. DB 변경 없음.
  - `.dm-msg-row`에 `-webkit-touch-callout:none`만 있고 `user-select`가 없어서, 길게 누르면
    브라우저 기본 텍스트 선택(파란 하이라이트 + 확대경)이 그대로 떴다.
  - 꾹 누르기 메뉴가 붙는 건 **내 메시지뿐**이라 `.dm-msg-row.mine`에만
    `user-select:none`을 준다. 남이 보낸 메시지는 그대로 드래그 복사가 된다.
  - 내 메시지도 복사는 할 수 있어야 하므로 메뉴에 **📋 복사**를 추가(`copyDmMessage()` —
    `navigator.clipboard.writeText`, 막힌 브라우저용 `execCommand` 예비 수단).
  - 수정 중에는 입력칸 안에서 선택이 돼야 해서 `.dm-msg-row.mine .inline-edit-textarea`는
    `user-select:text`로 되돌린다.
  - 메뉴 위치 보정이 `menuH=msg.content?86:44`처럼 손으로 계산한 높이를 쓰고 있었다 —
    항목이 늘면 어긋나므로 `getBoundingClientRect()`로 실제 크기를 재서 보정하게 바꿨다.
  - 검증: 내 메시지 `user-select:none` / 남의 메시지 `auto`, 메뉴 3항목, 화면 오른쪽 아래
    구석에서도 안 잘림, 사진 메시지는 삭제만, 복사 동작과 토스트, 수정 중 입력칸은 선택 가능.
- 2026-09-05 (52차): **구간을 줄여도 공부 시간이 안 줄어들던 버그 수정**(제보 + 스크린샷:
  구간은 6:40~8:15인데 표시는 2:05:04). `SW_BUILD`도 `2026-09-05-52`로 올림.
  - **원인**: `loadTodaySessions()`의 `task.seconds=Math.max(task.seconds,dbSec)`.
    진행 중인 타이머의 아직 안 써진 시간을 화면에서 잃지 않으려던 장치인데, **모든** 태스크에
    걸려 있어서 DB가 줄어도(구간 축소·삭제) 화면 값이 절대 안 내려갔다. DB는 5700초로
    제대로 저장돼 있었고 화면만 옛 7504초를 붙들고 있던 것.
  - 수정: 메모리 우선은 **지금 타이머가 도는 그 태스크에만** 적용한다. 그 태스크는 진행 중인
    행이 DB에 0초로 있으므로 `activeTimer.prevSeconds`를 나머지 구간 합으로 다시 잡아준다 —
    덕분에 타이머를 켠 채 지난 구간을 고쳐도 다음 tick에 반영된다.
  - **같이 고친 것**: `saveRecordRow()`가 `duration_seconds`만 바꾸고 `accumulated_seconds`는
    옛 값을 남겨뒀다. 지금은 이어받기 경로가 `ended_at is null`인 행만 봐서 드러나지 않지만,
    그 행이 다시 읽히면 없던 시간이 되살아난다. 이제 저장·추가 시 `accumulated_seconds`를
    같이 맞추고 `start_timestamp`를 비운다.
  - **데이터 정리 마이그레이션 `fix_stale_accumulated_seconds`**: 이미 어긋나 있던 끝난 기록
    123행(그중 21행은 누적이 더 큼, 최대 27,129초 = 7.5시간 차이)의 `accumulated_seconds`를
    `duration_seconds`로 맞췄다. 표시에 쓰는 값은 `duration_seconds`라 기록 시간은 안 바뀐다.
  - 검증: 버그 상황 재현(메모리 7504 vs DB 5700 → 02:05:04) 후 수정본에서 01:35:00으로 내려감,
    30분으로 더 줄이면 00:30:00, 구간 전부 삭제 시 00:00:00, 타이머 도는 중엔 진행분(5760) 유지
    + `prevSeconds` 재계산(5700), 도는 중 지난 구간 축소 시 `prevSeconds`가 1800으로 따라옴,
    저장 payload에 `accumulated_seconds`·`start_timestamp` 포함까지 확인.
- 2026-09-05 (51차): **같은 사람과 1:1 채팅방이 여러 개 생기던 버그 수정**(제보 + 스크린샷:
  곽승철과의 방이 3개 보임). `SW_BUILD`도 `2026-09-05-51`로 올림.
  - **원인**: 중복 방지가 `createDmRoom()` 안의
    `dmRooms.find(r=>!r.is_group&&r.participants.some(...))` 뿐이었다. `dmRooms`는 **내
    브라우저에 들고 있는 목록**이라 ① 목록이 오래됐거나 ② 상대가 다른 기기에서 먼저
    만들었거나 ③ 둘이 동시에 눌렀을 때 그대로 뚫린다. DB에는 아무 제약이 없었다.
  - **DB 마이그레이션 `dedupe_dm_rooms`**
    - 참가자 조합이 같은 1:1 방들을 합쳤다. 남길 방은 **메시지가 가장 많은 방**(같으면 먼저
      만들어진 방)이고, 나머지 방의 메시지와 `notifications.ref_id`를 그쪽으로 옮긴 뒤 방을
      지웠다. 실제로 `{30122, ksc}` 4개 → 1개(메시지 9개 유지), `{30116, 30122}` 2개 → 1개.
    - `get_or_create_dm_room(p_other)` 신설(security definer). 참가자 조합으로 기존 방을
      찾고 없을 때만 만든다. **같은 쌍에 대한 동시 호출은 `pg_advisory_xact_lock`으로 막아서**
      두 사람이 같은 순간에 눌러도 방이 하나만 생긴다. 자기 자신·없는 계정은 거부.
  - 프론트: 1:1은 이 RPC로 열고(그룹 생성 경로는 그대로), 이미 있던 방을 찾아온 경우엔
    메시지도 참가자도 그대로라 변경 감지 지문이 안 바뀌어 목록이 갱신되지 않는다 —
    `dmRoomsFingerprint=''`로 비워 강제로 다시 그린다.
  - 같이 고친 것: 단톡방 생성 시 명단에서 못 찾은 사람을 **조용히 건너뛰던** 코드
    (`if(u)rows.push(...)`) 때문에 초대한 줄 알았는데 빠진 방이 만들어질 수 있었다. 이제는
    방을 만들지 않고 오류로 알려준다.
  - 남겨둔 것: 참가자가 0~1명인 유령 방(양쪽 다 "나가기"를 눌러 `dm_participants` 행이
    사라진 방). RLS상 아무에게도 안 보여서 건드리지 않았다.
  - 검증: 실제 DB에서 같은 상대 두 번 호출 시 같은 방(방 개수 15 → 15, 메시지 9개 유지),
    양쪽에서 각각 호출해도 같은 방, 자기 자신·없는 학번 차단, 새 쌍이면 정상 생성.
    프론트에서 4번 연속 눌러도 1개, 목록이 빈 상태(옛 버그 조건)에서도 안 늘어남,
    동시 호출에도 안 늘어남, 목록이 항상 다시 그려짐까지 확인.
- 2026-09-05 (50차): **단톡방 이름 바꾸기** + **마이페이지 "내 활동"·"업데이트 내역" 접기**
  (요청: "단톡방 이름도 바꾸게 해줘", "마이페이지에서 내 활동과 업데이트 내역은 접었다 펴는
  형식으로"). `SW_BUILD`도 `2026-09-05-50`으로 올림.
  - **DB 마이그레이션 `rename_dm_room`**. `dm_rooms`에는 SELECT/INSERT 정책만 있고 UPDATE
    정책이 아예 없어서 프론트에서 update를 쏴도 조용히 막혔다. 정책을 그냥 열면 참가자가
    `is_group`·`created_by`까지 바꿀 수 있으므로, **name만 건드리는 security definer 함수**
    `rename_dm_room(p_room, p_name)`으로만 열었다(참가자 확인 + 단톡방 확인 + 앞뒤 공백 정리
    + 40자 자르기 + 빈 값이면 null). `authenticated`에만 execute 부여.
  - **지문(fingerprint) 버그도 같이 고쳤다.** `loadDmRooms()`는 "가장 최신 메시지 id + 내
    읽음 상태"로 변경을 감지해 무거운 조회를 건너뛰는데, 이름 변경은 메시지를 만들지 않아서
    **다른 참가자 화면에는 새 이름이 영영 안 내려갔다.** 지문에 방 이름 목록을 넣어서
    (`dm_rooms.select('id,name')` 한 번 추가) 폴링 때 반영되게 했다.
  - UI: 채팅방 정보 창에 "✏️ 단톡방 이름 바꾸기"(단톡방일 때만) → 인라인 입력칸.
    저장하면 헤더·정보 제목·목록을 즉시 갱신하고, 비우면 참여자 이름을 이어붙인 기본
    이름으로 돌아간다.
  - **마이페이지 접기**: `.mp-collapse` / `.mp-collapse-head` / `.mp-collapse-body` 패턴.
    기본은 접힘이고 편 상태는 `localStorage['mp-open-<key>']`에 기억한다
    (`toggleMypageSection()` / `initMypageCollapse()`).
    "내 활동"은 서버 조회가 필요해서 **펼칠 때 처음 한 번만** `loadMyActivity()`를 부른다
    — 마이페이지를 열 때마다 무조건 부르던 것을 없앤 셈이라 로딩도 조금 가벼워졌다.
  - 검증: 실제 DB에서 참가자 변경(공백 정리 확인)·비참가자 차단·1:1 방 차단, 프론트에서
    이름 변경/비우기/40자 초과/1:1 방엔 메뉴 없음/남이 바꾼 이름이 폴링으로 내려옴,
    접기 기본 상태·토글·localStorage 유지·새로고침 후 복원·중복 조회 안 함까지 확인.
- 2026-09-05 (49차): **실모반 참여 조사형 투표** + **공지 의견내기(댓글)**(요청: "실모반
  공지를 올릴 때 투표를 다르게 — 국어만/수학만/불참/둘 다로 구성하고 국어·수학 선택과목도
  고르게", "공지에 의견내기 기능, 익명 없이"). `SW_BUILD`도 `2026-09-05-49`로 올림.
  - **DB 마이그레이션 `simo_poll_and_notice_comments`**
    - `notice_polls.kind` (text, 기본 'simple'). `'simo'`면 선택지가 고정이다.
    - `notice_poll_votes.meta` (jsonb) — 표마다 `{kor, math}` 선택과목을 같이 담는다.
    - `notice_comments` 테이블 신설(notice_id/user_id/student_id/author_name/content).
      **익명이 없는 게 요구사항이라 `is_anonymous` 컬럼 자체를 두지 않았다.** RLS는 읽기
      `not is_external()`, 쓰기·수정은 본인, 삭제는 본인 또는 `is_staff()`.
  - **실모반 참여 조사**: 선택지는 `SIMO_POLL_OPTIONS`(국어만 참여/수학만 참여/둘 다 참여/
    불참)로 고정. `SIMO_NEEDS_KOR=[0,2]`, `SIMO_NEEDS_MATH=[1,2]`에 따라 필요한 선택과목
    칸만 나타난다. 기본값은 계정의 `user_metadata.suneung_kor/suneung_math`.
    - 칩을 누를 때마다 저장하지 않고 `simoDraft`에 들고 있다가 "제출하기"로 한 번에 쓴다 —
      선택과목이 빠진 반쪽 표가 생기지 않게 하려고.
    - 결과에는 참여 유형별 인원·이름(이름 옆에 선택과목)과, `simoBreakdown()`으로 낸
      국어/수학 선택과목별 인원 집계가 같이 나온다. "다시 고르기"로 되돌아갈 수 있다.
    - 공지 작성 화면은 **대상이 실모반일 때만** "투표 종류"가 뜨고, 참여 조사를 고르면
      선택지·복수 선택 입력칸이 숨는다(`syncPollKindVisibility()`/`syncPollKind()`).
      실모반 공지라도 일반 투표는 그대로 쓸 수 있다.
  - **공지 의견내기**: 공지 본문 아래 `.notice-comment-section`. 게시판 댓글과 달리 익명
    체크박스도 대댓글도 없다(실명 고정). 의견을 달아도 공지 전체를 다시 그리지 않고
    `refreshNoticeCommentSections()`로 그 영역만 갈아끼운다 — 안 그러면 펼쳐둔 공지가 접힌다.
    삭제는 본인 또는 스태프.
  - 테스트 스텁: `insert`가 `__rows`에도 반영되게 고쳤다(그 전엔 등록해도 목록이 안 늘어서
    "등록하면 바로 보이는지"를 확인할 수 없었다).
  - 검증: 조사 화면(선택과목 칸이 유형에 따라 나타남/불참이면 안 뜸/기본값이 계정 값), 제출
    payload(`meta:{kor,math}`), 결과 집계와 이름 옆 선택과목, 다시 고르기·응답 취소, 작성
    폼의 종류 전환과 기본 질문, 실모반+일반 투표 병행, 의견 등록·삭제 권한·빈 입력 무시·
    공지 펼침 유지까지 확인.

## AI 에이전트를 위한 안내
- 이 프로젝트에서 작업할 때는 `index.html` 하나에 모든 로직이 들어있다는 점을 유념할 것
  (프론트엔드 프레임워크 없이 바닐라 JS/HTML/CSS)
- 백엔드 코드는 이 저장소에 없으므로, 백엔드 관련 요청이 오면 별도 위치에서 작업 중인지
  사용자에게 확인할 것
- 의미 있는 변경(새 기능, 구조 변경, 버그 수정 등)을 했다면 이 파일의
  "최근 변경사항" 섹션 최상단에 추가할 것. 그 섹션은 **최신 5건만** 두고, 6번째로 밀려난
  항목은 `docs/CHANGELOG.md` 맨 위로 옮길 것 (이 파일이 다시 300KB로 불어나지 않게)
- `docs/CHANGELOG.md`는 **통째로 읽지 말 것** — 320KB라 컨텍스트를 크게 잡아먹는다.
  옛 결정의 이유를 찾을 때만 `grep -n`으로 줄 번호를 찾아 그 주변만 볼 것
- **배포할 때마다 반드시 함께 할 것 (3종 세트)**:
  1. `sw.js`의 `SW_BUILD`를 새 값으로 올린다(안 올리면 사용자에게 새 버전이 안 내려간다).
  2. `index.html`의 `APP_UPDATES` 맨 위에 **같은 `v` 값으로** 한 항목을 추가한다 —
     사용자가 접속하면 "뭐가 바뀌었는지" 팝업으로 알려주는 목록이다. 사용자가 읽을 문장으로
     쓰고(파일명·함수명·RLS 같은 내부 용어 금지), 눈에 보이는 변화가 없는 리팩터링만 한
     배포라면 이 항목은 생략해도 된다.
  3. 이 파일의 "최근 변경사항"에 개발자용 상세 기록을 남긴다(위 항목).
