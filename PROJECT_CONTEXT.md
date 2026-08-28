# 부광고 3-1 대시보드 — 프로젝트 컨텍스트

> 이 파일은 새 채팅방/다른 AI 에이전트(Claude, Gemini, DeepSeek 등)에서 작업을 이어갈 때
> 맥락을 파악하기 위한 문서입니다. **개발 중 의미 있는 변경사항이 생기면 이 파일의
> "최근 변경사항" 섹션을 갱신해주세요.**

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
- 2026-08-28 (34차): **리락쿠마(베이지) 테마가 사라지던 문제 해결**(제보: "리락쿠마 배경 어디감?").
  `sw.js`의 `SW_BUILD`도 `2026-08-28-34`로 올림. `index.html`만 수정.
  - **원인**: 테마 설정은 계정이 아니라 **기기(localStorage)** 에 저장되는데, 공용 기기에서
    남의 테마가 그대로 보이는 걸 막으려고 `initApp()`이 **rrkm이 아닌 계정으로 로그인하면
    저장값을 지워버리고 있었다**(`theme='light'`, `bearDecor` 삭제). 그래서 주인이 다시
    로그인해도 테마가 꺼진 채로 남았다.
  - **고침**: 지우는 대신 `bearThemeSaved`에 잠시 옮겨뒀다가(`syncBearThemeForAccount()`),
    허용된 계정이 다시 로그인하면 그대로 되살린다. 본인이 마이페이지에서 직접 켜고 끄면
    그 선택이 자동 복원에 덮이지 않도록 보관본을 버린다.
  - **사용 계정 확대**: `BEAR_THEME_ACCOUNTS = ['rrkm', 30122]` — 제작자 계정에서도 쓸 수 있게
    했다. 노출 조건도 `currentStudentId==='rrkm'` 하드코딩 3곳을 `canUseBearTheme()` 하나로 통일.
  - 검증: rrkm이 켠 뒤 → 30110 로그인(꺼짐+보관) → 30122 로그인(되살아남) → 직접 끄면 유지 →
    새로고침 후에도 유지되는 것까지 Playwright로 확인.
- 2026-08-28 (33차): **캠스터디 복구 — Socket.IO를 걷어내고 Supabase Realtime으로 재구현**
  (요청: "슬슬 캠스터디 복구 ㄱㄱ"). `sw.js`의 `SW_BUILD`도 `2026-08-28-33`으로 올림.
  엣지 함수 **`study` 신설(v2)** + 마이그레이션 `realtime_authorization_camstudy_and_timer`.
  - **원인 정리**: 2026-08-14에 Railway가 내려가면서 상시 연결 서버가 사라졌고, 캠스터디는
    입장 버튼이 "서버 이전 작업 중" 토스트만 띄우는 상태였다. 기기 간 타이머 동기화(폰↔PC)도
    같은 이유로 죽어 있었다(60초 폴링만 남아 있었음).
  - **실시간(채팅·참가자 수·타이머 동기화) → Supabase Realtime private 채널**. 새 서버가
    필요 없고, **접근 권한을 DB가 판정**한다 — `realtime.messages`의 RLS가
    `public.realtime_topic_allowed(topic)`로 `camstudy`(3-1 계정만)와 `timer:<auth uid>`
    (본인만)만 열어준다. 3-1/타반/남의 타이머 토픽을 SQL 롤 전환으로 직접 검증했다
    (3-1 camstudy ✔, 3-1 남의 timer ✘, 타반 camstudy ✘).
    - 참가자 수는 **프레즌스**로 센다(같은 학생이 폰+PC로 붙어도 1명). 입장/퇴장 안내 문구도
      상대가 보낸 payload를 믿지 않고 프레즌스 이벤트로 이쪽에서 만든다.
    - 같은 계정이 다른 기기에서 나중에 입장하면 먼저 있던 쪽이 자동으로 나간다(예전
      `force-leave-study`와 동일).
    - ⚠️ **한계**: 채팅이 서버를 안 거치므로 닉네임 위조까지는 못 막는다(예전엔 서버가 닉네임을
      붙여줬음). 3-1 계정만 들어올 수 있는 채널이라 감수하고, 받은 값은 길이 제한 + escHtml.
  - **영상(JaaS) → 엣지 함수 `study`**. `study/join`이 예전 서버의 `makeJaasToken()`과 **완전히
    같은 payload**의 JWT를 RS256으로 서명한다(`jsonwebtoken` 없이 Web Crypto로). 콘솔에서 받은
    키가 PKCS#1이어도 되도록 PKCS#8로 감싸는 코드를 넣었고, 서명 결과를 Node에서 실제 RSA
    키 2종(PKCS#8/PKCS#1)으로 검증했다. 권한 판정은 예전과 동일(운영자/교사 또는 `cam_allowed`)
    + 타반 계정 차단.
  - ⚠️ **영상은 시크릿을 넣어야 켜진다**: Supabase → Edge Functions → Secrets에
    `JAAS_APP_ID`, `JAAS_API_KEY`(= JWT의 kid), `JAAS_PRIVATE_KEY`를 등록해야 한다
    (https://jaas.8x8.vc → API keys). Railway가 사라지면서 예전 값이 같이 없어졌다.
    등록 전까지는 `study/join`이 503 `not_configured`를 주고, 앱은 **"채팅 전용"으로 입장**시켜
    채팅·참여 인원만이라도 쓰게 한다(캠스터디 페이지 상단에 안내 배너도 뜬다).
  - 검증: Playwright로 페이지 진입 → 입장 → 프레즌스 2명 → 채팅 송수신(XSS 문자열 이스케이프
    확인) → 퇴장 → 페이지 이탈 시 채널 정리 → 타이머 채널 브로드캐스트까지 확인했고, 폰(390px)
    ·태블릿(820px)에서 가로 스크롤 없음을 확인했다. 엣지 함수는 `pg_net`으로 401/404/health를
    직접 호출해 확인(에이전트 프록시가 `*.supabase.co` 직접 호출을 막아서 SQL에서 호출).
  - 참고: 지금 캠스터디 이용이 허용된 계정은 **30101/30107/30110/30113/30114 + 선생님/운영자**
    뿐이다(`user_roles.cam_allowed`). 더 열려면 관리자 탭에서 학생별로 허용해야 한다.
- 2026-08-27 (32차): **계정 삭제가 사실상 항상 실패하던 것 수정**(제보: "계정 삭제 기능이 잘
  안되더라"). `index.html` 변경은 없고 **DB 마이그레이션 + 엣지 함수 v17**로만 고침.
  - **원인**: `auth.users`를 가리키는 외래키 6개가 `ON DELETE NO ACTION`이어서
    `auth.admin.deleteUser()`가 통째로 막혀 있었다. 특히 **로그인할 때마다 쓰여지는
    `user_profiles`** 때문에 실질적으로 모든 계정이 삭제 불가였다. 롤백되는 트랜잭션 안에서
    실제로 재현함 — `23503: update or delete on table "users" violates foreign key constraint
    "user_profiles_user_id_fkey"`.
  - **마이그레이션 `fix_account_delete_blocked_by_fks`**: 개인 데이터 5개
    (`user_profiles.user_id`, `post_verifications.user_id`, `notice_poll_votes.user_id`,
    `study_routines.user_id`, `dm_active_viewers.user_id`)는 `ON DELETE CASCADE`,
    `notice_polls.created_by`는 **`ON DELETE SET NULL`**(공지 투표는 만든 사람이 지워져도
    학급 투표 결과가 남아야 하므로). 적용 후 같은 재현 테스트에서 삭제가 통과함.
  - **엣지 함수 v17 `delete-user` 재작성**: 외래키가 없어 CASCADE가 안 먹는, **학번만 들고 있는
    표들**(`DELETE_BY_STUDENT_ID` = user_roles/user_devices/user_profiles/dm_participants/
    dm_active_viewers/post_likes/post_verifications/post_poll_votes/simo_members/
    teacher_messages/study_routines)과 `notifications`(recipient_student_id 기준)를 함께 정리한다.
    한 표가 실패해도 나머지는 계속 진행(`Promise.allSettled`)하고 실패한 표 이름을
    `cleanup_failed`로 돌려준다. ⚠️ **`notices`(공지)는 일부러 제외** — 선생님/운영자 계정을
    지워도 학급 공지는 남아야 한다.
  - 부수적으로: **본인 계정은 못 지우게** 막고, 계정이 이미 없으면 404로 끝내는 대신
    **남은 기록만 정리하고 알려준다**(예전엔 중간에 실패해 "계정은 없는데 기록만 남은" 상태를
    손으로 고칠 방법이 아예 없었다).
- 2026-08-26 (31차): **타반 계정 정리 — 공부인증/시험회고 숨김 + 상관없는 알림 차단 + DM에
  3-1 학생 안 뜨게**, 그리고 **인기글 기준 3개 → 5개**.
  `sw.js`의 `SW_BUILD`도 `2026-08-26-31`로 올림. 엣지 함수 **v16**.
  - ⚠️ **이 세 건의 공통 원인**: 타반 판정을 `is_external`만으로 하던 코드가 곳곳에 남아 있었다.
    **클래스(class_id)에만 넣고 is_external을 안 켠 계정**은 그 분기를 전부 그냥 지나쳤다.
    이제 프론트는 `isExternalAccount()`(= is_external **또는** class_id), 백엔드는
    `classRosterIds()`가 같은 기준으로 판정한다.
  - **공부인증/시험회고**: 사이드바 메뉴(`#nav-study-board`)를 숨기고, `CLASS_ONLY_PAGES`
    목록을 `navigate()`가 검사해 알림 링크·저장된 마지막 페이지로도 못 들어가게 막았다
    (메뉴만 숨기면 그 경로들로는 그대로 열렸다).
  - **알림**: 학급 전체로 뿌리는 알림(공지 전체·공부인증·캠스터디)의 수신자 명단을
    `classRosterIds()`로 바꿔 타반 계정을 제외한다. `insertNotifications`의 "명단 미지정 =
    학급 전체" 경로도 같은 함수를 쓴다. 이미 쌓여 있던 **81건**은 SQL로 정리했다.
  - **DM 상대 목록**(`loadDmRoster`): 타반 계정은 멘토 1명만 보이고, 3-1 학생 쪽에서도
    타반/클래스 계정이 안 보인다(내가 멘토인 경우만 예외). `.or()` 필터 대신 user_roles를
    통째로 받아 클라이언트에서 거르는 이 파일의 기존 컨벤션을 따랐다.
  - **인기글 기준**: `HOT_SCORE` 3 → **5**(안내 문구도 함께 수정).
  - 검증: 3-1 학생 / 타반(is_external) / 클래스(class_id만) 세 계정으로 메뉴 노출·페이지 이동
    차단·DM 목록을 각각 확인했다.
- 2026-08-26 (30차): **폰에서 열품타 화면이 오른쪽으로 잘리던 문제 수정**(제보 스크린샷:
  과목 카드의 + 버튼과 일지 시간이 잘리고 페이지에 가로 스크롤이 생김).
  `sw.js`의 `SW_BUILD`도 `2026-08-26-30`으로 올림.
  - **원인**: `.planner-layout`은 그리드인데 **그리드/플렉스 칸의 기본값이 `min-width:auto`**라,
    칸 안의 요소 하나(여기선 과목 색상 `<select>`의 긴 옵션 글자)의 최소 너비가 칸 전체를
    넓혀버린다. 폰(390px)에서 `.planner-left`가 422px가 되면서 페이지 전체가 밀렸다.
    → `.planner-layout>*` 등 격자 칸에 `min-width:0`을 줘서 해결(body 스크롤폭 438→390).
    ⚠️ **27차 UI 점검에서 못 잡은 이유**: 그때는 테스트 데이터가 비어 있어서 과목/과제/일지가
    하나도 렌더되지 않았다. **앞으로 반응형 점검은 실제 데이터를 넣고 할 것.**
  - **떠 있는 타이머 배지**도 화면 밖으로 나가 있었다. 위치 복원(`restorePos`)이 앱 시작 시
    배지가 **숨겨진 상태(offsetWidth=0)** 에서 계산돼 기본값 220px로 잡혔는데, 실제 배지는
    과제 이름 때문에 그보다 훨씬 넓었던 것. 이제 배지가 **보이거나 이름이 바뀔 때**
    (`clampTimerBadgeIntoView()`) 다시 화면 안으로 넣고, `max-width:calc(100vw - 16px)` +
    이름 말줄임 + 폰 전용 여백 축소도 함께 적용.
  - 곁들여 정리한 것:
    - 통계 바(5칸)가 폰에서 3+2로 나뉘며 세로 구분선이 빈칸 옆에 덩그러니 남던 것 → 줄 끝
      세로선 제거 + 첫 줄 아래 가로선.
    - "열품타 사용법" 안내 카드가 폰 첫 화면을 통째로 덮던 것 → **한 번도 접거나 펼친 적 없는
      사람만** 좁은 화면에서 기본 접힘(직접 펼친 선택은 그대로 존중).
    - 할 일 행의 이름 자리가 72px밖에 안 남던 것 → 여백·시간 칸을 줄여 85px로(버튼은 터치
      타깃이라 크기 유지).
- 2026-08-26 (29차): **성능 최적화 — 측정해서 나온 병목만 고침**(요청: "코드가 길어지니까
  렉도 좀 걸리는거 같다"). `sw.js`의 `SW_BUILD`도 `2026-08-26-29`로 올림.
  - **먼저 측정했다**(Playwright + CDP 프로파일러, 폰 화면 + CPU 4배 감속):
    - 로드 시간의 대부분은 앱 코드가 아니라 **`(program)` 888ms = 707KB짜리 index.html의
      HTML/CSS/JS 파싱**이었다. 우리 함수들의 자기시간은 다 합쳐도 10ms 미만.
    - 유휴 상태 10초 동안 롱태스크 0건 — 주기 타이머들은 이미 `document.hidden`/페이지 활성
      여부로 잘 막혀 있었다.
  - **① 앱 셸 캐싱(가장 큰 실사용 효과)**: 서비스워커에 `install` 프리캐시 +
    stale-while-revalidate `fetch` 핸들러를 넣었다. 예전엔 캐시가 아예 없어서 **앱을 열 때마다
    707KB를 다시 받았다**(모바일 데이터·느린 와이파이에서 그대로 렉).
    ⚠️ **외부(Supabase API 등) 요청은 origin 검사로 아예 안 건드린다** — 데이터가 캐시되면
    이 앱은 쓸모없어진다. `sw.js` 자신도 캐시 제외(새 버전 감지가 막히므로).
    캐시 이름에 `SW_BUILD`가 들어가 배포마다 새 캐시가 생기고 옛 캐시는 activate에서 삭제된다.
    검증: 네트워크로 index.html을 **완전히 차단한 채 새로고침해도 앱이 정상적으로 뜬다**.
  - **② 전체화면 타이머 과목 목록(`renderTfSubjectList`)**: 1초마다 innerHTML을 통째로 비우고
    과목/과제 행 + SVG 아이콘까지 새로 만들고 있었다(몇 시간 켜두는 화면 = 시간당 3600번).
    구성이 그대로면 시간 텍스트·막대 길이만 갱신하도록 바꿈 — **100회 렌더 52ms → 5ms**.
    (`renderTfRankGrid`는 예전에 같은 이유로 이미 고쳐져 있었다 — 같은 패턴을 따랐다.)
    진행바는 루프 안에서 `innerHTML+=`로 붙여 매 줄마다 앞부분을 다시 파싱하던 것도 고침.
  - **③ 학습 일지(`renderSessionLog`)**: 열품타에서 타이머가 도는 동안 1초마다 목록 전체를
    다시 그리고 있었다. 같은 방식으로 텍스트만 갱신 — **200회 렌더 15.8ms → 2.6ms**.
  - **④ 카운트다운(`tickCountdown`, 250ms)**: 초 단위 표기인데 250ms마다 텍스트 3개를 쓰고
    시계 캔버스를 다시 그렸다(4번 중 3번은 값이 같음). 값이 바뀔 때만 그리도록.
  - **⑤ 자잘한 것**: `syncScreenWakeLock`(5초마다 영구)이 매번 버튼 DOM을 갱신하던 것 →
    상태가 바뀔 때만. `applyServerTimerTruth` 60초 폴링에 `!document.hidden` 추가(화면이
    돌아올 때 어차피 동기화하므로 정확도 손해 없음).
  - ⚠️ **앞으로 1초마다 도는 렌더 함수를 만들 땐** 이 파일의 패턴을 따를 것: 구조 키를 만들어
    두고 구조가 그대로면 텍스트만 갈아끼우기(`tfListStructKey`/`sessionLogStructKey` 참고).
- 2026-08-26 (28차): **공부인증에 "며칠 자 인증인지" 크게 표시 + 새벽엔 어제로 기본값**
  (요청: "어제꺼를 인증하려고 해도 오늘 12시가 지나버리면 그 날짜로 인증이 되버리는데,
  인증을 올릴때 몇일날 꺼 인증인지 위에 표시"). `sw.js`의 `SW_BUILD`도 `2026-08-26-28`로 올림.
  - 날짜 입력칸(`#sc-date`)은 원래도 있었지만 폼 중간의 작은 date input이라 눈에 안 띄었고,
    기본값이 무조건 오늘이라 자정을 넘겨 인증하면 어제 공부가 오늘 날짜로 박혔다.
  - **글쓰기 맨 위에 날짜 배너**(`.sc-date-banner`): `📅 8월 25일(화) 공부 [어제]` 처럼
    날짜 + 상대 표시(오늘/어제/N일 전)를 크게 띄우고, 바로 아래에 **[어제][오늘] 버튼 +
    날짜 선택 + 학습 기록 불러오기**를 모아놨다.
  - **새벽 기본값**: 0시~5시(`SC_NIGHT_OWL_HOUR`)에 글쓰기를 열면 기본 날짜를 **어제**로 잡고,
    "지금은 자정이 지난 새벽이라 어제 날짜로 맞춰뒀어요"라고 이유를 함께 띄운다.
  - **인증 버튼에도 날짜**를 넣었다(`8월 25일(화) 인증하기`) — 마지막에 누르는 곳에서 한 번 더
    확인되게. (`syncScDateLabel()`이 배너·버튼·어제/오늘 활성 상태를 한 번에 갱신)
  - 초안 복구(`DRAFT_FORMS.studycert.set`)에서도 `syncScDateLabel()`을 불러 복구된 날짜가
    배너에 반영되게 했다.
- 2026-08-26 (27차): **핸드폰·패드 UI 최적화**(요청: "핸드폰과 패드에서 ui 최적화도 부탁해").
  `sw.js`의 `SW_BUILD`도 `2026-08-26-27`로 올림.
  Playwright로 **390px(폰) / 820px(패드 세로) / 1024px(패드 가로) / 1440px(데스크탑)** 에서
  전 페이지를 훑어 화면 밖으로 넘치는 요소를 찾아 고쳤다.
  - **내신 계산기 표**: 폰에서 6칸짜리 가로 표라 가로 스크롤하며 등급을 입력해야 했다.
    ≤640px에서는 과목 한 줄이 카드 하나가 되도록 바꿈(`.calc-table`, td의 `data-label`이
    입력칸 위 라벨이 된다). ⚠️ `.admin-table td`의 border를 이기려고 `.admin-table.calc-table td`로
    특이도를 한 단계 올려놨다(같은 특이도면 뒤에 오는 `.admin-table` 규칙이 이긴다).
  - **월간 캘린더(mcal)**: `min-width:700px` 때문에 폰에서 달력 전체가 가로 스크롤이었다.
    ≤640px에서는 7칸이 화면 폭에 들어가게 줄이고, 좁아서 어차피 못 읽는 할 일 제목 대신
    **색 점만** 남겼다(날짜를 누르면 그 날 일지로 이동).
  - **공부인증 표**: 아이패드 가로(1024px)에서 사이드바를 빼면 폭이 ~760px뿐이라 표
    (min-width 820px)에 가로 스크롤이 생겼다. 카드로 쌓아봤더니 한 건이 한 화면을 다 먹어
    더 답답해서, **835~1100px 구간은 열 너비만 줄여 표를 유지**하도록 했다(카드 전환은 예전대로
    ≤834px).
  - **iOS 확대 방지**: iOS는 글자 16px 미만 입력칸을 누르면 화면을 확대하고 안 돌아온다.
    ≤834px에서 자주 쓰는 입력칸(`.modal-input`, `.comment-input`, `.calc-cell-input` 등)만
    16px로 올렸다.
  - 손가락 터치 영역 보강(`@media(pointer:coarse)`): 답장/수정/삭제 버튼, 투표 선택지,
    채팅방 정보 행, 갤러리 목록 줄.
  - DM 입력줄에 `env(safe-area-inset-bottom)` 여백 — 아이폰 홈 인디케이터에 안 가리게.
  - 대학별 환산점수 표처럼 진짜로 열이 많은 표는 그대로 가로 스크롤을 두되 "옆으로 밀면 더
    보인다"는 안내를 폰에서만 띄운다(`.wide-table-hint`).
- 2026-08-26 (26차): **채팅방 정보 모달 UI 깨짐 수정**(제보: 카드 배경도 없이 글자만 흩어져
  보임). `sw.js`의 `SW_BUILD`도 `2026-08-26-26`으로 올림.
  - 원인: 19차에서 이 모달을 만들 때 `modal-box` / `modal-header` / `modal-body` 클래스를
    썼는데 **이 프로젝트에 없는 클래스**였다. 이 앱의 모달 구조는 `.modal-overlay > .modal`
    하나뿐이고(`.modal`이 흰 카드·패딩·그림자를 담당), `.modal-close`는 float로 오른쪽에
    붙는다. 그래서 카드 배경/여백이 통째로 안 먹었다.
    ⚠️ **모달을 새로 만들 땐 기존 모달(`#dm-invite-modal` 등)의 구조를 그대로 복사할 것.**
  - 참여자 칩도 깨져 있었다: `avatarHtmlFor()`는 **이미지 태그 or 이름 첫 글자만** 돌려주는
    함수라 동그란 틀(`.dm-info-avatar`) 안에 넣어야 하는데 그냥 붙여서 "정정서진"처럼
    첫 글자가 이름 앞에 글자로 붙어 보였다.
- 2026-08-26 (25차): **이미 폰에 떠 있는 푸시 알림까지 같이 닫기**(요청: "알람 없어지면 알람
  켜놓은 사람한테 온 알람도 지워지게 할 수 있어?"). `sw.js`의 `SW_BUILD`도 `2026-08-26-25`로
  올림. 엣지 함수 **v15**.
  - 24차는 **알림센터 행**만 지웠다. 폰 알림창에 이미 떠 있는 푸시는 그대로 남아서 지운 글/
    메시지 내용이 계속 보였다. 이번엔 그것까지 닫는다.
  - 방법(웹 푸시 표준): 알림을 띄울 때 **`tag`에 원본 id**를 박아두고, 원본을 지울 때
    **`{close:[tag...]}`만 담긴 "닫기 푸시"** 를 보낸다. `sw.js`의 push 핸들러가 그걸 보면
    새 알림을 띄우는 대신 `registration.getNotifications()`에서 그 tag를 찾아 `close()`한다.
  - 새 엣지 엔드포인트 **`/api/notify/purge`** `{kind:'post'|'comment'|'dm-message', id}`:
    소유권 확인 → 알림 행 삭제 → 받는 사람들에게 닫기 푸시. 프론트는 `purgeNotifsFor()`로
    이걸 부르고, **서버가 안 되면 24차의 DB 함수(purge_*)로 폴백**한다(알림 행만 지워지고
    뜬 알림은 못 닫음).
  - 채팅방을 나갈 때는 내 기기의 알림을 직접 닫는다(`closeShownNotifs({refId})` —
    알림 data에 refId(방 id)를 같이 실어둔다).
  - ⚠️ 한계: **v15 이전에 이미 발송돼 폰에 떠 있는 알림은 tag가 없어서 못 닫는다**(알림센터
    행은 지워짐). 그리고 크롬은 "아무것도 안 띄우는 푸시"가 반복되면 가끔 "사이트가
    백그라운드에서 업데이트됨" 같은 기본 알림을 대신 띄울 수 있다(웹 푸시 공통 제약).
- 2026-08-26 (24차): **글·댓글·DM을 지우면 그 알림도 같이 지워지게**(요청: "dm이나 글
  삭제하면 알람도 같이 지워지게 해줘"). `sw.js`의 `SW_BUILD`도 `2026-08-26-24`로 올림.
  마이그레이션 `purge_notifications_on_delete`, 엣지 함수 **v14**.
  - **왜 그냥 delete로 안 되나**: 알림은 받는 사람 행이고 RLS가
    `auth.uid() = recipient_user_id`라서 **지우는 사람(글쓴이/보낸 사람)은 남의 알림을 못
    지운다.** 그래서 security definer 함수 3개로 소유권을 확인한 뒤 대신 지운다:
    `purge_post_notifications` / `purge_comment_notifications` /
    `purge_dm_message_notifications`. 원본이 아직 살아있어야 소유권을 확인할 수 있으므로
    **삭제 직전에** 부른다.
  - **`notifications.source_id` 추가**: `ref_id`(글/방 단위)로는 알림 하나를 특정할 수 없어서
    (같은 글의 댓글 알림이 전부 같은 ref_id) 원본 id를 따로 남긴다. 엣지 함수 v14가
    댓글/DM/공부인증 알림에 이 값을 채운다.
  - **채팅방 나가기**: 그 방에서 온 내 알림도 같이 지운다(내 알림이라 RLS 안에서 직접 삭제).
  - 예전에 쌓인 알림 정리: 내용이 정확히 일치하는 원본을 찾아 `source_id`를 최선껏 채웠고
    (댓글 30건 · DM 86건), **이미 지워진 글을 가리키던 유령 알림 16건**은 삭제했다.
  - ⚠️ v14 이전 알림 중 원본을 못 찾은 건 `source_id`가 비어 있어서, 그 시절 DM/댓글을 지금
    지워도 알림이 남을 수 있다(글 삭제는 `ref_id`로 잡히니 영향 없음).
- 2026-08-26 (23차): **댓글 답장(대댓글) + "작성자" 표시 + 등록/전송 버튼 눌리기 쉽게**
  (요청: "전송 누르기가 빡세다는 의견이 있어서 수정해, 게시물에서 답장할때는 댓글 |——>답장
  이렇게 구성해주고, 댓글에 작성자가 대답할경우 익명이여도 ㅇㅇ(작성자)이렇게 보이게 해").
  `sw.js`의 `SW_BUILD`도 `2026-08-26-23`로 올림. 마이그레이션 `add_parent_id_to_comments`.
  - **등록/전송 버튼이 화면 밖으로 밀려나던 버그**: `.comment-input-row`가 flex인데 입력칸에
    `min-width:0`이 없어서(플렉스 자식 기본값이 `min-width:auto`) 입력칸이 안 줄어들고 버튼이
    잘려나갔다. 입력칸에 `min-width:0`, 버튼에 `flex-shrink:0`을 주고 버튼 크기도
    `9px 18px`/`min-height:38px`로 키웠다. **DM 전송·선생님 메시지 입력줄도 같은 클래스라
    같이 고쳐졌다.**
  - **답장(대댓글)**: `comments.parent_id`(FK→comments, cascade). 댓글마다 "답장" 버튼 →
    바로 아래에 답장 입력칸(익명 체크 포함)이 열리고, 등록하면 부모 댓글 밑에 `↳`로 들여써
    붙는다. 답장의 답장도 **한 단계까지만** 들여쓴다(`commentTree()`가 최상위 부모로 접어줌).
    등록 후에는 위치를 맞춰야 해서 목록을 통째로 다시 그린다(`refreshCommentList`).
  - **"작성자" 배지**: 글쓴이가 자기 글에 댓글/답장을 달면 이름 옆에 `작성자` 배지 →
    익명이면 `ㅇㅇ (작성자)`가 된다.
    ⚠️ **단, 익명/필명 글인데 댓글은 실명으로 단 경우엔 배지를 안 붙인다**(`isPostAuthorComment`)
    — 붙이는 순간 "이 실명 = 익명 글의 글쓴이"가 돼서 익명이 풀리기 때문.
  - 엣지 함수 **v13**: `notify/comment`가 답장이면 **원 댓글 작성자에게도** 알림을 보낸다
    (제목도 "새 답장"). 안 그러면 답장 받은 사람이 글쓴이가 아닐 때 영영 모른다.
  - 댓글 메타줄(`comment-meta`)이 좁은 화면에서 글자 단위로 쪼개지던 것도 `flex-wrap:wrap`으로
    정리했다(답장 버튼이 늘면서 더 붐볐다).
- 2026-08-26 (22차): **피드 카드에서 제목을 사진 위로, 본문을 사진 아래로**(요청: "사진보다
  제목이 올라오게 사진 밑에 본문이 쓰이게"). `sw.js`의 `SW_BUILD`도 `2026-08-26-22`로 올림.
  - 21차까지는 제목이 캡션(본문)과 같은 덩이(`.post-body-text`) 안에 있어서 사진 **아래**로
    내려갔다. 제목만 `.post-title-line`으로 빼서 미디어 위에 올렸다.
  - 최종 순서: `헤더 → 제목 → 사진/영상 → 본문(+투표) → 액션바 → 좋아요 수 → 댓글 보기 → 시간`.
  - 사진이 없는 글은 제목과 본문이 붙어야 자연스러워서 `.post-title-line+.post-body-text`로
    위쪽 여백만 없앴다.
- 2026-08-26 (21차): **글쓰기에 투표 붙이기 — 비밀 투표**(요청: "게시물 올릴때 투표도 올릴 수
  있게 만들어줘, 투표는 비밀 투표로"). `sw.js`의 `SW_BUILD`도 `2026-08-26-21`로 올림.
  마이그레이션 `add_post_polls_secret_ballot`.
  - 마이너 갤러리 글쓰기 페이지에 **🗳️ 투표 추가** 체크박스 → 질문 + 선택지(2~8개) 입력.
    선택지 입력 헬퍼(`renderPollOptionInputs`/`addPollOptionInput`)는 공지 투표와 공용으로
    쓰도록 목록 id를 인자로 받게 일반화했다.
  - 표시: **피드 카드**(본문 아래)·**갤러리 상세**(본문 아래)에 투표 블록, **갤러리 목록**
    제목 옆에 🗳️ 표시. 투표하기 전에는 선택지 버튼만 보이고, 고르면 막대 그래프 결과가 뜬다
    (남 눈치 안 보고 고르라고 공지 투표와 동일하게 "투표 후 결과 공개").
  - **비밀 투표를 DB로 강제**: 프론트에서 이름만 안 그리는 방식은 개발자도구로 뚫린다(익명
    글에서 이미 겪은 문제). 그래서
    - `post_poll_votes`의 SELECT 정책을 `auth.uid()=user_id`로 잠가 **남의 표는 받아올 수조차
      없게** 하고,
    - 선택지별 표 수만 돌려주는 security definer 함수 `post_poll_results(pids)`를 만들어
      집계는 그걸로만 받는다.
    실제로 A/B 두 표를 넣고 A 권한으로 조회해보면 A에게는 1행(자기 표)만 보이고, 집계 함수는
    2표를 정상적으로 돌려준다.
  - 프론트 상태: `boardPollMap`(글→투표), `boardPollCountMap`(투표→선택지별 표 수),
    `boardMyPollVote`(투표→내 선택). **누가 뭘 골랐는지는 클라이언트에 아예 안 들어온다.**
- 2026-08-26 (20차): **피드 카드의 액션바(하트·댓글·공유)를 글 아래로 이동**(요청: "하트와
  공유 ui가 글 밑으로 내려와야해"). `sw.js`의 `SW_BUILD`도 `2026-08-26-20`로 올림.
  - 원래는 인스타 순서 그대로 `헤더 → 미디어 → 액션바 → 본문`이었는데, 글만 있는 글(사진 없는
    텍스트 글)에서는 하트/공유가 제목·본문보다 **위에** 붙어서 어색했다.
  - `renderPost()`의 `.post-body`를 **`.post-body-text`(제목·캡션)** 와
    **`.post-body-meta`(좋아요 수·댓글 보기·시간)** 둘로 나누고, 그 사이에 `.post-actions`를
    넣어 `헤더 → 미디어 → 글 → 액션바 → 좋아요 수 → 댓글 보기 → 시간` 순서가 되게 했다.
  - 시험회고 카드는 원래부터 액션바가 본문 아래였고, 아래쪽 본문에 같은 `.post-body-meta`
    클래스만 맞춰줬다.
- 2026-08-26 (19차): **DM 우클릭 메뉴 · 채팅방 정보(알림 끄기/나가기) + 익명 댓글이 알림에서 익명이 풀리던 버그 수정**.
  `sw.js`의 `SW_BUILD`도 `2026-08-25-19`로 올림.
  - **PC 우클릭으로 DM 삭제/수정**(요청: "모바일에서는 꾹 누르면 되는데 컴터에서는 우클릭"):
    내 메시지 말풍선에 이미 `oncontextmenu="showDmMsgMenu(...)"`가 붙어 있었지만, 같은 우클릭
    이벤트가 그대로 `document`까지 올라가서 **방금 연 메뉴를 곧바로 다시 닫아버리고 있었다**.
    `showDmMsgMenu`에서 `stopPropagation()` + `event._dmMenuOpened=true` 표시를 하고,
    document의 contextmenu 리스너는 그 표시가 있으면 `return`하도록 해서 해결.
  - **채팅방 정보 모달**(`#dm-info-modal`, `openDmRoomInfo()`): 스레드 상단의 **방 이름을 누르거나
    ⓘ 버튼**을 누르면 인스타 DM처럼 참여자 목록 + 동작 목록이 뜬다. 예전의 초대/나가기 버튼은
    헤더에서 빼고 이 모달 안으로 옮겼다.
    - **알림 끄기**(`toggleDmMute()` → 마이그레이션 `add_muted_to_dm_participants`,
      `dm_participants.muted`): 방마다 알림을 끌 수 있다. **프론트만 고치면 푸시는 계속 오므로**
      엣지 함수 `notify/dm-message`에서도 `muted`인 참여자를 수신자 목록에서 걸러낸다.
    - **채팅방 나가기**: 예전엔 단톡방만 됐는데 1:1 방도 나갈 수 있게 했다(확인 문구가 다르다 —
      1:1은 "내 목록에서만 사라지고 상대방에겐 그대로 남아요").
  - **익명 댓글이 알림에서 실명으로 나가던 버그**(제보: "익명으로 쓴 게시물의 댓글이 달렸을때
    알람에서 익명 유지가 안돼"): 엣지 함수 `notify/comment`가 알림 본문을
    `${comment.author_name}: 내용` 으로 만들고 있어서, 화면에서는 `ㅇㅇ`으로 보이는 익명 댓글도
    **푸시 알림과 알림센터에서는 작성자 실명이 그대로 드러났다**. `comments.is_anonymous`를 같이
    읽어와 익명이면 `ㅇㅇ`으로 쓰도록 수정(엣지 함수 **v12** 배포). 이미 쌓여 있던 알림 7건도
    SQL로 `ㅇㅇ: …` 로 고쳤다.
    - 같은 김에 댓글 알림의 이동 링크에 `studycert`/`examreview` → `study-board`를 추가했다.
      공부인증·시험회고가 학습 파트로 옮겨간 뒤로 그 글의 댓글 알림이 갤러리로 가고 있었다.
    - ⚠️ **알림 문구는 엣지 함수가 만든다** — 프론트에서 익명 처리를 해도 알림은 별개다.
      익명/필명이 걸린 기능을 건드릴 땐 `notify/*` 쪽도 같이 확인할 것.
- 2026-08-25 (18차): **조회수·공유수가 계속 0이던 버그 수정**(제보: "조회수가 잘 표시가 안되는거같은데").
  `sw.js`의 `SW_BUILD`도 `2026-08-25-18`로 올림.
  - **원인**: `sb.rpc('increment_post_view',{pid:id});` 처럼 **await/.then() 없이 호출**하고 있었다.
    supabase-js의 쿼리 빌더는 **thenable(지연 실행)** 이라 `await`이나 `.then()`을 붙이는 순간에만
    HTTP 요청이 나간다 — 그냥 호출만 하면 아무 일도 일어나지 않는다. 그래서 DB 함수 자체는
    정상인데(SQL로 직접 호출하면 잘 올라감) 조회수가 영원히 0이었다. `increment_post_share`도
    같은 상태였다. 둘 다 `.then(({error})=>…)`을 붙여 해결.
    ⚠️ **앞으로 `sb.from(...)`/`sb.rpc(...)`를 "실행만 하고 결과를 안 쓰는" 코드를 쓸 때는 반드시
    await 또는 .then()을 붙일 것.** 결과를 안 쓴다고 그냥 호출하면 조용히 아무것도 안 된다.
  - 화면 반영도 개선: 글을 열면 응답을 기다리지 않고 **먼저 +1 한 값**을 상세와 목록 줄에 보여준다.
  - PostgREST 스키마 캐시도 한 번 리로드(`notify pgrst, 'reload schema'`)해서 새 함수가 REST로
    확실히 노출되게 했다.
- 2026-08-25 (17차): **필명 기능 + 공유수 + 익명 댓글 + 공부인증 페이지 넘김 + 작성일에 시간까지**.
  `sw.js`의 `SW_BUILD`도 `2026-08-25-17`로 올림.
  - **필명**(마이그레이션 `add_pen_name_to_posts` → `posts.pen_name`): 글쓰기에서 글쓴이 이름을
    **[내 이름] [✒️ 필명] [🕶️ 익명(ㅇㅇ)]** 중에 고른다(`freeNameMode`). 필명을 고르면 입력칸이
    뜨고, 마지막에 쓴 필명은 `user_metadata.pen_name`에 기억해 다음 글쓰기 때 자동으로 채운다.
    표시 이름은 `postAuthorView()`가 한곳에서 결정(익명→ㅇㅇ, 필명→그 이름, 둘 다 프로필 사진은
    가림). 운영자의 "익명 풀기"는 **필명 글에도** 적용된다(`isMaskedPost`).
  - **DM 공유 시 익명이 새던 버그**: `confirmSharePostToDm()`이 실제 작성자 이름을 그대로 넣고
    있어서 익명/필명 글을 공유하면 실명이 드러났다 → `postAuthorView(post).name`으로 교체.
  - **공유수**(마이그레이션 `add_share_count_to_posts` → `posts.share_count` +
    `increment_post_share(uuid)` SECURITY DEFINER): DM 공유가 성공하면 +1, 글 상세 메타에
    `조회 N · 공유 N`으로 보여준다.
  - **익명 댓글**(마이그레이션 `add_is_anonymous_to_comments` → `comments.is_anonymous`):
    댓글 입력줄에 `ㅇㅇ` 체크박스. **댓글은 필명 없이 ㅇㅇ만**(요청). 운영자는 댓글에도
    "익명 풀기"로 실제 작성자를 볼 수 있다(`revealAnonAuthor`가 글/댓글 id를 같은 집합으로 관리).
    이 김에 4곳에 복붙돼 있던 댓글 목록/입력줄 마크업을 `renderCommentList()`/
    `renderCommentInputRow()` 공용 함수로 합쳤다(앞으로 댓글 UI는 이 두 함수만 고치면 됨).
  - **공부인증/시험회고 페이지 넘김**: `studyPage`/`goStudyPage`. `renderPager(total,page,goFn)`가
    이동 함수명을 받도록 일반화. 갤러리와 동일하게 20개/쪽.
  - **작성일**에 날짜+시간을 함께 표시(`08.25 14:32`) — 예전엔 오늘이면 시간, 아니면 날짜만
    보여줬다. 목록의 작성일 칸 폭도 같이 넓혔다.
- 2026-08-25 (16차): **갤러리 페이지 넘김(20개/쪽) + 글쓰기에서 올릴 곳(갤러리/피드) 선택 +
  갤러리 상세에도 DM 공유 버튼**. `sw.js`의 `SW_BUILD`도 `2026-08-25-16`으로 올림.
  - **페이지 넘김**: `POSTS_PER_PAGE=20`, `freePage`, `goFreePage(n)`, 하단에 디시식 페이저
    (`renderPager` — `◀◀ ◀ 1 2 3 ▶ ▶▶` + "N개 · x/y쪽", 현재 쪽은 빨간 밑줄). 갤러리/피드는
    서버에서 `range()`로 20개씩 받고 `count:'exact'`로 전체 개수를 구한다. **인기글만은**
    추천 수를 계산해야 걸러낼 수 있어 최근 200개를 받아 거른 뒤 클라이언트에서 자른다.
    목록의 "번호"는 페이지가 아니라 **전체 기준**(1쪽 첫 줄 = 전체 개수)으로 매긴다(`startNum`).
    글이 지워져 마지막 쪽이 비면 자동으로 이전 쪽으로 되돌아간다.
  - **올릴 곳 선택**(마이그레이션 `add_show_in_to_posts` → `posts.show_in` text NOT NULL
    default `'both'`, check in ('both','gallery','feed')): 글쓰기 페이지에 [둘 다][갤러리만]
    [피드만] 버튼(`freeShowIn`). 갤러리 탭은 `both|gallery`, 피드 탭은 `both|feed`만 조회한다.
    **인기글 탭은 show_in과 무관하게 전부** 대상으로 본다(추천 많이 받은 글 모음이라서).
    글을 올리면 그 글이 보이는 탭으로 자동 이동한다(피드 전용 글을 갤러리 탭에서 쓰면 피드로).
    기존 글은 전부 `'both'`로 승계되므로 지금까지의 글은 양쪽 다 보인다.
  - **DM 공유**: 기능 자체(`openSharePostModal`)는 이미 있었고 피드 카드/시험회고 카드에만
    버튼이 있었는데, **갤러리 상세 화면에도** "공유" 버튼을 추가했다(누구나 가능).
- 2026-08-25 (15차): **글쓰기 화면이 비어 보이던 버그 수정**(제보: "글쓰기 탭에 글을 못 쓰는데").
  `sw.js`의 `SW_BUILD`도 `2026-08-25-15`로 올림.
  - 원인: `openBoardPost()`가 `#free-write-form`을 `display:none`으로 감추고 있었다. 글쓰기 폼이
    게시판 페이지 안에 인라인으로 있던 시절의 잔재인데, 14차에서 폼이 전용 페이지
    (`#page-free-write`)로 옮겨간 뒤로는 **글을 한 번 열어보면 글쓰기 화면의 폼이 통째로
    사라진 채로 남는** 결과가 됐다(제목/내용/버튼이 전부 안 보임).
  - 수정: 그 줄을 제거하고, `openFreeWritePage()`에서 항상 `display=''`로 되돌리게 했다
    (이전 버전에서 숨겨진 상태가 남아 있어도 복구되도록).
  - 재현 경로로 회귀 테스트: 글 열기 → 목록으로 → 글쓰기 → 폼이 보이고 실제 등록까지 확인.
- 2026-08-25 (14차): **게시판 구조 개편 — 카테고리 탭을 없애고 갤러리/피드로, 공부인증·시험회고는
  학습 파트로 분리, 갤러리 글쓰기도 전용 페이지로**. `sw.js`의 `SW_BUILD`도 `2026-08-25-14`로 올림.
  - **3-1 마이너 갤러리**: 자랑/잡동사니/정보·팁 카테고리 탭을 없애고 **[갤러리][피드][🔥 인기글]**
    탭으로 바꿨다. 셋 다 **같은 글 묶음**이고 보여주는 방식만 다르다(갤러리=목록형, 피드=인스타형
    카드, 인기글=최근 2주 내 개추-비추 3 이상). `freeTab`(localStorage `bugwang_free_tab`).
    - 새 글은 전부 `category='free'`로 저장한다. 옛 글(brag/misc/tips)도 같이 보여야 하므로
      조회는 `TEXT_CATEGORIES=['free','brag','misc','tips']`로 `in()` 한다. 앞으로 게시판을
      더 나눌 일이 없으면 이 배열만 보면 됨. `FREE_BOARD_CATEGORIES`/`currentFreeCategory`/
      `switchFreeCategory`/`setFreeView` 등 옛 체계는 전부 제거.
    - **글쓰기는 전용 페이지**(`#page-free-write`, `openFreeWritePage`/`closeFreeWritePage`)로
      이동 — 공부인증 글쓰기와 같은 패턴. 인라인 폼과 토글(`freeWriteOpen`)은 삭제.
      초안 자동저장의 컨테이너도 이 페이지로 바뀜(제목/내용/익명 체크 복구는 그대로).
  - **공부인증/시험회고 → 학습 파트**: 사이드바 "학습" 그룹에 `공부인증/시험회고`
    (`data-page="study-board"`) 추가, 전용 페이지 `#page-study-board`에 탭 2개(`studyTab`)와
    루틴 현황판·글쓰기 버튼을 옮겼다. 목록은 `#study-list`, 로더는 `loadStudyBoard()`.
    전용 글쓰기 페이지에서 돌아갈 때도 `navigate('study-board')` + 해당 탭으로 복귀.
  - `boardLoader(type)`: studycert/examreview → `loadStudyBoard`, TEXT_CATEGORIES → `loadFreeBoard`.
    옛 글의 category('brag' 등)가 type으로 들어와도 갤러리로 잘 돌아온다.
  - ⚠️ 작업 중 사고: 옛 카테고리 블록을 통째로 잘라낼 때 경계를 `const BOARD_SUBMIT_LABEL`로
    잡았다가 그 사이에 있던 **글 자동저장 모듈 전체가 같이 지워질 뻔했다**(문법 검사 전에 발견해
    되돌림). 이 파일은 단일 스크립트라 "A부터 B까지 지우기" 식 편집은 그 구간에 뭐가 들어있는지
    반드시 먼저 확인할 것.
- 2026-08-25 (13차): 익명 글의 표시 이름을 `익명` → **`ㅇㅇ`**(디시 스타일)로 변경
  (`postAuthorView`). 운영자가 "익명 풀기"를 누르면 실제 이름이 나오는 건 그대로.
  `sw.js`의 `SW_BUILD`도 `2026-08-25-13`으로 올림.
- 2026-08-25 (12차): **게시판 이름 변경 + 글쓰기 버튼화 + 익명 글쓰기 + 글 상세를 별도 화면으로
  + 인기글 2주 만료**. `sw.js`의 `SW_BUILD`도 `2026-08-25-12`로 올림.
  - **이름**: 사이드바/페이지 제목의 "자유게시판" → **"3-1 마이너 갤러리"**(내부 키 `free-board`,
    카테고리 값 등은 그대로 — 코드/DB에서는 계속 free/자유게시판으로 부른다).
  - **글쓰기 폼을 버튼 뒤로**: 항상 펼쳐져 목록을 밀어내던 인라인 폼을 우측 상단
    `✏️ 글쓰기` 버튼 토글로 바꿈(`freeWriteOpen`/`toggleFreeWriteForm`). 열 때 초안 복구를
    물어보고, 글이 등록되면 다시 접힌다. 공부인증/시험 회고/인기글 탭에서는 버튼이 숨는다.
  - **익명 글쓰기**(마이그레이션 `add_is_anonymous_to_posts` → `posts.is_anonymous`):
    글쓰기 폼의 "🕶️ 익명으로 쓰기" 체크. 화면에서는 작성자를 `익명`으로 가리고 아바타도 감춘다
    (`postAuthorView`). **운영자(`isBoardModerator`)에게만 "🔒 익명 풀기" 버튼**이 보이고,
    누르면 실제 이름 + 학번이 나온다(`revealAnonAuthor`, 세션 한정 — 새로고침하면 다시 가려짐).
    ⚠️ **완전한 익명이 아니다**: 실제 작성자(student_id/user_id)는 posts 행에 그대로 저장되고
    그 행은 학생도 읽을 수 있으므로, 개발자도구를 볼 줄 알면 작성자를 알아낼 수 있다. 본인
    수정/삭제 권한과 운영자 확인 기능을 유지하려면 소유자 정보가 필요해서 이렇게 했다.
    진짜 익명이 필요하면 작성자를 별도 테이블(스태프만 SELECT 가능)로 분리해야 한다.
  - **글 상세를 별도 화면처럼**(요청: "디시처럼 페이지 이동하는 것처럼"): 목록 아래로 펼쳐지던
    아코디언을 없애고, 글을 누르면 목록/글쓰기 버튼을 감추고 `#free-detail`에 상세를 그린다
    (`openBoardPost`/`closeBoardPost`, 상단에 "← 목록으로"). 탭이나 보기를 바꾸면 자동으로 닫힌다.
  - **인기글 2주 만료**: `isHotPost(p)` = `개추-비추 >= HOT_SCORE(3)` **그리고** 작성 후
    `HOT_MAX_AGE_MS(14일)` 이내. 목록의 `인기` 배지와 🔥 인기글 탭 둘 다 이 함수를 쓴다.
- 2026-08-25 (11차): **자유게시판에 갤러리(목록형) 보기 + 개추/비추 + 인기글 추가**.
  피드(기존 인스타형 카드)는 **그대로 두고**, 같은 글을 목록으로도 볼 수 있게 보기 모드를 나눴다
  (요청: "피드랑 갤러리를 구분해줘"). `sw.js`의 `SW_BUILD`도 `2026-08-25-11`로 올림.
  - **스키마**(마이그레이션 `board_list_ui_title_views_votes`):
    `posts.title`(text, 목록에 쓸 제목 — 없으면 본문 첫 줄을 제목처럼 보여줌),
    `posts.view_count`(int), `post_likes.vote`(text, 'up'|'down', **기본 'up'** — 기존 좋아요는
    전부 개추로 승계됨), 그리고 조회수만 올리는 SECURITY DEFINER 함수 `increment_post_view(uuid)`
    (posts UPDATE 정책은 작성자/스태프만 허용이라 남의 글 조회수를 못 올림).
  - **보기 전환**(`freeView`, localStorage `bugwang_free_view`): 자랑/잡동사니/정보·팁/인기글
    탭에서만 [피드][갤러리] 토글이 뜬다. 공부인증·시험 회고는 전용 UI라 토글을 숨긴다.
  - **갤러리 목록**: `번호/제목/글쓴이/작성일/조회/추천` 표(`renderBoardList`). 제목을 누르면
    **그 줄 아래로 펼쳐져서**(별도 페이지 없이) 본문/사진/개추·비추/댓글이 나온다
    (`toggleBoardRow`/`openBoardRow`/`renderBoardDetail`). 조회수는 한 세션에 글당 한 번만 올린다.
    좁은 화면(≤640px)에선 제목 한 줄 + `글쓴이 / 작성일·조회·추천` 한 줄로 접힌다.
  - **개추/비추**(`votePost`): 같은 걸 다시 누르면 취소, 반대쪽을 누르면 갈아탄다. `post_likes`
    한 행의 vote만 바꾸는 구조라 개추와 비추를 동시에 가질 수 없다. 피드의 ♥ 좋아요는 그대로
    두었고 이는 개추('up')와 같은 데이터다.
  - **인기글**: `개추 - 비추 >= HOT_SCORE(3)`이면 목록에 `인기` 배지가 붙고, 가상 탭 `🔥 인기글`
    (실제 카테고리가 아니라 자유 형식 글 전체에서 모아 보는 탭 — 글쓰기 폼/카테고리 선택지에서 제외)에 모인다.
  - ⚠️ **함수 이름 충돌 주의**: 새로 만든 `renderVoteButtons`가 기존 공부인증용 동명 함수에
    덮여서 개추 숫자가 화면에 반영되지 않는 버그가 있었다(테스트로 발견) → `renderBoardVoteButtons`/
    `myBoardVote`로 개명. 이 파일은 단일 스크립트라 **전역 함수명이 전부 한 네임스페이스**임을 잊지 말 것.
- 2026-08-25 (10차): **자동저장 상태 표시줄 추가**(요청: 저장되고 있다는 걸 눈으로 보이게 —
  다른 앱의 "서버 저장됨 / 마지막 저장 …" 바 스크린샷을 참고로 받음).
  `sw.js`의 `SW_BUILD`도 `2026-08-25-10`으로 올림.
  - 글쓰기 폼 맨 위에 초록 바가 붙어 **`저장 중…`(회색) → `자동저장됨 · 마지막 저장 오늘 오후 4:21`
    (초록)** 로 바뀐다. 오른쪽엔 **"임시저장 삭제"** 버튼(확인 후 초안만 지우고 쓰던 글은 유지).
  - HTML을 6군데 고치는 대신 `ensureDraftBar(form)`이 **폼마다 바를 코드로 만들어 꽂는다**
    (전용 페이지는 `barIn`으로 `.card` 안쪽을 지정, 인라인 폼은 컨테이너 맨 위).
    상태 전환은 `setDraftBar(form,'saving'|'saved'|'hidden',ts)` 하나로.
  - 바의 시각은 폭이 좁아 두 줄로 접히던 문제 때문에 **오늘 저장분은 날짜를 생략**
    (`fmtDraftTimeShort`) — 복구 확인 문구는 요청대로 "몇월 몇일" 전체 날짜를 그대로 쓴다.
- 2026-08-25 (9차): **글 자동저장(초안) 기능 신설**. 글을 쓰다 새로고침하거나 실수로 나가도
  내용이 날아가지 않고, 그 폼을 다시 열면 "N월 N일 오후 H:MM에 자동저장된 데이터가 있습니다.
  복구하시겠습니까?"를 묻는다. `sw.js`의 `SW_BUILD`도 `2026-08-25-9`로 올림.
  - 대상 폼 6개(`DRAFT_FORMS`에 한 줄씩 선언 — 폼을 추가하려면 여기만 손대면 됨):
    자유게시판 / 질문게시판 / 버그 제보 / 공지 작성 / 공부 인증 / 시험 회고.
  - 저장은 `localStorage['bugwang_draft_{폼}_{학번}']`. **학번을 키에 넣는 이유**: 공용 기기에서
    다음 사람이 남의 초안을 보면 안 되기 때문. 일주일(`DRAFT_TTL_MS`) 지나면 조용히 버린다.
  - 단순 input/select 값은 `ids` 배열로 자동 처리하고, **동적으로 늘어나는 줄**(공부인증의
    과목별 학습 내역, 시험 회고의 영역별 오답)과 버튼형 상태(과목 유형·시간 부족 여부)는
    폼별 `get()`/`set()` 훅으로 저장·복구한다. ⚠️ 시험 회고 `set()`은 `setExamType()`이 영역
    행을 비우므로 **반드시 과목을 먼저 세팅한 뒤 행을 복구**해야 한다(순서 의존).
  - 리스너는 폼 **컨테이너 하나**에만 붙인다(이벤트 위임) — 그래야 나중에 생기는 줄까지
    자동으로 잡힌다. `DOMContentLoaded`에서 6개 폼에 한 번씩 붙여두므로 어느 경로로 들어와도
    타이핑이 저장된다(처음엔 폼을 열 때만 붙였는데, 사이드바로 바로 들어오면 리스너가 없어
    저장이 안 되는 구멍이 있었다 — 테스트로 발견).
  - 저장 시점: 입력 후 700ms 디바운스 + `visibilitychange`/`pagehide`에서 즉시 flush.
  - **빈 폼은 초안으로 치지 않는다** — select/date는 열자마자 기본값이 차 있어서 "쓰다 만 글"의
    근거가 못 되므로, 실제로 타이핑한 텍스트나 추가한 줄이 있을 때만 저장한다.
  - 복구를 **거절하면 그 초안은 삭제**하고, 한 세션에서 같은 폼은 한 번만 묻는다(`draftOffered`).
    실제로 글이 등록되면 `finishDraft()`가 초안을 지운다. 공지 **수정**은 원본이 서버에 있으니
    초안 대상에서 제외(`skip`).
  - ⚠️ **사진은 저장되지 않는다**(File 객체는 localStorage에 못 담음) — 복구해도 사진은 다시 골라야 함.
- 2026-08-25 (8차): **시험 회고 영역 목록에서 영어·탐구를 단순화**(피드백: "너무 세부적인데").
  국어(독서 제재/문학 갈래)·수학(수Ⅰ·수Ⅱ/선택과목 단원)은 요청대로 2단을 그대로 두고,
  7차에서 내가 임의로 잘게 나눴던 두 과목만 줄였다. `sw.js`의 `SW_BUILD`도 `2026-08-25-8`로 올림.
  - 영어: 7개 대분류(대의 파악/세부 내용/어법·어휘/빈칸 추론/간접 쓰기/장문 …)와 그 하위 유형
    → **듣기 / 독해** 두 개만, 세부 단계 없음.
  - 탐구: 과목별 대단원 표(`SCIENCE_UNITS`, 13과목) **통째로 삭제** → 어느 과목에나 통하는
    **개념 / 자료 해석 / 계산 / 킬러** 4개(`SCIENCE_AREAS`). 이제 탐구 영역 목록이 과목명과
    무관해져서, 과목명 입력에 맞춰 선택지를 다시 만들던 `onExamSubjectDetailInput()`과
    안내 문구(`#er-area-hint`, `refreshExamAreaHint()`)도 함께 제거했다.
  - 세부 단원을 쓰고 싶으면 어느 항목에서든 **"직접 입력"** 을 쓰면 된다(그대로 유지).
  - 저장 형식(`{main,sub,count}`)과 국어·수학 동작은 변경 없음 — 회귀 테스트로 확인.
- 2026-08-25 (7차): **시험 회고의 "영역별 틀린 개수"를 자유 입력 → 과목별 2단 선택으로**.
  `sw.js`의 `SW_BUILD`도 `2026-08-25-7`로 올림.
  - 영역 한 줄이 `[대분류 select][소분류 select][개수][×]`가 됐고, 저장 형식도
    `{name,count}` → **`{main,sub,count}`** 로 바뀜. 카드 렌더는 옛 글의 `name`도 계속 지원한다.
  - 목록은 `examAreaTree()`가 **지금 고른 과목 + 계정 설정**을 보고 만든다:
    - 국어: 독서(인문/사회/경제/법/과학/기술/예술/주제통합) · 문학(고전시가/고전소설/현대시/
      현대소설/극·수필) · **선택과목**(`user_metadata.suneung_kor` — 화법과작문 또는 언어와매체,
      각각의 하위 항목까지). 설정이 없는 계정이면 후보를 전부 보여준다.
    - 수학: 공통(수학Ⅰ/수학Ⅱ) · **선택과목**(`suneung_math` — 확률과통계/미적분/기하 + 각 단원)
    - 영어: 듣기 / 대의 파악 / 세부 내용 / 어법·어휘 / 빈칸 추론 / 간접 쓰기 / 장문 (+ 하위 유형)
    - 탐구: 입력한 **과목명으로 대단원 표(`SCIENCE_UNITS`, 13과목)를 찾아** 대분류로 쓰고,
      표에 없는 과목이면 오답 유형(개념 부족/자료 해석/계산 실수/시간 부족/킬러)으로 대체.
      과목명을 고치면 `onExamSubjectDetailInput()`이 열려 있는 행의 선택지까지 다시 만든다.
      ⚠️ `SCIENCE_UNITS`는 2015 개정 교육과정 대단원을 기억으로 정리한 것이라 명칭이 살짝
      다를 수 있음 — 어느 항목에서든 "직접 입력"으로 원하는 이름을 쓸 수 있게 해뒀다.
  - **영어·수학에도 영역별 섹션이 생겼다**. 그래서 기존 `common` 섹션을 `timing`(시간 부족·못 푼
    개수)과 `areas`(영역별)로 쪼갰다 — 과목별 구성은 `EXAM_TYPES[*].secs` 참고:
    국어 `timing+areas+reflect` / 수학 `areas+math` / 영어 `areas+english` /
    탐구 `timing+areas+science+reflect`.
  - ⚠️ 이때 `submitExamReviewPost()`의 "이 과목에서 안 쓰는 섹션 비우기" 코드가 옛 이름
    (`common`)을 그대로 보고 있어서 **영역이 항상 통째로 지워지는 버그**가 있었다(테스트로 발견).
    섹션 이름을 바꿀 땐 이 정리 블록도 같이 고칠 것.
  - 모바일(≤520px)에서는 한 영역이 두 줄로 접히므로, 옅은 카드 테두리로 묶어 어디까지가 한
    영역인지 보이게 했다.
- 2026-08-25 (6차): **토스트 안내 문구가 폰에서 양옆으로 잘리던 문제 수정**(제보: 쪽잠 알람의
  이어폰 권한 안내가 짤려서 안 읽힘). `sw.js`의 `SW_BUILD`도 `2026-08-25-6`으로 올림.
  - 원인: `#toast`에 `white-space:nowrap`이 걸려 있고 폭 제한이 없어서, 긴 문장이 한 줄로
    쭉 늘어나 화면 밖으로 나가고 `left:50%`+`translateX(-50%)` 때문에 **양쪽이 다 잘렸다**.
  - 수정: `white-space:pre-line`(문구 안의 `\n`은 줄바꿈으로 살리고 나머지는 자동 줄바꿈) +
    `max-width:min(420px,calc(100vw - 32px))` + `width:max-content` + `text-align:center` +
    `word-break:keep-all`(한글 단어가 중간에서 안 끊기게). 짧은 토스트는 예전 모양 그대로다.
  - `toast(msg)`가 dur을 안 받으면 **문구 길이에 따라 2.5초~6초**로 노출 시간을 늘리도록 함
    (긴 안내를 2.5초 안에 다 못 읽던 문제). 연속 호출 시 이전 타이머를 지워 겹침도 방지.
  - 이어폰 권한 거부/미지원 안내 문구도 두 줄로 짧게 다듬음.
  - ⚠️ 이어폰 자동 감지가 **권한 없이는 여전히 동작하지 않는다**(웹에 이어폰 감지 API가 없어서
    장치 라벨로 추정 → 라벨은 마이크 권한이 있어야 채워짐). 이번 수정은 그 상황을 알리는
    문구가 안 잘리게 한 것까지다. 권한 없이 쓰려면 "항상 소리"를 고르거나, 사용자가 직접
    "지금 이어폰 꽂음"을 켜는 수동 토글을 추가하는 방안이 있다(미구현).
- 2026-08-25 (5차): **시험 회고 기능 신설** (자유게시판의 5번째 탭 `examreview`).
  `sw.js`의 `SW_BUILD`도 `2026-08-25-5`로 올림.
  - **스키마**: `posts.exam_review`(jsonb) 컬럼 추가(마이그레이션 `add_exam_review_to_posts`).
    과목마다 항목이 완전히 달라서 컬럼을 따로 파지 않고 `study_log`처럼 jsonb 하나에 담는다.
    공통: `name`(시험 이름)/`type`(korean|math|english|science)/`subject`/`score`/`grade`.
  - **과목별 항목**(`EXAM_TYPES` 테이블이 어떤 섹션을 보여줄지 결정 — 과목을 추가하려면 여기
    한 줄만 더하면 됨):
    - 국어: 시간 부족 여부(`timeShort`) / 못 푼 지문·문제 개수(`unsolved`) /
      영역별 틀린 개수(`areas[]`, 선택) / 실수한 포인트 / 앞으로 개선할 점
    - 수학: 못 푼 문제 / 비효율적으로 푼 문제 / 놓친 발상 / 개선 방안
    - 영어: 핵심 논리 / 핵심 영단어
    - 탐구: **국어와 같은 구성** + 까먹었던 개념(`forgot`) + 세부 과목명 입력 필수
      (요청의 "탐구는 똑같이 구성"을 국어 구성으로 해석함 — 다르게 원하면 EXAM_TYPES의
      `secs`만 바꾸면 된다)
  - **글쓰기**: 공부인증과 같은 전용 페이지 패턴(`#page-examreview-write`,
    `openExamReviewWritePage()`/`closeExamReviewWritePage()`). 자유게시판 인라인 폼의 카테고리
    선택지에서는 studycert와 함께 제외(`FORM_EXCLUDED`)해서 필수 항목 빠진 글이 생기지 않게 함.
    저장 시 **현재 과목에서 안 쓰는 섹션의 값은 비워서 저장**한다(폼에서 과목을 왔다갔다 하다
    남은 값이 딸려가는 걸 막음 — 테스트로 확인).
  - **표시**: `renderExamReviewCard()` — 시험 이름 + 과목/점수/등급 알약, 값이 **있는 항목만**
    라벨과 함께 그린다(빈 항목이 많아서 전부 그리면 지저분해짐). 영역별 오답은 칩으로.
    좋아요/댓글/DM 공유·수정·삭제는 기존 게시판 함수를 그대로 재사용(`examreview`를
    FREE_BOARD_CATEGORIES에 넣었으므로 `boardLoader`/`deletePost`/`submitComment` 등이 그대로 동작).
  - 필수 입력은 **시험 이름**과 (탐구일 때) **과목명**뿐 — 점수/등급은 아직 모를 수 있어 선택.
- 2026-08-25 (4차): **공부인증 사진을 선택 항목으로** (요청: "사진 없어도 가능하게").
  `submitStudyCertPost()`의 사진 필수 검증을 없애고 라벨도 "인증 사진 (필수 …)" →
  "(선택 …)"으로 바꿨다. 사진이 없으면 `image_url`/`image_urls`에 `null`을 넣는다
  (`urls[0]||null`, `urls.length?urls:null` — undefined로 두면 컬럼이 아예 빠져서 헷갈림).
  목록/상세 렌더는 원래 사진이 없으면 "-"로 그리도록 돼 있어 손댈 게 없었다.
  **공부 시간(과목별 학습 내역) 입력은 여전히 필수** — 그게 없으면 인증의 의미가 없어서.
  `sw.js`의 `SW_BUILD`도 `2026-08-25-4`로 올림.
- 2026-08-25 (3차): **게시판 글이 하나도 안 보이던 계정들 수정(RLS 함수 NULL 버그)** +
  주간 미인증 벌칙 기준 1~4회 제한. `sw.js`의 `SW_BUILD`도 `2026-08-25-3`으로 올림.
  - **증상**: ssp2 계정으로 로그인하면 공부인증 탭이 "아직 공부 인증이 없어요!"로 비어 보임
    (실제로는 글이 있음). 루틴 현황판은 정상이라 게시판 데이터만 안 오는 상황이었음.
  - **원인**: `posts`/`comments`의 SELECT 정책이 `NOT is_external(auth.uid())`인데, 이
    SECURITY DEFINER 함수가 `select coalesce(ur.is_external,false) from user_profiles up
    join user_roles ur ...` 형태라 **행 자체가 없으면(=user_roles에 그 학번 행이 없으면)
    NULL을 반환**했다. `NOT NULL = NULL`이라 정책이 통과되지 않아 글/댓글이 전부 필터링됨.
    coalesce가 컬럼에만 걸려 있고 서브쿼리 전체에는 안 걸려 있던 것 — 마이그레이션
    `fix_is_external_null_hides_all_posts`로 서브쿼리 전체를 감싸 "행 없으면 false"로 고쳤다.
    **프론트 배포와 무관한 DB 함수 수정이라 새로고침만 하면 즉시 반영된다.**
  - **영향 범위가 넓었음**: `user_roles` 행이 없는 계정이 16개(30103·30104·30105·30106·30108·
    30109·30111·30116·30118·30119·30121·30124·30128·ssp2·Teacher·Test) — 이 계정들은 전부
    자유/질문/버그 게시판과 공부인증, 댓글이 통째로 안 보이는 상태였다. `user_roles` 행은
    관리자 탭에서 권한을 한 번이라도 만졌을 때만 생기는 구조라 대부분의 학생에게 행이 없다.
    ⚠️ **앞으로 RLS 정책에 SQL 함수를 쓸 땐 "행이 없을 때 NULL이 되는지"를 항상 확인할 것.**
  - **벌칙 기준 상한 4**: number input의 `min/max`는 직접 타이핑한 값을 막지 못해서
    `penalty_threshold=67676767`이 저장돼 현황판이 "이번주 미인증 1/67676767"로 깨져 있었다.
    입력칸 max를 7→4로 낮추고, `saveRoutine()`에서 `clampPenaltyThreshold()`로 1~4로 강제하며
    (범위를 벗어나면 토스트로 알림), 표시(현황판 타일/루틴 목록/수정 폼)에서도 clamp해서 옛
    데이터가 남아 있어도 깨져 보이지 않게 했다. DB에도 마이그레이션
    `clamp_routine_penalty_threshold_to_4`로 기존 값 보정(67676767→4, 8→4) + `check
    (penalty_threshold between 1 and 4)` 제약을 추가.
- 2026-08-25 (2차): **공부인증 사진 여러 장(최대 5장) 첨부**. `sw.js`의 `SW_BUILD`도
  `2026-08-25-2`로 올림.
  - **스키마**: `posts.image_urls`(text[], nullable) 컬럼 추가(마이그레이션
    `add_image_urls_to_posts`). **기존 `image_url`(단일)은 그대로 두고 첫 번째 사진을 계속
    채운다** — 옛 글과 다른 화면(자유게시판 렌더, 게시글 DM 공유 등)이 `image_url`만 보고
    있어서, 그쪽 코드를 하나도 안 건드리고도 계속 동작하게 하기 위함. 읽을 땐 항상
    `postPhotoUrls(p)` 헬퍼를 쓸 것(`image_urls`가 있으면 그걸, 없으면 `image_url` 한 장).
  - **글쓰기**: `#sc-photo`에 `multiple` 추가. ⚠️ `input[type=file][multiple]`은 고를 때마다
    `files`가 **통째로 교체**되므로(추가가 아님) 여러 번 나눠 고르는 걸 지원하려면 별도 배열
    (`scPhotoFiles`)에 누적하고 `input.value=''`로 비워야 한다(안 그러면 같은 파일 재선택 시
    change 이벤트가 안 뜸). 미리보기 blob URL도 `scPhotoPreviewUrls`에 들고 있다가 다시 그릴
    때마다 revoke. 장당 10MB/최대 5장 제한이며 초과분은 토스트로 알리고 제외한다.
  - **업로드**: 순차 업로드하며 버튼에 "(2/4)" 진행 표시. 한 장이라도 실패하거나 insert가
    실패하면 `bail()`이 **이미 올라간 파일을 스토리지에서 지우고** 되돌린다(고아 파일 방지).
  - **보기**: 목록 썸네일은 첫 장 + `+N` 배지, 상세(댓글) 패널엔 사진 전부를 그리드로.
    라이트박스가 **여러 장 갤러리**를 지원하도록 바뀜(`openLightboxGallery(urls,idx)`,
    좌우 버튼 + "2 / 3" 카운터 + ←/→/Esc 키). 기존 `openLightbox(url)`은 길이 1짜리 갤러리로
    위임하므로 다른 호출부는 그대로 둬도 됨. 인라인 onclick에 배열을 넘기지 않으려고
    글 id → 사진 배열 맵(`scGalleryMap`)에 담고 `openPostGallery(postId,idx)`로 연다.
  - **삭제**: `deletePost()`가 권한 확인 쿼리에서 `image_url,image_urls`를 같이 읽어 **사진을
    전부** 스토리지에서 지운다(인자로 받던 `imageUrl`은 그 조회 실패 시의 폴백으로만 남음).
  - 검증: 파일 선택/상한(5장)/개별 삭제/전체 삭제/10MB 초과 제외/사진 없이 제출 시 검증 문구,
    목록 `+N` 배지·상세 그리드·갤러리 이동(순환 포함)·옛 글(한 장) 호환을 브라우저에서 확인.
    **실제 스토리지 업로드 경로는 로컬 테스트에서 Supabase가 스텁이라 검증 못 함** — 실기기에서
    한 번 올려볼 것.
- 2026-08-25: **쪽잠 알람이 안 울리던 문제 수정 + "이어폰에서만 소리" 정책 추가**
  (사용자가 "꼬끼오 알람" 앱을 참고하라고 요청 — 수업 중 쪽잠용이라 교실 전체에 울리면 안 됨).
  `sw.js`의 `SW_BUILD`도 `2026-08-25-1`로 올림.
  - **안 울린 원인**: 브라우저 자동재생 정책상 `AudioContext`는 "사용자가 직접 누른 순간"에
    만들거나 `resume()`해야 소리를 낼 수 있는데, 기존 `playBeep()`은 AudioContext를 **알람이
    울리는 시점(setInterval 콜백 = 제스처 아님)** 에 처음 생성했다. 그래서 suspended 상태로
    태어나 `osc.start()`를 해도 아무 소리가 안 났다. `unlockAudio()`를 추가해 타이머 **시작
    버튼 onclick 안에서**(startCountdown 첫 줄) 미리 열고 무음 버퍼를 한 번 재생해 활성화하며,
    `playBeep()`도 매번 `state==='suspended'`면 `resume()`한다.
    ⚠️ 이 원인은 **로컬에서 재현하지 못했다** — headless Chromium은 자동재생 정책이 느슨해서
    제스처 없이 만든 컨텍스트도 `running`으로 나온다(테스트로 확인). 모바일 사파리/크롬의
    공개된 정책에 근거한 수정이며, 실제 기기에서 여전히 안 울리면 이 가정부터 다시 볼 것.
    (직전 커밋의 wake lock도 같은 증상에 기여했었음 — 화면이 꺼지면 탭이 재워져 setInterval
    자체가 안 돌아서 알람이 늦게 울렸다.)
  - **소리 정책**(쪽잠 알람에만 적용, 모의고사 알람은 예전처럼 항상 소리):
    `napAlarmMode` = `earphone`(기본) / `always` / `silent`,
    `localStorage['bugwang_nap_alarm_mode']`에 저장. 쪽잠 카드 안 "🎧 알람 소리" 박스에서 선택.
    소리를 안 낼 땐 진동도 안 하고(교실에서 책상 진동도 소음), 대신 알람 오버레이가
    `.silent` 클래스로 **파랑↔검정 번쩍임**(`timer-alarm-flash`)을 하고 왜 조용한지 문구를 띄운다.
  - ⚠️ **웹에는 "이어폰이 꽂혔는지" 알려주는 API가 없다.** `enumerateDevices()`의 오디오 장치
    **라벨**(AirPods/헤드셋/이어폰 등)로 추정하는 게 최선인데, 라벨은 **마이크 권한을 한 번
    허용해야만** 채워진다. 그래서 `detectEarphones()`는 `'yes'|'no'|'unknown'` 3값을 돌려주고,
    `unknown`이면(권한 없음/아이폰 사파리 등) **소리를 내지 않는다**(교실 사고 방지). 대신
    그 상태를 쪽잠 카드에 주황색으로 그대로 적어주고("자동 확인 불가 → 소리로 깨려면 항상
    소리를 고르세요"), 원하면 `requestEarphoneDetection()`으로 마이크 권한을 한 번 허용해
    자동 감지를 켤 수 있게 했다(녹음은 안 하고 즉시 track stop). 상태 갱신은 `devicechange`
    이벤트 + 탭 진입 + 타이머 시작 시점 + 쪽잠이 도는 동안 15초마다.
  - `triggerTimerAlarm(title, type)`으로 시그니처가 바뀌었다 — 호출부(tickCountdown,
    resumeCountdownIfAny)에서 반드시 type('nap'|'exam')을 넘길 것.
- 2026-08-24 (8차): **화면 꺼짐 방지를 "타이머" 페이지(쪽잠/모의고사/스톱워치)까지 확대**.
  7차에서 열품타(학습 플래너) 타이머에만 적용했는데, 사용자가 말한 "타이머"는 사이드바의
  **타이머 페이지**였음 — 같은 wake lock 로직을 그쪽 타이머 전부에 연결했다.
  `sw.js`의 `SW_BUILD`도 `2026-08-24-8`로 올림.
  - `screenShouldStayAwake()`가 이제 다음 중 하나라도 참이면 화면을 잡는다: 열품타 타이머
    실행 중 / 전체화면 타이머 열림 / **쪽잠·모의고사 카운트다운이 도는 중(일시정지는 제외)** /
    **스톱워치 실행 중** / **알람 오버레이(`#timer-alarm-overlay.open`)가 울리는 중**.
    뒤 세 가지 판정은 `miscTimerRunning()` 헬퍼(타이머 섹션에 선언)로 뺐고, 선언 순서 때문에
    타이머가 죽는 일이 없게 호출부를 try/catch로 감쌌다.
  - **알람까지 포함시킨 이유**: 이 페이지의 알람은 `setInterval`(tickCountdown 250ms) 기반이라
    화면이 꺼져 브라우저가 탭을 재우면 제때 안 울린다 — 화면을 잡아두는 게 표시뿐 아니라
    알람 동작 자체의 신뢰성 문제였음. 알람이 울리는 동안에도 (확인 누르기 전까지) 화면 유지.
  - `syncScreenWakeLock()` 호출 지점 추가: `beginCountdownUI()`(시작·새로고침 이어받기 공통),
    `togglePauseTimer()`, `cancelTimer()`, `toggleStopwatch()`, `resetStopwatch()`,
    `triggerTimerAlarm()`, `dismissTimerAlarm()`, `resumeMiscTimersOnLoad()`.
    추가로 **5초 감시 인터벌**(`setInterval(syncScreenWakeLock,5000)`)을 하나 둬서, 브라우저가
    조용히 lock을 회수해간 경우를 어떤 타이머에서든 공통으로 되잡는다.
  - 타이머 페이지 상단에 토글(`#page-wake-btn`) 추가 — 전체화면 타이머의 ☀ 버튼과 **같은 설정**
    (`localStorage['bugwang_keep_screen_on']`)을 공유한다. 라벨/알약은 설정값이 아니라 **실제
    상태**를 적는다: `작동 중`(lock 잡음) / `켜짐`(설정만 켜짐, 아직 잡을 상황 아님) / `꺼짐` /
    `실패`(기기가 거부 — 저전력 모드) / `미지원`. 이렇게 한 이유는 "설정은 켜져 있는데 기기가
    거부해서 안 되는" 상황을 사용자가 구분할 방법이 없었기 때문.
  - ⚠️ `navigator.wakeLock.request()`는 **비동기**라, `syncScreenWakeLock()`이 동기적으로 부르는
    `updateWakeLockBtn()` 시점엔 아직 lock이 안 잡혀 있다. 처음엔 그 상태를 "실패"로 그려서
    타이머를 켤 때마다 빨간 "기기가 거부했어요"가 몇 초씩 번쩍였음 — `finally`에서 결과를 갖고
    한 번 더 갱신하고, 실패 표시는 **실제로 거부당한 근거(`wakeLockNextTry` 쿨다운)가 있을 때만**
    나오게 고침. 비슷한 UI를 또 만들 일이 있으면 이 순서 문제를 먼저 떠올릴 것.
  - 참고: 이 앱은 **GitHub Pages**로 배포된다(`pages build and deployment` 워크플로가 main
    push마다 자동 실행). Netlify 프로젝트(`bg301dashboard`)도 계정에 남아있지만 2026-07-15
    수동 드롭 배포가 마지막이고 GitHub와 연결돼 있지 않은 **죽은 사이트**다 — 헷갈리지 말 것.
- 2026-08-24 (7차): **폰/패드에서 타이머를 켜두면 화면이 자동으로 꺼지던 문제 해결 —
  Screen Wake Lock 적용**. 타이머가 도는 동안(또는 전체화면 타이머를 열어둔 동안)
  `navigator.wakeLock.request('screen')`으로 화면 꺼짐(기기 자동 잠금)을 막는다.
  `sw.js`의 `SW_BUILD`도 `2026-08-24-7`로 올림.
  - 관련 함수는 전부 `// ── 화면 꺼짐 방지 (Screen Wake Lock) ──` 블록에 모여 있음:
    `screenShouldStayAwake()`(지금 화면을 켜둬야 하는 상태인지 판정) / `acquireScreenWakeLock()` /
    `releaseScreenWakeLock()` / `syncScreenWakeLock()`(상태 보고 알아서 잡거나 놓음) /
    `toggleWakeLockPref()` / `updateWakeLockBtn()`.
  - **wake lock은 한 번 잡으면 끝이 아니다** — 탭이 백그라운드로 가거나 화면이 한 번이라도
    꺼지면 브라우저가 회수해간다. 그래서 (1) `visibilitychange`에서 화면이 다시 보일 때마다
    `syncScreenWakeLock()`으로 다시 잡고, (2) 타이머 인터벌 tick과 전체화면 타이머 tick에서도
    매초 `screenWakeLock`이 비어있으면 다시 요청한다. 요청 실패(배터리 절약 모드 등) 시엔
    30초 쿨다운(`wakeLockNextTry`)을 둬서 매초 재시도로 배터리를 갉아먹지 않게 함.
  - `syncScreenWakeLock()` 호출 지점: `attachTimerInterval()`(시작·재개·이어받기 공통 경로),
    `pauseCurrentTimer()`, `stopCurrentTimer()`, `handleRemoteTimerSync()`의 stopped 분기,
    `openTimerView()`, `closeTimerView()`. 전체화면을 닫아도 타이머가 계속 돌면 lock은 유지됨.
  - 전체화면 타이머 상단바에 토글 버튼(`#tf-wake-btn`, `toggleWakeLockPref()`) 추가 —
    기본값 켜짐, 설정은 `localStorage['bugwang_keep_screen_on']`(`'0'`이면 끔)에 저장.
    좁은 화면(≤520px)에선 라벨을 숨기고 아이콘만 남기며, 상단바가 두 줄로 깨지지 않게
    날짜 폰트/좌우 패딩/간격도 함께 줄였음.
  - 지원 범위: 안드로이드 크롬 84+, iOS 사파리 16.4+. 미지원 기기에선 버튼이 "화면 켜둠 미지원"
    으로 흐리게 표시되고, 타이머 시작 시 1회만 "설정에서 화면 자동 잠금 시간을 늘려주세요"
    토스트를 띄운다(미지원 기기에 쓸 수 있는 다른 우회 수단은 없음).
- 2026-08-24 (6차): **대학별 환산점수 계산기 — 사용자 제공 검증 보고서 기반 6개 대학 배점표
  수정 + 한국공학대 신규 추가 (49→50개 대학)**. 사용자가 각 대학 입학처 공식 2027학년도
  수시모집요강 원본 PDF와 대조 검증한 보고서(PDF)를 근거로 제공. `sw.js`의 `SW_BUILD`도
  `2026-08-24-6`으로 올림.
  - **아주대(고교추천)**: 계열 구분 없이 국어·수학·영어·사회·과학 5개 교과 전 과목 반영으로
    변경(기존엔 인문/자연 계열별로 다르게 반영했음 — 오류). 등급점수표
    100·98·96·93·85·70·45·20·0 → **100·99·98·95·90·85·75·65·0**로 수정. 진로선택 반영
    상위 과목 수 3→**5**과목으로 수정. `v:'n'`(미검증)→`v:'f'`(원문확인).
  - **숙명여대(지역균형선발)**: 계열 구분 없이 5개 교과군(한국사는 사회에 포함) 전 과목
    반영으로 변경. 공식 산출식이 `(11-환산석차등급)×70`(700점 만점, 선형)임을 확인해 100점
    환산 시 등급점수표를 100·98·95·90·85·80·70·50·0(비선형) → **100·90·80·70·60·50·40·30·20**
    (선형, 등급당 10점씩 감소)로 수정 — 선형 변환은 "과목별 점수 계산 후 평균"과 "등급 평균
    후 점수 변환"이 수학적으로 동일한 결과를 주므로 기존 엔진(bySpec) 구조를 그대로 재사용할
    수 있었음. 진로선택 반영 방식도 "성취도 A/B/C를 그냥 일반과목과 섞어 단위가중평균"(merge,
    A→1·B→2·C→4등급 가정)에서 **"공통·일반선택 80% + 진로선택(A→1·B→3·C→5등급 환산) 20%"**
    가중합(`career:{mode:'split', pct:0.2, tbl:[100,80,60]}`)으로 구조 자체를 수정 — 예전엔
    "요강에 수치가 공개되지 않아 가정했다"는 `warn`이 붙어 있었는데, 이번에 정확한 근거를
    확인해 그 가정 문구를 제거함.
  - **부산대(학생부교과)**: 등급점수표 100·99·98·96·93·88·75·50·0 →
    **100·99·98·97·96·95·90·60·0**로 수정. 진로선택과목(성취도 A/B/C만 있는 과목)은
    "석차등급이 기재된 과목만 정량 반영"이라는 원문에 따라 **정량 계산에서 완전히
    제외**(`career:{mode:'none'}`)하도록 수정 — 기존엔 A→1·B→2·C→4등급으로 가정해 정량
    반영하고 있었음(오류). 그 가정에 달려있던 `warn`도 제거.
  - **경북대(교과우수자)**: **만점 자체가 800점→400점으로 2배 잘못돼 있던 게 가장 심각한
    오류**(`max:800`→`max:400`) — 등급점수표
    800·776·736·672·584·472·336·176·0 → **400·390·380·370·360·350·300·200·0**로 수정.
    반영교과도 인문/자연 계열별로 다르게 반영하던 것(`hist:true`+track 분기)을 계열 구분
    없이 6개 교과(국·수·영·사·과·한국사) 전 과목 반영으로 수정. 졸업자도 3-2까지 포함되던
    걸 **졸업자·졸업예정자 모두 3-1까지만**(`upTo31:true` 추가)으로 수정. 진로선택 처리
    (`career:{mode:'none'}`, 정성평가만)는 원래도 맞았음 — 변경 없음.
  - **한국공학대학교 신규 추가**(v:'f', 원문확인) — 원자료 순위표(17~54위)에 없어서 기존엔
    계산기에 아예 없던 대학. 사용자 요청으로 공식 모집요강 원문을 새로 조사해 추가. **이
    대학은 기존 `bySpec` 엔진으로 표현이 안 되는 규칙**(일반과목은 교과별 상위 4과목만,
    진로선택은 교과별 최대 2과목만+이수단위 강제로 1, 경영학부는 사회/과학 중 이수단위
    합이 큰 쪽을 선택)이 있어서, 다른 옛 대학들처럼 손으로 쓴 `calc:function(){}`로 구현.
    최종 공식은 `기준점수(M)=Σ(과목별 환산점수×이수단위)÷Σ이수단위, 최종반영점수=5M`
    (500점 만점)을 그대로 구현. 대학 수 표기(`#uc-root`의 안내문, 관련 주석) 49개→50개로
    갱신.
  - **인하대(지역균형)는 J(수능최저) 문구만 수정하고 I(석차등급 환산점수표)는 그대로 둠** —
    보고서가 "4~8등급 구간 값이 공식 문서와 다르다"고만 지적하고 정확한 교체값을 제시하지
    않았고, 직접 인하대 입학처 원문 PDF 링크도 찾지 못해서(WebSearch/WebFetch로 시도했으나
    JS 렌더링 페이지라 실패) **추측으로 숫자를 지어내지 않고** 기존 배점표를 유지한 채
    `warn`으로 "정확한 배점은 원문에서 직접 확인" 안내만 추가함. 대입 지원에 실제로 쓰이는
    데이터라 근거 없는 값을 넣는 것보다 불확실성을 명시하는 게 낫다고 판단.
  - **단국대는 검증 결과 이미 정확해서 변경 없음** — 보고서의 "스프레드시트 기재 내용"
    (오류로 지적된 값)이 이 앱이 아닌 사용자가 검증 대상으로 삼은 **별도의 외부
    스프레드시트**였는데, 대조해보니 이 앱의 기존 단국대 코드(반영비율 95%+출결5%, 반영교과
    계열 무관 5과목, 진로선택 A=1·B=3·C=5등급, 등급점수표 100·99·98·97·96·95·70·40·0)가 이미
    "공식 원본 대조 결과"와 정확히 일치했음. **다른 대학들도 똑같이 "공식 원본 대조 결과"
    컬럼만 이 앱의 기존 코드와 직접 대조**해서 실제로 어긋나는 항목만 수정했고, 보고서의
    "오류"라는 표시를 이 앱 코드가 이미 틀렸다는 뜻으로 오해해 무비판적으로 덮어쓰지 않았음.
  - **검증**: Node로 `index.html`의 계산기 스크립트 블록(SUBS/act()/bySpec 등)만 추출해
    가짜 학생 성적(6개 교과×여러 학기+진로선택 6과목)을 주입한 뒤 7개 대학 `calc()`를 실제로
    호출 — 반영 교과 수·이수단위 가중평균에 따른 예상 과목 수(n)가 각 대학의 교과/학기/상위
    N과목 규칙과 정확히 일치하는지 손계산과 대조해 확인함(예: 부산대 n=31로 진로선택 6과목이
    전부 제외됐는지, 한국공학대 n=19로 교과별 상위4+진로선택 상위2 캡이 정확히 걸렸는지 등).
- 2026-08-24 (5차): **공지 링크 자동 인식 버그 수정 — 한글 슬러그가 중간에 끊기던 문제**
  (제보: 스크린샷과 함께 "bit.ly/2027서진아카이브 이렇게 링크가 되다가 말았음 수정해").
  `sw.js`의 `SW_BUILD`도 `2026-08-24-5`로 올림. 직전(4차) 구현이 URL 본문에서 한글을 통째로
  제외했었는데, 이게 "www.naver.com)도 됩니다"처럼 괄호 없이 한글이 바로 붙는 문장을 막으려던
  의도였음 — 근데 bit.ly 커스텀 슬러그나 위키백과 문서명처럼 URL 경로 자체에 한글이 정상적으로
  들어가는 경우까지 막아버려서, "bit.ly/2027서진아카이브"의 "2027"까지만 링크로 잡히고
  뒤쪽 "서진아카이브"는 링크에서 잘려나가는 버그가 있었음. `linkifyHtml()`의 `noBreak` 문자
  클래스에서 한글 제외를 없애고, 공백·꺾쇠·따옴표·괄호류만 경계로 남김 — 괄호가 이미 그
  케이스를 막아주고 있어서(파서가 `)`에서 멈춤) 한글을 따로 막을 필요가 없었음.
- 2026-08-24 (4차): **공지사항 내용에 링크 자동 인식 추가** (요청: "공지사항에 링크를 올리는
  기능도 있으면 좋겠는데", 이어서 "bit.ly로 시작하는 축약링크들도 ... 클릭가능한 링크가
  되도록"). `sw.js`의 `SW_BUILD`도 `2026-08-24-4`로 올림.
  - 별도 입력칸을 만들지 않고, 기존 공지 내용 textarea에 URL을 그냥 붙여넣으면 목록/상세에서
    자동으로 `<a>` 링크가 되는 방식(`linkifyHtml()`, `escHtml` 바로 아래에 추가) — `escHtml()`로
    전체를 이스케이프한 뒤 그 안에서 URL 패턴만 `<a target="_blank" rel="noopener noreferrer">`
    로 감싼다. `notice-content`의 `${escHtml(n.content)}`를 `${linkifyHtml(n.content)}`로 교체.
  - `https://...`/`www.xxx`뿐 아니라 `bit.ly/abc123`처럼 프로토콜 없는 축약 링크도 인식하되,
    "도메인.TLD/" 형태로 슬래시(경로)가 있을 때만 링크로 잡는다 — 안 그러면 "3.1절"이나
    "대박.진짜" 같은 평범한 문장이 URL로 오인될 수 있어서. 한글 문장이 링크 바로 뒤에 공백 없이
    붙는 경우(예: "(bit.ly/xyz)도 됩니다")까지 URL이 삼켜버리는 걸 막기 위해 URL 본문 문자
    클래스에서 한글/괄호/따옴표류를 제외함. Node로 여러 실제 텍스트 케이스(단축링크+괄호+한글
    조사, 쿼리스트링의 `&`, 문장부호로 끝나는 URL, 슬래시 없는 일반 문장 오탐 방지 등)를 직접
    실행해 검증.
- 2026-08-24 (3차): **공부인증 게시판 표가 모바일에서 잘려 보이던 문제 수정** (제보: 스크린샷과
  함께 "이렇게 폰에서 화면이 짤리는 문제 해결 좀"). `sw.js`의 `SW_BUILD`도 `2026-08-24-3`으로
  올림. `.sc-table`(게시판 목록, CSS Grid+`display:contents` 래퍼 패턴)에는 글쓰기 표
  (`.sc-write-table`)와 달리 모바일 반응형 처리가 없어서, 가로 스크롤에 의존하다 보니 화면
  끝에서 "내용" 칸이 중간에 잘려 보였음. `.sc-write-table`과 동일한 방식으로 834px 이하에서
  그리드 대신 글마다 카드로 세로 쌓이게(`renderStudyCertRow()`의 각 `.sc-cell`에
  `data-label` 속성 추가, `[data-label]::before`로 라벨 표시) 바꿈. 더보기(⋯) 버튼은 카드
  우상단에 고정 배치. 모바일에서는 카드 폭이 넓어 내용 잘림 자체가 덜 문제가 되므로
  `.sc-content-cell`의 줄임표 처리도 해제(항상 줄바꿈으로 전체 표시, 클릭 펼치기는 PC
  전용으로 유지).
- 2026-08-24 (2차): **2학기 시간표로 전면 갱신** (사용자가 30101~30128번 28명분 시간표 캡처
  이미지를 올리고 "이걸로 시간표 수정해줘"). `sw.js`의 `SW_BUILD`도 `2026-08-24-2`로 올림.
  `renderTimetable()`/`getTT()`(index.html:4070 부근)의 `TT_A`/`TT_B`/`TT_C`/`STUDENT_GROUP`
  전체를 1학기 과목(화법과작문/영어독해작문/물리학2A·B/미적분 등)에서 2학기 과목(심화영어Ⅰ/
  독서/물리학Ⅱ/생명과학Ⅱ/화학Ⅱ/지구과학Ⅱ/수학과제탐구/인공지능기초/스포츠생활/진로활동/
  세계문제미래사회/기하)으로 교체. 28명 전원의 이미지를 대조한 결과 실제로는 딱 3가지 패턴
  뿐이라 그룹 3개(A/B/C)로 압축됨 — A(생명과학Ⅱ, 15명)/B(화학Ⅱ+생명과학Ⅱ가 A와 반대로 배치,
  7명)/C(지구과학Ⅱ, 6명). 학생 명단 자체(28명)는 1학기와 동일, 그룹 배정만 과목 변경에 맞춰
  재산정. 수동으로 긴 한 줄짜리 객체 리터럴을 직접 편집하면 오타 위험이 커서, 구조화된 데이터로
  그룹을 만들고 문자열로 직렬화해 파일의 해당 구간만 통째로 치환하는 Node 스크립트(스크래치패드
  `build_timetable.js`)로 작업 — 이후 `Function` 생성자로 실제로 파싱해 28명 전원의 그룹 배정과
  각 요일 배열 길이·특정 셀 값을 재확인함. 화학Ⅱ/생명과학Ⅱ/지구과학Ⅱ는 반마다 다른 "이동수업"
  성격이라 항상 `m:true`(이동 배지) 유지, 물리학Ⅱ는 전원 공통이라 배지 없음(1학기 컨벤션과 동일).
- 2026-08-24: **백엔드 아키텍처 전환 반영 + 여러 편의 기능**. `sw.js`의 `SW_BUILD`도
  `2026-08-24-1`로 올림.
  - **⚠️ 백엔드가 Railway→Supabase Edge Function으로 이미 바뀌어 있었음을 뒤늦게 발견·반영**
    — Railway 무료 체험이 2026-08-14 만료되어 `bugwang-server`(Express+Socket.IO)가 더 이상
    배포되어 있지 않음. 실제 백엔드는 Supabase Edge Function `api`(project
    `pvrgwvfjnebsxnlxaxhc`) 하나로, `SERVER_URL`이 이미 그쪽을 가리키고 있었는데도 이전
    세션들이 이 사실을 모른 채 `bugwang-server`를 계속 고쳐온 상태였음(전부 죽은 코드). 이번
    세션에서 `get_edge_function`으로 실제 배포본을 받아 `notifications.ref_id` 채우기,
    `notify/study-cert`·`notify/study-vote`, DM 활성-열람자 필터링 로직을 반영해 다시
    배포함(version 10). 자세한 내용은 이 파일의 "백엔드" 섹션 참고.
  - **DM "지금 이 방을 보는 중" 상태를 Socket.IO 대신 `dm_active_viewers` 테이블로 재구현**
    — Socket.IO 인프라 자체가 없어졌으므로, `notifyDmViewing()`/`notifyDmLeftView()`가 이제
    이 테이블에 upsert/delete하고, DM 7초 폴링(`pollDmActiveThread()`)마다 하트비트로
    `updated_at`을 갱신. 엣지 함수는 30초 이내 갱신된 행만 "보는 중"으로 인정.
  - **공부 루틴을 여러 개 만들 수 있게** (요청: "루틴을 여러개 설정 가능하게 해줘") — 예전엔
    학생당 활성 루틴이 1개로 제한(새로 저장하면 이전 루틴 자동 비활성화)이었는데, 이제 여러 개
    동시에 유지 가능. "⏰ 루틴 설정" 모달이 목록 화면(내 루틴들 + "+ 새 루틴 추가")과 입력/수정
    폼 화면 두 단계로 나뉨(`openRoutineModal`/`openRoutineForm`/`backToRoutineList`). 전역
    상태를 `myActiveRoutine`(단수) 대신 `myRoutines`(배열)로 교체. 공부인증 글쓰기 페이지의
    루틴 연결도 자동 연결 대신 드롭다운 선택형(`#sc-routine-select`, "연결 안 함" 옵션 포함)
    으로 바뀜 — 루틴이 여러 개면 어느 루틴에 대한 인증인지 골라야 하므로. DB 스키마/RLS 변경
    없음(원래도 student_id당 여러 행이 허용됐고, 프론트가 "활성 1개만" 규칙을 자체적으로
    강제하고 있었을 뿐).
  - **공부인증 글 내용이 길면 잘려서 안 보이던 문제 수정**(제보: "인증글이 길 경우에 글이 안
    보여") — `.sc-content-cell`이 `white-space:nowrap`+`text-overflow:ellipsis`로 항상
    한 줄만 보여줬는데, 클릭하면 `.expanded` 클래스가 토글되며 줄바꿈 허용(`white-space:pre-wrap`)
    상태로 펼쳐지게 함.
  - **모의고사용 타이머에 일시정지 기능 추가**(요청: "모고 타이머에 정지 기능 만들어줘") —
    시작 후 "일시정지" 버튼(`togglePauseTimer('exam')`)을 누르면 카운트다운/아날로그 시계가
    멈추고, "재개"를 누르면 멈춘 시점부터 이어서 흐른다(멈춰있던 시간만큼 시험 종료 시각이
    뒤로 밀림 — 실제 시험처럼 일시정지 자체가 없는 게 아니라 자습용 실전 연습 도구이므로 이
    편이 자연스럽다고 판단). 새로고침해도 일시정지 상태 그대로 이어받음(`localStorage`에
    `paused`/`pausedRemainMs` 함께 저장). 쪽잠 타이머 쪽 UI에는 버튼을 추가하지 않아 그쪽
    동작은 그대로(요청이 "모고 타이머"로 한정됐으므로).
- 2026-08-22 (6차): **열품타(학습 플래너) 페이지 상단에 사용법 안내 카드 추가** (요청: "열품타
  기능 상단에 열품타 사용법 좀 제시해"). `sw.js`의 `SW_BUILD`도 `2026-08-22-6`으로 올림.
  과목 추가→타이머 시작→전체화면 랭킹→날짜 넘겨보기→과목 색상 변경까지 5단계로 요약.
  `togglePlannerGuide()`로 접고 펼 수 있고, 접은 상태는 `localStorage`(
  `bugwang_planner_guide_collapsed`)에 기억해서 한 번 접으면 다음에 또 안 펼쳐짐.
- 2026-08-22 (5차): **DM을 읽거나 공지 페이지를 직접 보면 관련 알림도 자동으로 읽음 처리**
  (요청: "dm을 읽거나,공지사항을 직접 보면 걍 알람은 자동으로 읽음처리 해줘"). `sw.js`의
  `SW_BUILD`도 `2026-08-22-5`로 올림. 백엔드 변경 없음(프론트만).
  - 이전 알림 그룹 읽음 처리(같은 DM방/글 알림을 하나만 눌러도 다 같이 읽음) 로직을
    `openNotifItem()`에서 재사용 가능한 `markNotifGroupRead(type,refId)`(같은 type+ref_id만
    묶음) / `markNotifTypesRead(types)`(ref_id 무관하게 타입째로) 두 함수로 뽑아냄.
  - **DM**: `openDmThread(roomId)`가 방을 열 때마다 `markNotifGroupRead('dm-message',roomId)`
    호출 — 알림센터를 안 거치고 사이드바→DM으로 직접 들어가 방을 열어도 그 방 알림이 꺼짐.
  - **공지**: `navigate('notice')`가 `markNotifTypesRead(['notice','poll-vote'])` 호출 —
    poll-vote는 투표마다 ref_id(poll_id)가 달라 그룹 단위로는 못 묶어서 타입째로 지움(공지
    페이지에 들어가면 어차피 전체가 다 보이니까). **주의**: `loadNotices()` 자체(대시보드
    미리보기용으로 로그인 직후에도 호출됨)에는 안 걸고 `navigate()`의 `page==='notice'`
    분기에만 걸어서, 로그인만 해도 알림이 조용히 지워지는 걸 방지함 — 실제로 공지 "페이지"에
    들어갈 때만 지워짐.
- 2026-08-22 (4차): **DM 방을 보고 있는 동안엔 그 방 알림이 안 오게** (요청: "dm창을 a라는
  인물과 켜놓고 하고 있다면 그 사람에게 오는 메세지 알람은 오지않게 해줘야지"). `sw.js`의
  `SW_BUILD`도 `2026-08-22-4`로 올림.
  - **백엔드**: 기존 캠스터디용 소켓(모든 로그인 세션이 이미 연결해둠, `connectStudySocket()`)
    에 `dm:open`/`dm:close` 이벤트를 추가하고, 학번별로 "지금 보고 있는 방"을 참조 카운트로
    추적하는 `dmViewerCounts`(Map). 여러 기기/탭에서 같은 방을 동시에 열어도 한쪽만 닫혔다고
    억제가 풀리면 안 되므로 카운트 방식(0이 될 때만 실제로 해제). `/api/notify/dm-message`가
    수신자 목록에서 `isViewingDmRoom(student_id, room_id)`인 사람을 걸러내서, 그 사람에게는
    푸시도 알림센터 기록도 아예 안 남는다.
  - **프론트**: `openDmThread()`가 스레드를 열 때마다 `dm:open`을 보내고(같은 소켓에서 다른
    방을 열면 서버가 자동으로 이전 방을 먼저 빼줌), 방을 나가는 모든 경로(모바일 뒤로가기
    `closeDmThreadMobile()`, 단톡방 나가기 `leaveDmRoom()`, DM 페이지를 완전히 벗어나는
    `navigate()`)에서 `dm:close`를 보낸다. 탭을 백그라운드로 보내면(다른 앱 전환 등) 소켓
    자체는 최대 90초까지 안 끊겨서 그동안 알림이 계속 억제될 수 있어, `visibilitychange`로
    탭이 안 보이자마자 즉시 `dm:close`, 다시 보이면 `dm:open`으로 재개.
- 2026-08-22 (3차): 편의성 업데이트 일괄 적용(연속 인증 스트릭, 알림 그룹 읽음 처리, 공지
  페이지 새로고침 누락 수정, DM 전송 최적화 + 읽음 표시, 공부인증 글쓰기 표 모바일 대응,
  "학습 플래너"→"열품타" 명칭 변경). `sw.js`의 `SW_BUILD`도 `2026-08-22-3`으로 올림. DB
  마이그레이션 1건: `notifications.ref_id`(text, nullable).
  - **연속 인증 스트릭**(`computeStudyStreak()`) — 상단 현황판 타일에 "🔥 N일 연속" 배지.
    오늘 인증을 아직 안 했어도 하루가 안 끝났으니 스트릭이 끊긴 걸로 안 치고 어제부터
    거꾸로 셈. `renderStudyRoutineBoard()`의 조회 기간을 이번 주(주간 미인증 집계용)에서
    최근 90일(스트릭 계산용)로 늘려서 한 번의 쿼리로 둘 다 계산.
  - **알림 그룹 읽음 처리**(요청: "동일 알람이 여러개 왔을때 ... 하나만 누르면 나머지도
    읽은 취급") — `notifications.ref_id` 컬럼 추가하고, 백엔드 `insertNotifications()`에
    파라미터로 추가. dm-message는 room_id, comment/poll-vote/study-cert/study-vote는
    post_id/poll_id로 채우고, notice/teacher-message/camstudy-join은 null로 둬서 타입
    전체가 한 그룹(같은 페이지로 다 모여 보이니까). 프론트 `openNotifItem()`이 클릭한
    알림과 같은 (type, ref_id)인 다른 안읽은 알림도 함께 읽음 처리.
  - **공지 페이지가 새로고침 안 되던 버그 수정**(제보: "투표같은 수정사항이 생겼을때
    알람으로들어가면 수정이 안돼있어서 다시 눌러야하는데") — `navigate()`가 free-board/
    qna-board/bug-report/dm은 페이지 전환마다 다시 불러오는데 `notice`만 그 목록에 없어서,
    다른 페이지에 있는 동안 투표 결과 등이 바뀌어도 공지 페이지로 넘어올 때 예전 상태
    그대로 보였음. `if(page==='notice')loadNotices();` 한 줄 추가로 다른 게시판들과
    동일하게 맞춤(사이드바로 직접 들어갈 때도 항상 최신으로 보임 — 알림 경유든 아니든 동일).
  - **DM 전송 지연 개선**(제보: "디엠 보내지는데 텀이 좀 있어") — `sendDmMessage()`가
    예전엔 보낸 뒤 `loadDmMessages()`(최근 200개 통째로 재조회 + 안에 있는 사진 전부
    서명URL 재발급) → `markDmRoomRead()` → `loadDmRooms()`를 전부 순서대로 기다린 뒤에야
    화면이 반응했음. 이제 방금 보낸 메시지 한 줄만 그리고(`appendDmMessage()`,
    `dmMessageRowHtml()`로 렌더 로직 공유) 나머지는 기다리지 않고 백그라운드로 돌림.
    `hydrateDmPhotoUrls()`도 이미 서명URL을 받은 이미지(`el.src`가 이미 있음)는 건너뛰게
    고쳐서, 보낼 때마다/폴링마다 사진 많은 방의 서명URL을 전부 다시 받아오던 낭비도 제거.
  - **DM 읽음 표시** — 내가 보낸 마지막 메시지 밑에 상대(1:1) 또는 단톡방 참가자 전원이
    `dm_participants.last_read_at` 기준으로 다 읽었으면 "읽음", 그룹인데 일부만 읽었으면
    카카오톡처럼 안 읽은 인원 수(`renderDmReadReceipt()`)를 표시. 폴링마다(새 메시지가
    없어도) 갱신해서 상대가 나중에 읽으면 반영됨.
  - **공부인증 글쓰기 표 모바일 대응**(제보: "모바일에서 글쓰기 기능을 하면 가로로 봐야
    다 보인다") — 834px 이하에서 `.sc-write-table`을 가로 스크롤 표 대신 줄마다 세로
    카드로 쌓음(각 `<td>`의 `data-label` 속성이 라벨로 보임).
  - **"학습 플래너" → "열품타"로 명칭 변경** — 사이드바 메뉴/페이지 제목/대시보드 바로가기/
    마이페이지 안내문/투어 가이드 등 사용자에게 보이는 문구만 교체(내부 함수명·변수명·주석은
    안 건드림, 예: `page-planner`/`loadPlannerViewDateData()` 등 그대로).
- 2026-08-22 (2차): 두 가지 개선. `sw.js`의 `SW_BUILD`도 `2026-08-22-2`로 올림.
  - **루틴 인증 시간이 다음날 새벽까지도 가능하게** (요청: "인증 시간은 다음날 오전 n시까지도
    가능하게 해줘") — `study_routines`에 `deadline_next_day`(boolean) 컬럼 추가(마이그레이션).
    루틴 설정 모달의 "인증 시간"에 "오늘 안에"/"다음날 새벽" 선택지를 추가하고, 상단 현황판
    타일에도 `fmtDeadlineLabel()`(예: "다음날 오전 2시까지")로 표시. **주의**: 이 값은 표시용
    정보일 뿐, "이번 주 미인증" 계산 로직은 여전히 그날 날짜로 인증 글이 있는지만 보고 시각까지
    엄격히 비교하지는 않음(기존 방침 유지) — 자정 넘겨 공부한 걸 인증할 땐 글쓰기 페이지에서
    `study_date`를 전날로 직접 선택하면 그 날짜 인증으로 잡힌다.
  - **공부인증 글쓰기 표의 시/분 입력칸이 잘려서 안 보이던 버그 수정** (제보: "여기 몇분인지
    나타나는거 짤린다") — CSS가 실제 클래스(`sc-log-hour`/`sc-log-min`)가 아니라 존재하지
    않는 `.sc-log-hm`을 가리키고 있어서 너비 지정이 통째로 안 먹고 있었음(`.modal-input`의
    `width:100%`가 flex 컨테이너 안에서 다른 요소들과 나눠 가지며 극도로 좁아짐). 실제
    클래스명으로 고치고 `width:56px;flex:none`으로 명시.
- 2026-08-22: **공부 루틴 + ㅇㅈ/ㄴㅇㅈ 인증 투표 + 공부인증 글쓰기 전면 개편** (요청: "공부
  루틴 설정과 ㅇㅈ기능을 만들고싶어 ... 벌칙설정도 같이하는데 ... 인증을 하면 다른
  사람들에게 알람이 가고 ... ㅇㅈ,ㄴㅇㅈ버튼을 누르게 해줘 ... 상단에 네모박스로 ... 글쓰기를
  누르면 위에 뜨는게 아니라 걍 창이 바뀌게 ... 가로로 넓게"). `sw.js`의 `SW_BUILD`도
  `2026-08-22-1`로 올림. **DB 마이그레이션 2건**: `study_routines`(student_id/user_id/subject/
  task/deadline_time/penalty_threshold/penalty_desc/is_active, RLS는 SELECT 전체공개+쓰기는
  본인만 — post_likes와 동일한 컨벤션), `posts.routine_id`(FK→study_routines, on delete set
  null), `post_verifications`(post_id+student_id PK, vote 'ojd'/'nojd' — post_likes와 완전히
  동일한 패턴). **백엔드(`bugwang-server`)에 알림 API 2개 추가**: `/api/notify/study-cert`
  (인증 작성 시 본인 뺀 학급 전체 방송, camstudy-join과 동일 패턴), `/api/notify/study-vote`
  (누가 ㅇㅈ/ㄴㅇㅈ 누르면 작성자에게만, poll-vote와 동일 패턴) — **이 백엔드 커밋은 별도
  저장소라 로컬엔 있지만 push 실패(토큰 인증 오류)로 아직 Railway에 반영 안 됐을 수 있음,
  사용자가 토큰 갱신 후 직접 push 필요**.
  - **공부 루틴**: 학생당 활성 루틴 1개(과목/과제/인증시간/주간 벌칙 기준/벌칙 내용 선택),
    "⏰ 루틴 설정" 모달(`openRoutineModal`/`saveRoutine`/`deactivateRoutine`)에서 관리. 새로
    저장하면 이전 루틴은 `is_active=false`로만 바꾸고 남겨둠(기록 보존). 반 전체가 서로의
    루틴을 볼 수 있음(RLS SELECT 전체공개) — 요청의 "상단 네모박스" 자체가 이미 공개 전제.
  - **상단 현황판**(`renderStudyRoutineBoard()`, `#study-routine-board`) — 활성 루틴이 있는
    학생마다 네모박스 하나: 아바타/이름/과목·과제, 오늘 인증 여부(✅/❌), 이번 주 미인증
    횟수(오늘은 아직 안 끝난 하루라 미인증 집계에서 제외 — 어제까지만 셈). 미인증 횟수가
    벌칙 기준 이상이면 박스 테두리가 빨갛게(`.at-risk`) 강조됨. 주 경계는 기존 컨벤션과 동일한
    월요일 시작(`weekStartStr()`, `getPieRangeStart()`와 같은 공식).
  - **ㅇㅈ/ㄴㅇㅈ 투표**: 공부인증 표의 "좋아요" 컬럼을 "인증" 컬럼으로 교체(`voteStudyCert()`,
    `post_verifications`) — post_likes/toggleLike()와 동일한 낙관적 업데이트+upsert 패턴이라
    새 개념을 따로 안 만들고 재사용. 투표하면 글쓴이에게 study-vote 알림 발송(본인 글 제외).
  - **글쓰기를 모달→전용 페이지로 전환**(요청: "글쓰기를 누르면 위에 뜨는게 아니라 걍
    창이 바뀌게") — `page-notice-write`와 동일한 패턴(`openStudyCertWritePage()`/
    `closeStudyCertWritePage()`가 `navigate('free-board')` 호출). 활성 루틴이 있으면 이
    인증이 자동으로 그 루틴에 연결된다는 안내(`#sc-routine-hint`)와 함께 `routine_id`를
    같이 저장 — 별도 연결 여부 선택 UI는 만들지 않음(한 명당 루틴이 하나뿐이라 항상 그
    루틴에 연결하는 게 자연스러움).
  - **과목별 학습 내역을 실제 `<table>`로 교체**(요청: "밑으로 쭉 나열하니까 안 예뻐 ...
    가로로 넓게") — 기존엔 `.sc-log-row`가 flex-row div를 세로로 쌓았는데, 이제 진짜
    `<table class="sc-write-table">`의 `<tr>`(과목 셀렉트/과제 입력/시간 입력이 한 줄에
    가로로 나열)로 바뀜. 등록/삭제/합계 계산 로직(`addScLogRow`/`removeScLogRow`/
    `scLogRowsData`/`recomputeScTotal`)은 DOM 태그만 div→tr/td로 바뀌고 그대로 재사용.
  - 검증: 이번에도 Node vm 하네스로 실행 — `renderStudyCertRow()`가 만드는 ㅇㅈ/ㄴㅇㅈ
    버튼의 active 클래스(내 투표 여부)가 목데이터대로 정확히 찍히는지, `weekStartStr()`가
    실제 날짜에 대해 올바른 월요일을 돌려주는지, `renderStudyRoutineBoard()`가 빈 상태에서
    예외 없이 도는지 확인. 실제 DB 왕복이 필요한 저장/투표/알림 함수(saveRoutine 등)는
    post_likes 등 기존에 검증된 패턴과 동일 구조라 코드 리뷰로만 검증.
- 2026-08-21 (2차): **공부인증 글쓰기를 과목별 상세 학습 내역으로 확장** (요청: "공부기록을
  좀 더 자세하게 적을 수 있게 해줘, 언제(며칠)의 공부인증인지 고르게 해주고 과목선택-과제-시간
  으로 구성, 학습 기록 불러오기는 그 날짜의 플래너 과목-과제-시간을 불러오게"). `sw.js`의
  `SW_BUILD`도 `2026-08-21-2`로 올림. `posts`에 `study_date`(date)/`study_log`(jsonb,
  `[{subject,task,seconds}]`) 컬럼 추가(마이그레이션) — `study_seconds`는 그대로 두고 이제
  "합계"로만 씀.
  - 모달에 **인증할 날짜**(`#sc-date`, 기본 오늘, 미래 선택 불가) 선택칸 추가 — 작성일과
    인증 대상 날짜가 다를 수 있어서(전날 공부를 다음날 아침에 인증하는 경우 등).
  - **과목별 학습 내역을 여러 줄로 입력**(`#sc-log-rows`) — 줄마다 과목(`subjects` 전역 배열
    기준 드롭다운)/과제(자유 텍스트)/시간(시·분)이고 "+ 과목 추가"로 줄을 늘리거나 ×로 뺄 수
    있음. 합계(`recomputeScTotal()`)가 실시간으로 갱신됨.
  - **"학습 기록 불러오기"가 선택한 날짜 기준으로 동작하도록 변경** — 예전엔 무조건 "오늘"만
    봤는데, 이제 `#sc-date`에서 고른 날짜의 `study_sessions`를 과목+과제로 그룹핑해서(학습
    플래너의 "다른 날짜 기록은 같은 과제끼리 합산" 컨벤션과 동일) 줄 단위로 그대로 채워줌.
    고른 날짜가 오늘이면 진행 중인 세션의 실시간 경과분까지 포함, 과거 날짜면 완료된 세션만.
  - **목록/상세 표시**: 표의 "날짜" 컬럼이 이제 작성 시각 상대시간(`formatRelativeTime`)
    대신 인증 대상 날짜를 절대 날짜로 보여줌(`fmtStudyDateLabel()`, 예: "8월 20일(목)") —
    옛 글(마이그레이션 이전, `study_date` 없음)은 `created_at` 날짜로 폴백. 댓글 패널을 열면
    (댓글 아이콘 또는 공부시간 값 클릭) 위쪽에 과목별 학습 내역 요약(`renderStudyLogSummary()`)
    도 함께 보임 — `study_log` 없는 옛 글은 조용히 생략.
  - 검증은 이번에도 Node vm 하네스로 `renderStudyCertTable()`을 study_date/study_log 있는
    목데이터·없는 목데이터 둘 다로 실행해 날짜 폴백과 요약 생략이 의도대로 동작하는지 확인.
- 2026-08-21: **자유게시판 "공부인증" 탭만 전용 표 형태 UI로 리디자인** (요청: 참고 이미지
  2장 전달 — 학원 플랫폼의 "BEST 일일과제" 표 목록 + "일일과제 작성" 폼. "자랑/잡동사니/
  정보팁은 기존 인스타그램 카드 UI 그대로 두고, 공부인증만 바꿔달라"). `sw.js`의 `SW_BUILD`도
  `2026-08-21-1`로 올림. `posts` 테이블에 `study_seconds`(integer, nullable) 컬럼을 마이그레이션
  으로 추가(Supabase MCP `apply_migration`).
  - **목록**: `loadBoardPosts()`가 `type==='studycert'`일 때만 `renderStudyCertTable()`로 분기 —
    #/작성자/공부시간/사진/내용/좋아요/댓글/날짜 컬럼의 표 형태(`.sc-table`). 실제 `<table>`
    대신 CSS Grid + `display:contents` 래퍼 div로 구현했는데, 기존 `toggleComments()`가 대상
    엘리먼트의 `display`를 그냥 `'block'`/`'none'`으로 토글해서 진짜 `<tr>`을 썼으면 펼칠 때
    표 레이아웃이 깨졌을 것 — 각 글의 셀을 `display:contents` 래퍼로 묶어 grid 정렬은 유지하고
    펼침 패널만 `grid-column:1/-1`인 평범한 div로 둬서 이 문제를 피함. 좋아요는 카드 버전과
    동일하게 `board-like-btn` 클래스 + `board-like-btn-*`/`board-like-count-*` id를 그대로
    써서 `toggleLike()`/`renderLikeButton()`을 그대로 공유(로직 중복 없음).
  - **글쓰기**: 공부인증 탭에서는 기존 인라인 글쓰기 폼(`#free-write-form`) 대신 탭 목록 오른쪽
    위에 파란색 "+ 글쓰기" 버튼(`#studycert-write-btn`)만 보이게 하고(`renderFreeCategoryTabs()`),
    누르면 전용 모달(`#studycert-write-modal`)이 뜬다 — 공부 시간(시/분 직접 입력 또는
    "📥 학습 기록 불러오기" 버튼), 인증 사진(필수), 한마디(선택). 일반 글쓰기 폼의 카테고리
    선택지에서는 `studycert`를 아예 뺐다(그 폼으로 올리면 `study_seconds` 없는 공부인증 글이
    생겨버리므로).
  - **"학습 기록 불러오기"**(`loadStudyRecordForCert()`) — 이 앱으로 학습 플래너를 쓴 사람이면
    오늘자 `study_sessions`를 조회해서(완료된 세션은 `duration_seconds` 합산, 진행 중인 세션은
    `computeElapsedSeconds()`로 실시간 경과분까지) 실제 기록을 시/분 칸에 자동으로 채워준다.
    수동 입력도 여전히 허용 — 앱 타이머 없이 공부한 경우까지 막을 이유는 없어서.
  - **검증**: 로그인 필요한 앱이라 실제 화면은 못 열어봤지만, 이번엔 Node `vm` 모듈로 실행
    가능한 스텁 환경(가짜 `document`/`window`/`supabase` 클라이언트)을 만들어서
    `renderStudyCertTable()`/`renderPost()`/`fmtStudySeconds()`를 목 데이터로 실제 호출해
    결과 HTML을 직접 확인함(최상위 `let`/`const`가 vm 컨텍스트 밖에 안 보이는 문제는 테스트
    스크립트에서만 `var`로 바꿔치기해서 우회 — 배포 파일 자체는 안 건드림). 이전(2026-08-03)
    보다 더 실제에 가까운 검증.
- 2026-08-19: **대학별 환산점수 계산기에 27개 대학 추가 (총 22 → 49개 대학)** + 공통 산식 엔진
  도입. `SW_BUILD` `2026-08-19-1`.
  - 추가된 대학(순위 20~54 표 기준, 이미 있던 11곳은 중복 방지를 위해 넣지 않음):
    아주대·인하대·숙명여대 / 한국항공대·서울과기대 / 가천대·경기대·성신여대·덕성여대·서울여대·
    동덕여대·수원대 / 부산대·경북대·인천대·충남대·전남대·전북대·충북대·강원대·제주대·
    국립부경대·국립한국해양대 / 영남대·울산대·한림대·순천향대.
  - **`bySpec(spec)` 공통 엔진** 신설. 대학마다 `calc` 함수를 손으로 쓰면 수천 줄이 늘고 배점표를
    옮겨 적다 오탈자가 나기 쉬워서, 반복되는 골격(반영교과 선택 → 이수단위 가중평균 → 진로선택
    처리 → 환산등급)을 엔진 하나로 묶고 각 대학은 **데이터**로만 적는다. 지원 옵션:
    `T`(등급 배점표) · `cats`/`hist`/`optCat`(반영 교과, "사회 또는 과학 중 유리한 쪽" 포함) ·
    `upTo31` · `weights`(교과별 가중치 — 인천대) · `catRank`(교과 평균을 성적 좋은 순으로 가중 —
    가천대 35:30:20:15, 수원대 30:30:25:15, 한림대 상위 3교과) · `scale`(전남대 885점) ·
    `unitBonus`(인천대 이수단위 가산) · `career` 4가지 모드(`none`/`merge`/`split`/`bonus`) · `warn`.
  - **기존 22개 대학의 손으로 쓴 로직은 한 줄도 건드리지 않았다** — 원문 확인(`v:'f'`)까지 끝난
    코드라, 엔진으로 갈아끼우면 검증이 무효가 된다. 원본 계산기와 나란히 돌리는 기존 대조
    하네스(`cmp.js`)로 22개 전부 점수·환산등급 **불일치 0건**임을 다시 확인했다.
  - 새로 넣은 27곳은 전부 배지 **`미검증`(`v:'n'`)**. 입학처 모집요강 원문이 아니라 정리된 표를
    근거로 넣은 값이라, 실제 요강과 다를 수 있다는 걸 화면에서 바로 알 수 있게 했다.
  - **배점표가 일부만 공개된 5곳**(전북대·국립부경대·울산대·국립한국해양대·한림대)은 없는 숫자를
    지어내지 않고 **환산점수를 아예 산출하지 않는다**(`max:0`). 대신 등급 간격이 균등한 가상 표로
    반영 교과 **평균등급만** 보여주고, 달성률 칸에는 "배점표 미공개 (환산등급만)"이라고 적는다.
  - 요강에 진로선택 처리 방식이 수치로 안 나온 곳(숙명여대·부산대·순천향대·한국항공대·충남대)은
    가정한 내용을 결과표에 ⚠ 주의 문구로 함께 띄운다.
  - 이미 있던 11곳(건국·동국·홍익·국민·숭실·세종·단국·광운·상명·명지·가톨릭)은 **덮어쓰지 않았다.**
    기존 항목은 모집요강 원문 확인분이고 표의 배점표와 숫자가 어긋나는 곳이 있어서(예: 광운대
    100·98·96·94·92·88·80·70·0 vs 표의 1000점 만점 표), 어느 쪽이 맞는지는 원문으로 확인이 필요하다.
  - **검증(같은 날 추가분)**: 22개 때 "원본 계산기와 나란히 돌려 대조"했던 것과 같은 방식을 새 대학에도
    적용했다. 비교할 원본이 없으니 **표를 보고 손으로 따로 짠 독립 구현**을 원본 자리에 세운다
    (`scratchpad/verify27.js`) — 앱은 bySpec 엔진 + spec 데이터를 거치고 독립 구현은 대학마다 직접 쓴
    코드라, 엔진 버그든 spec 오탈자든 한쪽만 틀리면 값이 갈린다. 랜덤 프로필 400개 + 손으로 만든
    경계 표본 12개(입력 0과목 / 3-2만 / 진로만 / 체육·예술만 / 전과목 1등급·9등급 / 가천대 원점수 70
    경계 / 진로 상위 N 동률 / 수원대 교과당 6과목 / 소수 학점)를 계열 3 × 3-2옵션 2로 돌려
    **66,582건 비교, 불일치 0건**.
  - 같이 돌린 나머지 세 가지: ① 기존 22개 대학 원본 대조 재확인(불일치 0건) ② 사용자가 준 표의
    '등급 환산점수'·'반영 학기' 칸을 정규식으로 뽑아 코드의 `T` 배열·`upTo31`과 기계 대조
    (`scratchpad/tablecheck.py`, 불일치 0건 — 배점표 전체가 공개된 22곳 전부 숫자 일치) ③ 어떤 성적을
    넣어도 환산점수가 만점을 안 넘고(가산점으로 넘는다고 명시한 명지대·인천대·서울여대 제외) 환산등급이
    1~9 안에 있으며 NaN이 안 새는지(`scratchpad/invariant.js`, 44,100건 위반 0건).
  - 반영 교과는 "한 교과를 빼면 반영 과목 수가 줄어드는가"로 실제 동작을 탐침해 표와 대조했고
    (`scratchpad/speccheck.js`) 27곳 모두 표와 일치. 여기서 **한림대 반영 교과 문구가 두 갈래로 읽히는
    것**을 발견해("국·영·수, 사 또는 과 중 상위 3개 교과") 5개 교과 중 상위 3개로 계산한다는 ⚠ 문구를 달았다.
  - ⚠️ **이 검증이 확인하는 건 "표대로 구현됐는가"까지다.** 표 자체가 모집요강과 맞는지는 확인 못 했다 —
    이 세션의 네트워크 정책이 입학처 도메인을 막아 원문 PDF를 열 수 없다(`EGRESS_BLOCKED`). 그래서
    새 27곳의 배지는 `미검증(v:'n')` 그대로 둔다.
- 2026-08-15 (7차): **뉴스 요약이 자주 안 보이던 원인 = KST/UTC 날짜 불일치** (제보: "뉴스 요약
  기능이 잘 작동을 안해"). `SW_BUILD` `2026-08-15-8`.
  - 프론트 `renderNews()`는 `localDateStr()`(브라우저 로컬 = **KST**) 날짜로 `news_summary`를
    찾는데, 수집 쪽 `fetchAndSaveNews()`는 `new Date().toISOString().slice(0,10)`(= **UTC**)로
    저장하고 있었다. 한국 시간 00~09시에 수집하면 UTC로는 전날이라 요약이 하루 어긋난 날짜로
    들어가 화면에서 영영 안 보인다. 오후에 수집하면 두 날짜가 같아져 정상 동작 — "가끔 된다"의
    정체가 이것. 6차에서 넣은 자동 수집이 주로 아침에 돌아 이 버그를 더 자주 밟게 됐다.
    (원래 Railway 서버 코드에도 있던 문제를 그대로 이식한 것.)
  - **양쪽 다 고침**: ① Edge Function이 `ymd(kstDate(),'-')`로 KST 날짜를 쓰도록(급식에서 이미
    쓰던 헬퍼 재사용), 오늘 수집분 삭제 기준도 KST 자정에 해당하는 UTC 시각으로 계산.
    ② 프론트는 날짜를 정확히 일치시키는 대신 **가장 최근 요약 1건**을 가져오고, 그게 오늘 것이
    아니면 "8-14 기준"처럼 언제 만든 요약인지 표시한다 — 이미 어긋나 저장된 기존 데이터와
    앞으로의 시차 모두를 견디게, 그리고 옛 요약을 오늘 것처럼 보이지 않게.
  - ⚠️ 프론트만 배포됨. **Edge Function 재배포는 Supabase 커넥터가 다시 붙어야 가능**(연결이
    계속 끊겨 대기 중). 다만 프론트 쪽 완화만으로도 기존 요약은 정상 표시된다.
- 2026-08-15 (6차): **뉴스/급식 자동 수집 복구** (제보: "입시뉴스도 매일 매일 수집이 되는게
  아니라 내가 수동으로 눌러야만 수집이 됨"). `SW_BUILD` `2026-08-15-7`.
  - 원인: 예전 Railway 서버의 `setInterval`(뉴스 07시·급식 06시)이 Edge Function 이전과 함께
    사라졌고, 대체로 준비해둔 `pg_cron` 스케줄(`20260815_cron_schedules.sql`)은 **Supabase
    커넥터가 계속 끊겨 아직 적용하지 못한 상태**였다. 그래서 수동 버튼만 동작.
  - `autoCollectDailyIfStale()` 추가 — 스태프가 앱을 열었을 때 오늘치 뉴스(또는 이번 주 급식)가
    비어 있으면 조용히 한 번 수집한다. pg_cron을 나중에 걸어도 **서로 방해하지 않는다**(이미
    데이터가 있으면 아무것도 안 함). 오히려 스케줄이 멈춰도 데이터가 비지 않는 안전망이 된다.
  - 하루 1회 제한(localStorage `bugwang_auto_collect`)을 두되 **시도 시점에 기록**한다 —
    실패하는 날 접속할 때마다 재시도하면 무거운 외부 API(네이버·Groq·NEIS)를 계속 두드린다.
    배경 유지보수라 성공/실패 토스트는 띄우지 않고 콘솔 경고만 남긴다.
- 2026-08-15 (5차): **PDF(AI) 입력 프롬프트를 현재 스키마에 맞게 전면 갱신** (제보: "pdf로
  입력하는 방식에서 표준편차가 반영이 안되는거같은데"). `SW_BUILD` `2026-08-15-6`.
  `GEMINI_IMPORT_PROMPT`가 계산기 통합 이전 스키마 그대로여서 **세 가지가 어긋나 있었다**:
  ① 원점수·과목평균·표준편차·성취도 분포비율을 **아예 요청하지 않음**(제보된 증상 — 그래서
  PDF 경로로 넣으면 연세대 Z점수·한국외대 원점수환산·고려대 변환석차등급이 항상 등급 기준으로만
  계산됨), ② `category`를 **옛 5종**(국·수·영·**탐구**·기타)으로 지시해 사회/과학/한국사가
  전부 '탐구'로 뭉개짐 — 대학마다 반영이 달라 사실 이게 더 큰 문제였다, ③ `type`에 `peart`가
  없어 체육·예술을 `career`로 넣게 해서, 4차에서 고친 peart 구분이 **PDF 경로에서만 다시 깨짐**.
  - 프롬프트를 9종 교과군 + 3종 type + 상세 성적(raw/mean/sd/dA/dB/dC) 요청으로 새로 씀.
    생기부 표기("91/73.8(15.5)" → raw/mean/sd, "A(62.5) B(25.5) C(12.0)" → dA/dB/dC)를 예시로
    명시하고, **없는 값은 0/null로 채우지 말고 키를 빼라**고 지시(0이 들어오면 표준편차 0처럼
    계산이 망가짐). P(이수) 과목은 제외하도록 함. 코드는 이미 다 받을 준비가 돼 있어(4차의
    `calcDetailFields`/peart 보존) **프롬프트만 고치면 되는 상태였다**.
  - 검증: 새 프롬프트 예시대로 만든 AI 응답을 `sanitizeCalcRow`에 통과시켜 raw/mean/sd/dA/dB/dC와
    peart가 모두 보존됨을 확인하고, 이어서 연세대 Z점수 반영(95.071)과 목록의 표준편차·분포비율
    표시까지 확인.
- 2026-08-15 (4차): **직접 입력에도 상세 성적(원점수·과목평균·표준편차·성취도 분포) 추가 +
  과목 목록에 분포비율 표시.** `SW_BUILD` `2026-08-15-5`. 3차까지는 이 값들이 생기부 HTML/JSON
  으로 들어올 때만 존재해서, 손으로 입력하는 학생은 **연세대 Z점수·한국외대 원점수환산·고려대
  변환석차등급이 항상 등급 기준으로만** 계산됐다.
  - 학기별 표의 각 행에 **"상세" 토글**을 달아 펼치면 원점수/과목평균/표준편차/A·B·C 비율 6칸이
    나오게 함. 여섯 칸을 늘 펼쳐두면 모바일에서 표가 못 쓰게 되므로 기본은 접어두고, 값이 이미
    있는 행은 버튼에 `●` 표시를 띄워 구분한다. 펼침 상태는 행 추가·삭제·학기 전환 시 초기화
    (인덱스가 밀려 엉뚱한 행이 열리는 걸 막기 위해).
  - `updateCalcField`가 상세 필드를 숫자로 저장하되 **빈칸이면 키를 삭제**한다 — 0으로 남으면
    "표준편차 0" 같은 값이 Z점수 계산을 망가뜨린다.
  - 대학 계산기의 "불러온 과목 목록"에 **성취도 분포 열**을 추가(`A 62.5% · B 25.5% · C 12%`),
    기존 `원점수/평균(편차)` 열과 나란히 보이게 함.
  - 검증: ① 원본 계산기와 22개 대학 재대조 → 전부 일치 유지, ② 상세 성적 유무 A/B 테스트 →
    연세대 95.000→97.500, 한국외대 960→1000으로 반영 확인, ③ 목록 렌더에 분포비율 출력 확인.
- 2026-08-15 (3차): **이식본 점수가 원본 계산기와 미세하게 어긋나던 것 수정** (제보: "점수가
  원본 계산기랑 살짝 다르네"). `sw.js`의 `SW_BUILD`도 `2026-08-15-4`로 올림.
  - 원인은 **과목 유형 `peart`(체육·예술)를 앱 데이터 모델에 맞추느라 `career`(진로선택)로
    뭉뚱그린 것**. 앱의 `calcData`는 general/career 두 종류만 알았는데, 원본 계산기는
    성취도만 있고 원점수·분포비율이 없는 체육·예술 과목을 `peart`로 따로 구분한다.
    **고려대는 `if(s.type==='peart') continue`로 아예 제외**하고, **서울시립대는 진로선택
    (`career`)만 100점 항목에 넣는데**, peart가 career로 섞이면서 체육 과목이 진로선택으로
    잘못 반영돼 이 두 대학만 점수·환산등급이 어긋났다(고려대 86.800 → 87.021 등).
  - `sanitizeCalcRow`가 `peart`를 보존하도록 하고, 학기별 입력 표의 유형 선택에 **"체육·예술"**
    항목을 추가했으며, 생기부 HTML 파싱 결과와 `calcData`→대학계산 파생 양쪽에서 타입을
    그대로 넘기게 고침. (교과군 평균은 원래 `type==='general'`만 세므로 영향 없음.)
  - **검증 방법을 개선함**: 원본 계산기 스크립트와 이식본을 jsdom 위에서 **동시에 실행해
    22개 대학 점수·환산등급을 1:1 대조**하는 하네스를 만들었다. 수정 전 2개 불일치 →
    수정 후 **전부 일치**. 앞으로 이 계산기를 손볼 때는 이 대조를 다시 돌려볼 것.
- 2026-08-15 (2차): **내신 계산기 입력을 하나로 통합** (제보: "기존에 이미 내신 산출 기능이
  있잖아, 입력을 한번만 해도 되게 바꿔"). 1차에서 대학별 환산 계산기를 붙일 때 그쪽이 `SUBS`라는
  **자기만의 과목 목록**을 따로 들고 있어서 같은 성적을 두 번 넣어야 했다 — `calcData`(앱의
  학기별 성적 입력)를 유일한 원본으로 만들었다.
  - `CALC_CATEGORIES`를 5종 → **9종**(국·수·영·**사회·과학·한국사·체육·예술**·기타)으로 세분화.
    대학 환산식이 사회/과학/한국사를 각각 다르게 반영하는데 예전엔 '탐구' 하나로 뭉쳐 있어
    그대로는 쓸 수 없었다. **기존 저장분의 '탐구'는 유효값으로 계속 받아준다**(`CALC_LEGACY_CATEGORIES`)
    — 목록에서 빼면 `sanitizeCalcRow`가 '기타'로 바꿔 사용자 입력이 조용히 망가진다. 해당 행의
    select에만 "탐구 (사회/과학 중 선택 필요)"로 노출해 직접 고치도록 유도하고, 고치기 전까지는
    계열 선택값(인문→사회 / 자연→과학) 기준으로 배정한다.
  - `sanitizeCalcRow`가 **상세 성적(raw/mean/sd/dA/dB/dC)을 보존**하도록 확장. 연세대(Z점수)와
    고려대(변환석차등급)가 이 값을 쓰는데, 없으면 그 두 곳만 정확도가 떨어지고 나머지는 그대로
    계산되므로 선택적 필드로 다룬다.
  - **생기부 HTML 업로드를 "생기부로 성적 자동 입력" 모달 맨 위로 이동** — 이제 파싱 결과가
    계산기 전용 목록이 아니라 `calcData`에 직접 기록되므로, 한 번 올리면 교과군 평균과 대학
    환산점수가 동시에 채워진다. 파서 자체는 검증된 것을 그대로 재사용(`UC.importNeisIntoCalcData`).
  - 대학 계산기 쪽 자체 입력 UI(탭 4종·직접추가·JSON·전체삭제·행 삭제)는 전부 제거하고,
    `calcAll()` 끝에서 `UC.refresh()`를 호출하게 했다 — `calcData`가 바뀌는 모든 경로가
    `calcAll()`을 거치므로 입력/수정/삭제/가져오기가 자동으로 대학 점수에 반영된다.
  - 검증: Node DOM 스텁으로 `calcData`만 채운 뒤 `UC.refresh()` 호출 → 22개 중 21개 대학 산출
    확인(연세대 98.252, 고려대 88.156, 서강대 848.78), legacy '탐구' 행도 정상 합산됨.
  - **후속 수정(제보: "나이스+ html로 입력이 없어졌어")**: 마크업과 핸들러는 멀쩡했는데 드롭존
    CSS를 `#uc-root .uc-drop`으로 한정해둔 게 문제였다 — 업로드 영역은 "생기부로 자동 입력"
    모달 안(= `#uc-root` 바깥)이라 스타일이 하나도 안 먹어 점선 테두리 없는 맨 텍스트로 보였고,
    그래서 기능이 사라진 것처럼 느껴졌다. `.uc-drop`은 이 용도로만 쓰는 이름이라 전역 규칙으로
    바꿈. 겸사겸사 jsdom으로 실제 생기부 HTML 파싱을 처음부터 끝까지 검증함(4과목 → 학기별
    배치·교과군 정규화("사회(역사/도덕 포함)"→사회)·원점수/표준편차/성취도 분포 추출 모두 정상).
- 2026-08-15: **내신 계산기에 "대학별 환산점수·환산등급" 신설 + 생기부 HTML 직접 입력.**
  `sw.js`의 `SW_BUILD`도 `2026-08-15-1`로 올림. 사용자가 따로 만들어 쓰던 단독 HTML 계산기
  (2027학년도 학생부교과전형 22개 대학, 서울대는 교과전형 미실시라 산출 제외 → 실산출 21개)를
  `page-score-calc` 안으로 통합했다.
  - **원본 로직은 손대지 않고 그대로 옮겼다** — 대학별 배점표·환산식과 나이스+ 생기부 HTML
    파서(`parseNeis`)는 사용자가 각 대학 모집요강 원문과 대조해 검증해둔 자산이라, 손으로
    베껴 쓰면 오탈자가 섞일 위험이 크다. 대신 통합에 필요한 부분만 기계적으로 바꿨다:
    ① **전체를 IIFE로 감쌈** — 원본의 `calc`/`render`/`sum`/`num`/`S` 같은 흔한 이름이 이 앱의
    동명 전역(특히 학습 플래너의 `calc`/`render`)과 그대로 충돌하기 때문. 인라인 onclick이
    쓰는 것만 `window.UC`로 노출. ② DOM id 전부 `uc-` 접두사, `.tab`/`.pane` 셀렉터는
    `#uc-root` 안으로 한정. ③ `alert()` → 앱의 `toast()`.
  - **입력 방법 4가지**: ⓐ 생기부 HTML 드래그&드롭(나이스+ 화면을 HTML로 저장한 파일 —
    "7. 교과학습발달상황" 표에서 과목·학점·등급·원점수·성취도 분포까지 한 번에 읽음),
    ⓑ **위 학기별 입력에서 가져오기**(신규 — 같은 성적을 두 번 넣지 않게 `calcData`를 변환),
    ⓒ AI 프롬프트로 만든 JSON 붙여넣기, ⓓ 직접 추가.
    - ⓑ의 **한계를 UI에 명시함**: 앱의 교과군은 5종(국·수·영·**탐구**·기타)이라 사회/과학이
      구분되지 않는데 대학 환산식은 둘을 다르게 쓴다. 그래서 계열 선택값 기준으로 배정하고
      "탐구 N개를 사회(또는 과학)로 배정했다"고 토스트로 알린다. 정확히 하려면 HTML 입력 사용.
  - 결과표는 대학군/달성률/환산등급/대학명으로 정렬 가능하고, 대학마다 만점 척도가 달라
    **환산점수 직접 비교는 무의미**하다는 안내와 원문 검증 배지(원문확인/일부확인/미검증)를 함께 표시.
  - 검증: Node에 최소 DOM 스텁을 만들어 실제로 돌려봄 — 표본 성적(전 과목 1~2등급) 30과목으로
    22개 대학 중 21개 환산점수·환산등급 산출 확인(연세대 98.333/100, 고려대 88.2, 서강대 850 등).
    실제 화면은 로그인이 필요해 직접 못 열어봤으므로 최종 확인은 사용자 몫.
- 2026-08-14 (7차): **백엔드를 Railway → Supabase Edge Function으로 이전.** `sw.js`의
  `SW_BUILD`도 `2026-08-14-7`로 올림. **Railway 무료 체험이 만료돼 `bugwang-server` 서비스가
  통째로 offline**이 된 것이 오늘 겪은 증상들(관리자탭 느림 → 계정 목록 실패 → 이름 누락 →
  계정 생성 멈춤)의 진짜 원인이었음.
  - 백엔드 저장소(`seojin080429-crypto/bugwang-server`)에 `supabase/functions/api/index.ts`를
    추가해 Express 서버를 Deno Edge Function으로 포팅하고 Supabase에 배포함(함수명 `api`,
    `verify_jwt=false` — 함수가 예전 서버와 동일한 자체 권한 판정을 하므로).
  - **경로 설계**: Supabase는 `/functions/v1/{함수명}/{나머지}`로 라우팅하므로 함수명을 `api`로
    두면 기존 `${SERVER_URL}/api/users` 호출이 그대로 맞아떨어진다 — 그래서 프론트는
    `SERVER_URL` 상수 한 줄만 교체(`https://pvrgwvfjnebsxnlxaxhc.supabase.co/functions/v1`).
  - 이전 완료: 계정 목록/생성/삭제/비번초기화/아이디변경, 푸시 구독·해지, 알림 6종, 급식 수집.
    포팅하면서 `listUsers`가 200명에서 조용히 잘리던 것을 페이지네이션으로 고쳤고, `web-push`는
    Deno에서 로드 실패해도 **함수 전체가 죽지 않도록** 동적 import로 감쌌다.
  - **아직 이전 안 됨**: 뉴스 수집(네이버+Groq). (캠스터디 영상통화와 기기 간 타이머 동기화는
    2026-08-28에 Supabase Realtime + `study` 엣지 함수로 이전 완료 — 33차 항목 참고.)
    뒤 둘은 Socket.IO 상시 연결 서버가 필요해 Edge Function으로 안 옮겨지고 Supabase Realtime
    재설계가 필요함. 그래서 소켓 주소를 `SOCKET_URL` 상수로 분리하고 **빈 값이면 연결 자체를
    안 하도록** 함(죽은 주소로 무한 재연결하면 콘솔이 에러로 뒤덮이고 배터리만 축남).
    캠스터디 입장 버튼도 서버를 두드리기 전에 "이전 작업 중" 안내를 띄운다. **타이머 기기 간
    동기화는 완전히 죽은 게 아니라** 기존 60초 주기 `applyServerTimerTruth()` 폴링이 남아 있어
    즉시 반영에서 최대 1분 지연으로 품질만 떨어진 상태.
  - ⚠️ **Edge Function 시크릿은 Supabase 대시보드에서 직접 등록해야 함**(MCP 도구가 없음):
    `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`(푸시), `NEIS_API_KEY`(급식), 이후 뉴스용
    `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`/`GROQ_API_KEY`. `SUPABASE_URL`과
    `SUPABASE_SERVICE_ROLE_KEY`는 런타임이 자동 주입하므로 등록 불필요.
  - 뉴스/급식 자동 수집 스케줄러(예전엔 서버의 setInterval)는 `pg_cron`+`pg_net`으로 옮길 예정.
    `pg_net`은 이미 활성화해둠.
- 2026-08-14 (6차): **백엔드 호출에 타임아웃이 없어서 "계정 생성 누르면 렉 걸림"으로 보이던 것
  수정.** `sw.js`의 `SW_BUILD`도 `2026-08-14-6`으로 올림. `fetch()`는 서버가 응답을 안 주면
  스스로 끝나지 않는다 — 백엔드가 잠들거나 죽은 지금 상태에서 계정 생성을 누르면 버튼은
  멀쩡해 보이는데 아무 일도 안 일어나고, `res.json()`이 HTML 응답에 터져도 잡는 곳이 없어
  토스트조차 안 떴다(= 화면이 멈춘 것처럼 느껴짐).
  - `postJson()`에 **AbortController 타임아웃** 추가(조회 10초, 계정 생성/삭제/초기화 30초,
    뉴스/급식 수집 60초). 타임아웃이면 "서버가 N초 안에 응답하지 않았어요"로 명확히 알린다.
    다만 생성/삭제는 **우리가 먼저 끊어도 서버에선 이미 처리됐을 수 있으므로**, 그 경우
    "목록을 새로고침해서 실제로 처리됐는지 확인해주세요"라고 함께 안내한다.
  - `setBtnBusy()` 헬퍼 — 계정 생성 버튼을 "생성 중…"으로 잠갔다가 복구(연타로 인한 중복
    생성 시도 방지). 뉴스/급식 수집 버튼도 이 헬퍼로 통일하면서 raw fetch를 `postJson`으로 교체.
  - `invalidateUsersCache()` — **5차에서 넣은 60초 캐시 때문에 방금 만든/지운 계정이 최대
    1분간 목록에 반영되지 않던 회귀를 수정**(생성·삭제 직후 캐시를 비움). 클래스/타반 상태가
    바뀌는 경로들도 `externalIdSetCache`를 함께 무효화.
- 2026-08-14 (5차): **이름을 백엔드가 아니라 Supabase에서 가져오도록 바꿔 백엔드 의존을 끊음.**
  `sw.js`의 `SW_BUILD`도 `2026-08-14-5`로 올림. 4차 수정 뒤에도 `/api/users`가 계속 실패해서
  관리자 탭에 "사람은 나오는데 이름이 전부 —"로 보였음(4차에서 넣은 부분 실패 허용이 동작한
  결과). 근본적으로 **이름은 백엔드에만 있는 정보가 아니다** — `user_profiles.display_name`이
  로그인할 때마다 `syncMyProfile()`로 최신화되므로 그걸 쓰면 된다.
  - 관리자 탭: `user_profiles`를 함께 조회해 `백엔드 이름 → user_profiles 이름 → '—'` 순으로
    폴백. 백엔드에서만 오는 정보는 이제 사실상 선택과목(수능 응시과목)뿐이라, 실패 토스트도
    "선택과목 정보를 못 불러왔어요"로 정확히 바꿈.
  - 관리자 탭 목록 구성도 수정 — 예전엔 `serverMap`(백엔드) + 301xx 범위로만 학번을 모아서,
    백엔드가 죽으면 `rrkm`/`Rrkm`/`test` 같이 학번 규칙을 안 따르는 계정이 **목록에서 통째로
    사라져 관리 자체가 불가능**했음. 이제 `user_roles`/`user_profiles`에 있는 학번도 합쳐서
    항상 보이게 함.
  - 학생 현황(교사 뷰): 백엔드 실패 시 명단이 비어 카드가 하나도 안 뜨던 것을,
    `user_profiles`로 명단을 대신 만들도록 폴백 추가(학번+이름만 있으면 집계는 그대로 동작).
- 2026-08-14 (4차): **3차에서 넣은 계정 목록 프리페치가 "계정 목록 로드 실패"를 유발한 것 수습.**
  `sw.js`의 `SW_BUILD`도 `2026-08-14-4`로 올림. 3차에서 `loadMyRole()`이 로그인 직후 스태프에게
  `/api/users`를 미리 당겨오게 했는데, 하필 그 시점이 백엔드가 가장 차가운 순간이라 Railway가
  아직 깨는 중이면 JSON이 아닌 502/503 HTML을 돌려주고 → `res.json()`이 SyntaxError로 터지고 →
  in-flight 프로미스를 공유하는 관리자 탭이 그 실패를 그대로 물려받아 매번 실패 토스트가 떴음.
  - **프리페치 제거** — 컨테이너는 가벼운 `warmUpBackend()` 핑으로만 깨우고, 실제 목록은 탭을
    열 때 받는다(요청 하나를 더 만들지 않으면서 콜드 스타트 이득은 유지).
  - **`postJson()` 헬퍼 신설** — 본문을 먼저 text로 받아 JSON일 때만 파싱하고, 아니면
    `서버 응답 오류 (HTTP 502)`처럼 상태 코드가 들어간 읽을 수 있는 에러로 바꾼다(원인 불명의
    SyntaxError가 "로드 실패"로 둔갑하던 문제).
  - **재시도** — `fetchUsersList()`가 5xx/네트워크 오류면 0s→1.5s→4s 간격으로 3번까지 다시
    시도(콜드 스타트는 첫 요청만 튕기고 그다음 성공하는 경우가 흔함). 4xx(권한 등)는 재시도해도
    같으므로 즉시 포기.
  - **관리자 탭 부분 실패 허용** — 이름/선택과목은 백엔드에서만 오지만 역할·캠스터디·등록기기·
    클래스는 Supabase에서 이미 받으므로, 백엔드가 죽어 있어도 표를 "로딩 중"에 멈춰두지 않고
    이름 칸만 비운 채 렌더해서 권한/클래스 관리를 계속 쓸 수 있게 함.
- 2026-08-14 (3차): **클래스 학생이 3-1 랭킹에 노출된 사고 수습** + 백엔드 콜드 스타트 완화.
  `sw.js`의 `SW_BUILD`도 `2026-08-14-3`으로 올림.
  - **⚠️ 노출 사고**: 클래스에 넣은 계정(`Rrkm`)이 전체화면 타이머의 "공부중인 친구들"과
    반 랭킹에 3-1 학생들에게 그대로 보였음(제보 스크린샷: 고다윤 학생 화면에 노출). 원인은
    2차 작업에서 만든 `addStudentToClass()`가 `class_id`만 넣고 `is_external`은 안 켰는데,
    3-1 랭킹 필터(`loadExternalIdSet()`)는 `is_external=true`만 걸러내고 있었기 때문 —
    "클래스에 속함"과 "타반 계정"이 서로 다른 두 표현으로 갈라져서 한쪽만 검사한 것이 화근.
    **양방향으로 고침**: ① `loadExternalIdSet()`이 이제 `is_external` **또는** `class_id`가
    있는 계정을 모두 제외(플래그가 빠져도 클래스 소속이면 자동으로 걸러짐), ②
    `applyExternalAccountVisibility()`도 `currentClassId`가 있으면 3-1 전용 기능을 숨김
    (반대 방향 — 클래스 학생에게 3-1 게시판/공지/시간표가 보이던 문제), ③
    `addStudentToClass()`가 `is_external`/멘토도 함께 설정, ④ 클래스/타반 상태를 바꾸는
    모든 경로에서 `externalIdSetCache`(5분 캐시)를 즉시 무효화. 또 조회 실패 시 빈 집합을
    캐시해 5분간 필터가 꺼지던 위험도 제거(실패하면 캐시하지 않고 다음 호출에서 재시도).
    **교훈: 같은 개념("3-1이 아님")을 두 컬럼으로 표현하면 필터가 한쪽만 보고 새어나간다 —
    노출 여부를 판단하는 지점은 반드시 두 조건을 함께 봐야 함.**
  - **백엔드 콜드 스타트/렉 완화** (제보: "관리자탭 로딩·학생들 정보 불러오는데 오래걸려").
    조사 결과 Supabase는 정상(평균 130~280ms, 데이터도 적음)이었고, 느린 두 화면이 공통으로
    Railway `/api/users`를 **각자 캐시 없이** 호출하는 게 병목이었음(무료 플랜 콜드 스타트).
    ① `fetchUsersList()` 공용 60초 TTL 캐시 신설 — 관리자 탭/학생현황/공지 투표 분모 계산
    세 곳이 공유하고, 동시 호출은 in-flight 프로미스 하나로 합침(콜드 스타트 중 중복 요청이
    겹치면 더 느려지므로). ② `warmUpBackend()` — 로그인 직후 백엔드에 가벼운 요청을 한 번
    보내 컨테이너를 미리 깨워둠. ③ 스태프면 `loadMyRole()`에서 계정 목록을 미리 받아둬서
    관리자/학생현황 탭이 즉시 그려지게 함. ④ `renderMyMonthCalendar()`가 플래너 페이지가
    실제로 보일 때만 렌더하도록 가드 추가(2차 작업에서 타이머 정지·기록 수정 때마다 안 보이는
    캘린더를 그리느라 쿼리 2개씩 낭비하던 회귀 정리).
- 2026-08-14 (2차): 코드리뷰 후속 수정 + 날짜별 공부 시간을 캘린더로 이동 + 클래스(반)
  시스템 신설. `sw.js`의 `SW_BUILD`도 `2026-08-14-2`로 올림.
  - **1차 작업분 코드리뷰에서 나온 문제들 수정** (Claude Code 자체 리뷰):
    ① `editTask()` — 공백만 입력하면 모든 날짜 세션 이름이 ''로 일괄 변경되던 것 차단
    (`if(!trimmed)return`), 세션 이름 반영 실패 시 `study_tasks`를 옛 이름으로 롤백해서
    "기록 사라짐" 버그가 부분 실패 경로로 재현되지 않게 함, 과거 날짜 일지를 보는 중 이름을
    바꾸면 화면에 옛 이름이 남던 것 수정(`loadPlannerViewDateData()` 재호출), 죽은 `typeof
    renderDailyTotals` 가드 제거. ② `handleRemoteTimerSync()` — 다른 기기에서 방금 이름을
    바꾼 태스크의 sync가 이름 불일치로 조용히 무시되던 것을, 매칭 실패 시
    `loadSubjectsFromDB()`로 최신 이름을 다시 불러와 한 번 더 매칭하도록 수정. ③
    `beginCountdownUI()` — `clockStart` 없는 구버전 저장 카운트다운을 재개하면 숫자/시계가
    모두 숨겨져 빈 화면이 되던 하위호환 깨짐 수정(숫자 표시는 시계가 있을 때만 숨김). ④
    `stopCurrentTimer()`의 미사용 `si`/`savedSeconds` 죽은 코드 제거.
  - **"날짜별 공부 시간"을 리스트 뷰 아래에서 "계획 이수 현황" 월간 캘린더로 이동** (요청:
    "내가 원한 공부시간 표시는 여기 캘린더에 올리는거야") — 리스트 아래 `daily-totals` 블록
    (HTML/CSS/`renderDailyTotals()`)은 통째로 삭제하고, `renderMonthCalendar()`가 각 날짜
    칸 왼쪽 상단에 그날 총 공부 시간(`.mcal-day-time`)을 표시한다. 진행 중 세션의 실시간
    보정은 **오늘 칸에만** 적용(1차 리뷰에서 지적된 고아 세션 무한 증가 버그를 원천 차단 —
    과거 날짜의 `ended_at IS NULL` 행은 0으로 취급). 본인 플래너('pw') 캘린더의 오늘 이전
    날짜 칸은 클릭하면 그날 일지로 이동(`pickPlannerViewDate(ds,true)` — 일지 카드로 스크롤
    포함). 선생님 학생 상세('sd') 캘린더에도 날짜별 시간이 같이 표시되지만 클릭 이동은 없음.
    갱신 시점(기존 `renderDailyTotals` 자리를 `renderMyMonthCalendar`가 대체): 타이머 정지,
    구간 수동 추가·수정·삭제, 할 일 이름 변경.
  - **클래스(반) 시스템 신설** (요청: "타반/타학교 학생들을 묶는 '반'을 만들게 해줘") —
    `classes` 테이블 + `user_roles.class_id`(스키마 섹션 참고 — 처음엔 이 세션에 Supabase
    접근이 없어 SQL만 준비했는데, 이후 사용자가 Supabase MCP 커넥터를 연결해줘서 실제
    프로젝트에 마이그레이션 적용까지 완료함). 관리자 탭에
    "클래스(반) 관리" 카드(owner-tier 전용): 클래스 만들기/삭제, 아이디로 멤버 추가/제거.
    "계정 생성" 카드에 클래스 드롭다운 추가 — 클래스를 고르면 자동으로 타반 계정
    (`is_external=true`+멘토 등록)으로 만들어지고 그 클래스 소속이 됨. 클래스에 소속된
    계정은 사이드바 "실시간" 그룹에 **"내 반 보기"** 탭(`page-myclass`)이 생기고, 같은
    클래스 멤버 전원 + **제작자(30122, `CREATOR_STUDENT_ID` 상수)의 공부 현황**을 "내 학생"
    과 같은 카드 그리드로 볼 수 있다(요청: "타학교 학생들은 나(30122)의 기록은 볼 수 있게").
    카드를 누르면 선생님 학생 상세와 동일한 전체화면(`openStudentDetail`)으로 리포트/
    타임테이블/캘린더를 볼 수 있음(관련 테이블 SELECT가 전부 전체 공개 RLS라 백엔드 변경
    불필요). 마이그레이션 전에는 클래스 관리 카드에 안내 문구가 뜨고 나머지는 기존대로 동작
    (`loadMyRole()`이 `user_roles`를 `*`로 조회하도록 바꿔서 없는 컬럼 에러도 안 남).
- 2026-08-14: 학습 플래너 이름 변경 버그 수정 + 모의고사 실전 시계 + 날짜별 공부 시간.
  `sw.js`의 `SW_BUILD`도 `2026-08-14-1`로 올림.
  - **할 일 이름을 바꾸면 기록이 사라지던 버그 수정** (제보: "이름을 변경하면 그 기록이
    사라진다던가, 이름은 바꿨는데 타임블록에는 안 바뀌는") — 근본 원인은 `study_sessions`가
    태스크와 **id가 아니라 `subject`+`task_name` 문자열로만** 연결돼 있는데,
    `editTask()`가 `study_tasks.task_name`만 바꾸고 세션 쪽은 그대로 뒀기 때문. 그래서
    이름을 바꾸는 순간 그 태스크에 매칭되는 세션이 0개가 되어 시간이 사라진 것처럼 보이고,
    타임블록/리스트에는 옛 이름이 그대로 남고, 실행 중이던 타이머는
    `resumeActiveTimerIfAny()`가 이름으로 못 찾아 이어받기에 실패했음. 이제 `editTask()`가
    같은 user_id·subject의 **모든 날짜** 세션 `task_name`까지 함께 업데이트하고(과거 날짜만
    옛 이름으로 갈라지지 않게), 실행 중이면 타이머 배지와 `broadcastTimerSync()`도 새
    이름으로 갱신한 뒤 `loadTodaySessionsOnly()`/`refreshStats()`로 다시 그린다. 덤으로
    같은 과목 안에 중복 이름이 생기는 것도 막음 — 문자열 매칭이라 두 태스크의 시간이 섞임.
  - **모의고사용 알림에 실전 아날로그 시계 추가** — 국어/수학 프리셋을 실제 수능 시간표
    (`EXAM_SCHEDULE`: 국어 08:40~10:00 80분, 수학 10:30~12:10 100분)로 바꾸고, 시작하면
    숫자 카운트다운 대신 SVG 아날로그 시계가 가운데 크게 뜬다. 시계는 **지금 실제 시각이
    아니라 시험 시각**을 가리킨다 — 저녁에 눌러도 8:40에서 출발해 종료 순간 정확히 10:00을
    가리키도록, 바늘 각도를 `clockStart + 경과분`으로 계산(`drawExamClock()`). 시계 아래
    좌측=경과 시간, 우측=남은 시간이고, 시작 **전에만** 체크박스로 각각 끌 수 있다
    (`bugwang_exam_display` localStorage에 기억, 시작 후엔 시험 중 방해를 막기 위해 설정
    행 자체를 숨김). `clockStart`는 카운트다운 저장 포맷에도 들어가서 새로고침해도 시계가
    이어진다(기존 저장분엔 없으므로 `null`이면 시계 없이 예전처럼 동작 — 하위호환).
  - **리스트 뷰 아래 "날짜별 공부 시간" 추가** — 리스트 뷰는 하루치만 보여줘서 며칠간 흐름을
    볼 수 없었음. `renderDailyTotals()`가 최근 14일(`DAILY_TOTALS_DAYS`) 세션을 날짜별로
    합산해 막대와 함께 최신순으로 보여주고, 상단에 총합/하루 평균을 표시한다. 오늘 줄은
    아직 안 끝난(진행 중) 세션을 `computeElapsedSeconds()`로 보정해서 위 통계바의 "총 공부
    시간"과 어긋나지 않게 함. 날짜를 누르면 `pickPlannerViewDate()`로 그날 일지로 이동.
    갱신 시점: 플래너 진입/날짜 이동(`loadPlannerViewDateData`), 타이머 정지, 구간 수동
    추가·수정·삭제, 할 일 이름 변경.
- 2026-08-03 (2차): 세 가지 별개 개선. `sw.js`의 `SW_BUILD`도 `2026-08-03-2`로 올림.
  - **앱 로고 아이콘의 흰색 배경(누끼 미처리) 수정** (제보: "앱 로고에 약간 문제가 있는데
    누끼가 안 따진건지 흰색 테두리가 다 보여") — `logo-source.png`/`icon-32/180/192.png`가
    전부 알파 채널 없는 RGB PNG였고, 실제 로고(검은 둥근 사각형 타일)가 1024×1024 캔버스
    중앙에 흰 여백(약 84px)을 두고 작게 들어있어서 어디서든(로그인 화면의
    `.auth-logo-mark`, 파비콘, 홈 화면 아이콘) 흰 테두리처럼 보였음. 단순 트림이 아니라
    scipy `ndimage.label`로 "바깥쪽(이미지 테두리와 연결된) 흰 영역"과 "안쪽에 갇힌 흰
    글자"를 연결성 기준으로 구분해서(안 그러면 글자까지 함께 사라짐), 바깥쪽만 타일과 같은
    검정으로 채워 넣어 1024×1024 전체를 꽉 채우는 형태로 만듦. 우하단의 접힌 모서리 장식
    (회색 톤)은 별도 안전 영역(860~970px)으로 지정해서 보존. 투명 배경(알파) 대신 **완전
    불투명한 정사각형**으로 만든 이유: apple-touch-icon은 알파 투명을 제대로 지원 안 해서
    (iOS가 배경을 검정으로 강제 채우는 등) 오히려 다른 아티팩트가 생길 수 있음 — 각
    플랫폼(iOS/Android/브라우저 파비콘)이 알아서 코너를 마스킹하게 두는 쪽이 더 안전.
    `logo-source.png` 자체도 고친 버전으로 교체(향후 아이콘 재생성 시 같은 버그가 다시
    안 생기게).
  - **게시글을 어플 내 DM으로 공유하는 기능 추가** (요청: "게시물 공유를 어플 내 dm에서
    가능하게 해줘") — 인스타그램 리디자인(위 1차 항목)에서 액션바에 넣었던 공유(✈️)
    아이콘이 원래는 `navigator.share()`/클립보드 복사였는데, 이걸 어플 내 DM 공유로
    교체함. `openSharePostModal(postId)`가 이미 대화 중인 방 목록(`dmRooms`, DM 페이지를
    아직 안 열었으면 새로 조회)을 보여주고, 방을 고르면 `confirmSharePostToDm(roomId)`가
    "📌 게시글 공유\n{작성자}: {내용}" 형식으로 `dm_messages`에 바로 insert함. 사진 첨부
    게시글은 `board-photos`(공개 버킷) URL을 `fetch()`로 받아 `dm-photos`(비공개 버킷,
    방별 폴더)로 그대로 올려 사진도 함께 전달되게 함 — 동영상 첨부는 DM 메시지가 항상
    `<img>`로만 렌더링돼서(동영상 재생 미지원) 사진을 옮기지 않고 "동영상 첨부됨" 안내
    문구만 붙임. "새 대화 시작"은 이 모달에 넣지 않음(DM 페이지에 이미 있는 기능이라
    중복을 피함) — 대화가 없으면 DM에서 먼저 시작해야 공유 가능.
  - **다크모드 포인트색을 블루에서 그레이로 교체** (요청: "원래 화이트-블루(라이트)/
    블랙-블루(다크)에서 다크모드일때 블랙-그레이로 색 조합을 바꿔줘") — 라이트모드는
    그대로 두고 `:root[data-theme="dark"]`의 `--blue`/`--blue-focus`/`--blue-dark`만
    `#0a84ff`/`#409cff`/`#5ac8fa`(블루)에서 `#86868b`/`#a0a0a5`/`#c4c4c9`(그레이)로 교체.
    이 프로젝트는 포인트색을 전부 `--blue` 변수 하나로 관리해서(버튼/링크/액티브 상태 등)
    이 한 줄만 바꾸면 다크모드 전체에 자연스럽게 퍼짐 — 베이지 테마가 `--blue`를 오렌지로
    바꾼 것과 동일한 패턴. 새 회색은 기존 블루(#0a84ff)와 대비율이 거의 같도록(흰 글자
    대비 ~3.6, 어두운 배경 대비 ~4.7~5.1) 골라서 가독성이 떨어지지 않게 함.
- 2026-08-03: **게시판(자유/질문/버그) 피드 카드를 인스타그램 스타일로 리디자인** (요청:
  "게시판파트 ui를 좀 바꾸고 싶어, 인스타그램처럼" + 색상/타이포/컴포넌트 스펙 상세 전달).
  자유/질문/버그제보 세 게시판이 전부 `renderPost()` 하나를 공유해서 렌더링하므로, 이 함수와
  관련 CSS만 고치면 세 곳 모두에 일괄 반영됨. `sw.js`의 `SW_BUILD`도 `2026-08-03-1`로 올림.
  - **헤더**: 아바타(32px 원형, `user_profiles.avatar_url` 있으면 실제 사진 — 기존엔 데이터가
    있는데도 이니셜만 보여주고 있었음)+아이디+과목 태그(질문게시판)+"⋯" 더보기 버튼. 기존엔
    "수정"/"삭제" 텍스트 버튼이 헤더에 항상 노출돼 있었는데, 본인 글이거나 운영자/선생님일
    때만 "⋯"를 눌러야 뜨는 드롭다운(`.post-more-menu`)으로 옮김(`togglePostMenu()`/
    `closeAllPostMenus()`, 문서 클릭 시 자동으로 닫힘). 권한이 아예 없으면 "⋯" 버튼 자체를
    렌더링하지 않음.
  - **미디어 영역**: 카드 폭 전체를 채우는 `.post-media` — 인스타그램 스펙은 정사각형/4:5
    크롭(object-fit:cover)이지만, 버그 제보 스크린샷처럼 잘리면 안 되는 이미지가 섞여있어서
    검은 여백을 두고 전체가 항상 보이게(object-fit:contain) 하는 쪽으로 의도적으로 다르게
    구현함(사용자 확인 없이 판단 — 스크린샷 잘림은 실제 사용성 문제라서).
  - **액션바**: 좋아요(하트)/댓글/공유 아이콘을 왼쪽에 나열. 하트는 SVG 하나로 통일해서
    좋아요 시 빨간색으로 차는 애니메이션 추가(예전엔 SVG 윤곽 아이콘 위에 텍스트 하트
    ♥/♡를 겹쳐 그리던 중복 구현이었음 — `renderLikeButton()`도 정리). 공유는 백엔드 변경 없이
    `navigator.share()`(지원 브라우저는 네이티브 공유 시트) → 미지원 시 클립보드 복사로
    폴백(`sharePost()`). **북마크 아이콘은 넣지 않음** — 스펙엔 있었지만 이 앱엔 저장 기능을
    쓸 화면 자체가 없어서(반쯤 만든 장식성 버튼을 두지 않기 위한 판단), 필요하면 추가 요청.
  - **본문**: "좋아요 N개"(볼드, 기존엔 "N명") → 캡션(아이디+본문 한 줄) → "댓글 N개 모두
    보기"(0개면 숨김, 댓글 아이콘은 항상 살아있어 첫 댓글도 그걸로 씀) → 상대 시간
    (`formatRelativeTime()`: 방금 전/N분 전/N시간 전/N일 전/7일 이후엔 절대 날짜 — 기존엔
    항상 "7/15 03:20" 같은 절대 시각만 표시했음). 댓글 목록에도 동일한 상대 시간과 실제
    아바타 사진 적용.
  - **색상**: 라이트/다크/베이지 테마와 계속 자연스럽게 어울리도록 배경/글자색은 기존
    `--canvas`/`--ink`류 변수를 그대로 쓰고, 스펙이 지정한 "Primary/Brand #0095F6"만 테마와
    무관하게 고정되는 새 변수 `--ig-blue`로 별도 도입(댓글 등록 버튼, 과목 태그 색 등에 사용).
  - 검증: 로그인이 필요한 앱이라 실제 화면은 직접 못 열어봤음(이 환경엔 헤더리스 브라우저
    도구도 없었음) — 전체 인라인 스크립트를 `new Function()`으로 구문 검사(통과)하고 마크업/
    id·class 연결을 코드 리뷰로 꼼꼼히 대조하는 선에서 검증함. Node vm으로 `renderPost()`를
    목 데이터로 직접 실행해보려는 시도는 `supabase.createClient()` 등 상위 의존성을 다 스텁하지
    못해 중간에 막혔고, 억지로 더 스텁하는 대신 여기서 멈춤 — 실제 로그인 화면에서의 최종
    확인은 사용자 몫.
- 2026-07-30: **비번 초기화/계정 생성 버그 수정** (제보: "비번 초기화가 안되는데?" →
  실제로 눌러보니 "초기화 실패: Password should be at least 6 characters." 에러). 원인은
  Supabase Auth의 비밀번호 최소 길이 제약(6자)인데, 관리자 탭의 "비번 초기화"/"계정 생성"
  기본 비밀번호가 옛날부터 `'1234'`(4자)로 박혀있어서 항상 이 제약에 걸렸던 것 — 마이페이지
  본인 비밀번호 변경 폼은 이미 "6자 이상"이라고 안내하고 있었으니 그쪽 제약과도 원래 안
  맞았던 상태. `bugwang-server/server.js`의 `/api/reset-password`, `/api/create-user` 기본값과
  `index.html`의 관련 안내문구/확인창/토스트를 전부 `'123456'`으로 교체, 계정 생성 시 관리자가
  직접 입력한 커스텀 비밀번호도 6자 미만이면 프론트에서 미리 막도록 `createAccount()`에
  가드 추가. `sw.js`의 `SW_BUILD`도 `2026-07-30-1`로 올림.
  - **부가 발견(미수정)**: 마이페이지가 아닌 "계정 설정" 모달(`#account-modal`,
    `acc-name`/`acc-pw` input들)의 저장 버튼이 호출하는 `saveAccount()` 함수가 파일 어디에도
    정의돼 있지 않고, 이 모달 자체를 여는 버튼도 없음(코드베이스에 고립된 죽은 코드로 보임) —
    이번 버그와는 무관해서 손대지 않았고, 실제 비밀번호 변경은 마이페이지 쪽 폼
    (`mp-cur-pw`/`mp-new-pw`)이 정상 동작 경로임.
- 2026-07-28 (2차): "리락쿠마 켜기" 기능 확장 — 전체화면 타이머(재생 버튼→`openTimerView()`)가
  베이지 테마를 켜도 항상 고정 다크톤(`#0d0f1a`)이라 어색하다는 요청으로 베이지 대응.
  - `#timer-fullscreen`과 하위 `.tf-*` 요소 전부에 `:root[data-theme="bear"]` 오버라이드 추가
    (다크 테마 블록과 동일한 패턴으로 배경/테두리/글자색을 beige 변수로 재정의). 데코 토글과
    무관하게 베이지 테마만 켜져 있으면 항상 적용(topbar/sidebar와 동일 조건). 일부는 인라인
    style로 흰색이 박혀있어서(과목별 학습 라벨, 반 랭킹 그리드 빈 상태 문구)
    `[style*="..."]` 속성 선택자 + `!important`로 별도 덮어씀.
  - "리락쿠마 켜기" 데코 토글(rrkm 전용)이 켜져 있을 때만 반 랭킹(`.tf-right`, "공부중인
    친구들" 패널) 배경 우하단에 `rilakkuma_sleeping.png`를 은은하게 배치. 이 이미지도 기존
    4개와 동일하게 사용자 본인이 GitHub 웹에서 직접 업로드한 것("Add files via upload" 커밋,
    `f084106`) — 파일명을 가리키는 CSS 경로만 작성함. `sw.js`의 `SW_BUILD`도 `2026-07-28-2`로
    올림.
- 2026-07-28 (1차): 두 가지 별개 개선. `sw.js`의 `SW_BUILD`도 `2026-07-28-1`로 올림.
  - **학습 플래너 과목 목록 위에 전용 "과목 색상 변경" 란 신설** (요청: "형광펜 색 변형이 잘
    안되는거같아, 국어 위에 색 변경 란을 따로 만들어줘") — 기존엔 각 과목의 9px짜리
    `.subject-dot`을 정확히 눌러야만 네이티브 컬러피커(`input[type=color]`)가 열렸는데, 이게
    잘 안 눌린다는 제보. `subject-list` 바로 위에 `#subject-color-tools` 카드를 추가해서
    드롭다운으로 과목을 고르고 `SUBJECT_COLORS` 팔레트를 28px 원형 스와치로 큼직하게 눌러
    바로 바꿀 수 있게 함(`renderSubjectColorTools()`/`renderSubjectColorSwatches()`,
    `renderSubjects()` 끝에서 매번 함께 갱신). 기존 dot 클릭 경로(자유색 네이티브 피커)는
    그대로 유지하고 커스텀 스와치(🎨)로 남겨둠 — 실제 색 반영/저장 로직은
    `setSubjectColor(si,hex)`로 통합해 두 경로가 공유.
  - **학생이 직접 과목을 추가할 수 있게 함** (요청: "과목 추가도 본인이 할 수 있게해줘") —
    `addSubject()`/`add-subject-modal`은 이미 있었지만 이걸 여는 버튼이 어디에도 없어서 실제로
    쓸 방법이 없었음. 색상 변경 란 헤더에 "+ 과목 추가" 버튼을 추가해 `openAddSubjectModal()`을
    연결. 또한 기존엔 새 과목을 추가해도 그날 할 일을 하나도 안 넣으면 `study_tasks`에 흔적이
    없어 새로고침 시 사라졌는데, `user_metadata.custom_subjects`(이름 배열)에 저장하고
    `buildSubjectsFromMeta()`의 extras에 포함시켜서 할 일 없이도 계속 남게 함.
  - **공지 투표에 취소 기능 추가** (요청: "투표 취소 기능 만들어줘") — 투표 후엔
    `renderPollBlock()`이 결과만 보여주고 되돌릴 방법이 없었음. 이미 투표한 경우
    `poll-meta-row`에 "투표 취소" 링크를 추가(`cancelPollVote(pollId)`) — 확인(`confirm()`)
    후 `notice_poll_votes`에서 본인 행(`poll_id`+`student_id`)을 delete하고 목록을 다시
    불러오면 다시 투표 버튼이 보임. RLS는 이미 본인 행 DELETE를 허용하도록 돼 있어서(위
    "Supabase 스키마" 섹션의 `notice_polls`/`notice_poll_votes` 항목 참고) 백엔드/스키마
    변경은 필요 없었음.
- 2026-07-27 (6차): 세 가지 별개 개선. `sw.js`의 `SW_BUILD`도 `2026-07-27-6`으로 올림.
  - **"베이지" 테마를 rrkm 계정 전용으로 제한**(요청: "다른 사용자들한테는 아예 베이지테마도
    안 보이게 해") — 기존엔 누구나 마이페이지에서 켤 수 있었는데(5차 이전 항목 참고),
    이제 마이페이지 "테마" 카드 자체가 `currentStudentId==='rrkm'`일 때만 보임
    (`populateMypage()`, `#mp-theme-card`). 공용 기기 등에서 이전에 켜져 있던 상태가
    localStorage에 남아있는 경우까지 대비해 `initApp()`에서 rrkm이 아닌데
    `data-theme==='bear'`면 강제로 되돌리는 가드도 추가.
  - **학습 리포트(플래너 날짜 내비게이션)에서 다른 날짜 기록 볼 때 같은 과제를 합산 표시**
    (요청: "a라는 과제를 30분+45분 나눠 했으면 따로 안 찍히고 합쳐서") —
    `renderSessionLogForDate()`가 기존엔 그날의 세션을 시간순으로 하나씩 그대로 나열했는데,
    이제 같은 과목+같은 과제끼리 `duration_seconds`를 합산하고, 2회 이상 합쳐진 항목은
    시각 대신 "n회"로 표시(1회면 기존처럼 시작 시각 표시). 정렬은 그날 첫 시작 시각 기준
    유지.
  - **과목 색상을 팔레트 대신 원하는 색으로 직접 지정 가능** (요청: "형광펜 색깔 너무
    좋은데, 과목에서 색깔 누르면 색변형도 원하는 대로 가능하게") — 과목 목록의 색 점
    (`.subject-dot`)을 누르면 네이티브 컬러피커(`#subject-color-picker`, 숨겨진
    `<input type="color">`)가 열리고, 고른 색이 `user_metadata.subject_colors`
    (`{과목명: hex}`)에 저장돼 기기를 바꿔도 유지됨. 새 전역 `customSubjectColors`가
    `SUBJECT_COLORS` 팔레트보다 항상 우선하도록 `buildSubjectsFromMeta()`/
    `loadSubjectsFromDB()`/`addSubject()`/`colorForSubject()` 전부에 반영해서, 타임테이블·
    월간 캘린더·리포트 차트 등 색을 쓰는 모든 화면에 일관되게 퍼짐.
- 2026-07-27 (5차): "리락쿠마 켜기" CSS 정리 + 잠재적 배포 사고 수습.
  - 세션 시작 시점에 이미 `index.html`/`sw.js`에 커밋되지 않은 변경이 남아있었음(다른
    편집 경로로 직접 수정된 것으로 보임) — `.page-title`/`.dday-tile` 등 장식 규칙이
    중복 정의돼 있었고(같은 선택자가 두 번 선언, 뒤에 오는 게 이겨서 동작은 했지만 코드가
    지저분함), `sw.js`는 **`const SW_BUILD`가 두 번 선언돼 있어 서비스 워커가 로드 시점에
    `SyntaxError`로 죽는 상태**였음(발견 즉시 하나로 정리 — 실제 배포됐다면 새로고침 배너/
    푸시 알림이 통째로 멈췄을 사고였음).
  - `rilakkuma_top.png`/`rilakkuma_face.png`/`rilakkuma_sit.png`/`rilakkuma_study.png`
    (D-Day 타일은 원래 CSS의 `rilakkuma_cheer.png`가 아니라 실제 존재하는
    `rilakkuma_sit.png`로 매칭) 4개 파일을 참조하도록 중복 제거 후 한 블록으로 통합.
    **이 이미지 파일 4개는 여전히 사용자 본인이 직접 넣고 커밋한 것 — 저는 파일명을
    가리키는 CSS 경로만 작성했고, git add/commit 시에도 이 png 파일들은 스테이징하지
    않음**(위 3차/4차 항목의 원칙 유지).
  - 더 이상 안 쓰는 `bear-placeholder.svg`는 파일 자체는 남겨뒀지만 CSS에서는 참조 안 함.
- 2026-07-27 (4차): "리락쿠마 켜기" 장식 위치를 5곳으로 확장(제미나이가 제안한 CSS 구조를
  참고 — 사용자가 다른 AI 모델에서 받은 코드를 붙여넣어서 요청함). `sw.js`의 `SW_BUILD`도
  `2026-07-27-4`로 올림.
  - 제미나이 제안은 `rilakkuma_top.png`/`rilakkuma_face.png`/`rilakkuma_cheer.png`/
    `rilakkuma_study.png`처럼 위치마다 다른 실제 캐릭터 이미지 파일명을 참조하는
    구조였는데, 실제 이미지 자체는 여전히 커밋하지 않는 원칙(3차 항목 참고)을 유지하면서
    구조만 그대로 살림 — 5곳 전부 지금은 동일한 `bear-placeholder.svg`를 재사용하도록
    구현. 자리마다 다른 이미지를 쓰고 싶어지면 파일명만 알려주면 각 `url()`을 그 파일명으로
    바꿔주는 방식(코드는 이미 준비돼 있어서 경로 문자열만 교체하면 됨).
  - 5곳: 페이지 타이틀 옆(`.page-title::after`, 40×40), 활성 뷰 버튼 옆(`.view-btn.active::after`,
    14×14), D-Day 타일 위(`.dday-tile::before`, 36×36), 플래너 리스트의 "기록 중" 배지 앞
    (`.list-session-subject span::before`, 12×12), 우하단 타이머 배지 안(`.timer-badge::after`,
    36×36).
- 2026-07-27 (3차): "리락쿠마 켜기" 장식의 곰 이미지 두 곳(`.page-title::after`,
  `.dday-tile::before`)을 이모지 텍스트 대신 `bear-placeholder.svg`를 참조하는
  `background-image`로 교체 — 사용자가 실제 리락쿠마 이미지 자산을 이 저장소에
  커밋해달라고 요청했으나(원화/2차창작 모두) 실제 캐릭터 원화를 제가 저장·배포하는 행동은
  계속 거절함(위 2차 항목과 동일 이유). 대신 사용자가 제안한 절충안대로, **완전히
  범용적인 흑백 곰 실루엣 placeholder SVG**(원 3개로 이루어진 머리+귀 모양, 리락쿠마
  특유의 디테일 없음, 제가 직접 새로 그림)를 커밋하고, 나중에 사용자가 같은 파일명
  (`bear-placeholder.svg`, 정사각형 규격)으로 실제 자산을 직접 교체할 수 있도록 코드
  경로만 준비해둠. `sw.js`의 `SW_BUILD`도 `2026-07-27-3`으로 올림.
  - 파일 교체(자산 저장/커밋/push)는 전적으로 사용자 본인이 직접 수행하는 몫 — 저는
    범용 placeholder 자산까지만 커밋함.
- 2026-07-27 (2차): "베이지" 테마 위에 얹는 "리락쿠마 켜기" 장식 토글 신설 —
  `currentStudentId==='rrkm'` 계정 한 명에게만 마이페이지에 추가 체크박스가 노출됨(요청:
  "나머지 학생들한테는 베이지 테마까지만 열어주고 rrkm학생한테는 리락쿠마 on off버튼을
  활성화"). `sw.js`의 `SW_BUILD`도 `2026-07-27-2`로 올림.
  - **사용자가 보낸 사진 속 실제 리락쿠마 캐릭터 일러스트는 저작권이 있어 그대로 재현하지
    않고, 곰 이모지(🐻)/발바닥 이모지(🐾)로 대체** — 베이지 테마 신설 때와 동일한 이유·
    동일한 판단(위 항목 참고). `:root[data-theme="bear"][data-bear-decor="on"]`
    CSS 블록에서 `.page-title::after`(🐻), `.view-btn.active::after`(🐾),
    `.dday-tile::before`(🐻) 세 곳에 장식 추가.
  - `data-bear-decor="on"` 속성은 `bearDecor` localStorage 키로 관리, anti-flash
    인라인 스크립트(`<head>`)에서 `theme==='bear'`이고 `bearDecor==='on'`일 때만 첫
    페인트 전에 적용.
  - 마이페이지 "테마" 카드에 `mp-bear-theme`(베이지 테마) 아래 숨겨진
    `mp-bear-decor-row`/`mp-bear-decor` 체크박스 추가 — `populateMypage()`가
    `currentStudentId==='rrkm'`일 때만 보이게 함.
  - `toggleBearDecor(on)` 신설: 켤 때 베이지 테마가 꺼져 있으면 같이 켬(장식은 테마 위에서만
    의미가 있어서). `toggleBearTheme(on)`의 off 분기도 수정 — 베이지 테마를 끄면 얹혀 있던
    장식도 같이 꺼지도록(`bearDecor` 리셋 + 체크박스 동기화).
- 2026-07-27: 라이트/다크와 별개로 켜고 끄는 선택형 "베이지" 테마 신설(마이페이지에서 누구나
  켤 수 있음 — 사용자가 친구 한 명에게 주고 싶어했던 커스텀 배경 요청). `sw.js`의
  `SW_BUILD`도 `2026-07-27-1`로 올림.
  - `:root[data-theme="bear"]` CSS 변수 블록 신설(`:root[data-theme="dark"]`와 동일한
    구조) — 이 프로젝트는 색상을 전부 CSS 변수로 관리해서(포인트색은 `--blue` 하나) 변수만
    바꾸면 버튼/링크/액티브 상태 등 앱 전체에 자연스럽게 퍼짐. 사용자가 준 참고 사진의
    따뜻한 크림/베이지 배경 + 주황빛 포인트 컬러 톤을 재현. body 배경에 저해상도 발바닥
    모양 SVG 패턴(data URI)을 낮은 투명도로 깔아 은은한 질감을 줌.
  - **사진 속 캐릭터 일러스트(리락쿠마)는 저작권이 있는 캐릭터라 그대로 쓰지 않고, 일반적인
    발바닥 모양 패턴으로 분위기만 대신 재현함** — 색감/톤은 최대한 맞췄지만 실제 캐릭터
    아트워크를 복제하지는 않았다는 점을 기록해둠.
  - 로그인 즉시(첫 페인트 전) 테마를 적용하는 anti-flash 인라인 스크립트(`<head>` 최상단)에
    `localStorage.getItem('theme')==='bear'` 분기 추가. 사이드바의 기존 다크모드 토글
    버튼(`toggleTheme()`)과는 별개로, 마이페이지 "테마" 카드의 체크박스로 켜고 끔
    (`toggleBearTheme()`, 같은 `theme` localStorage 키를 공유하되 값만 `'bear'`로 확장).
  - 특정 계정 전용으로 제한하지 않고 마이페이지에서 원하는 사람 누구나 켤 수 있게 열어둠
    (요청이 "친구 한 명에게"였지만 굳이 계정별 권한 플래그까지는 필요 없다고 판단 — 필요해지면
    타반 계정처럼 role 플래그로 제한 가능).
- 2026-07-25 (13차): 관리자 탭에서 이미 있는(3-1 포함) 기존 계정도 타반으로 전환/해제할 수
  있게 함 — 12차에서는 "계정 생성" 시점 체크박스로만 타반 지정이 가능했는데, 이미 만들어진
  계정을 나중에 옮기고 싶다는 요청. `sw.js`의 `SW_BUILD`도 `2026-07-25-13`으로 올림.
  - `loadAdminList()`가 `user_roles`에서 `is_external`/`mentor_student_id`도 함께 읽어와
    `allAccounts`에 채우고, `renderAdminTable()`이 "타반 · <멘토학번>" 배지를 표시.
  - 새 `setExternalFlag(sid,flag)`(owner-tier 전용, `setTeacherFlag()`와 동일 패턴) —
    전환 시 `mentor_student_id`를 전환을 실행한 사람으로 자동 지정("내 학생"에 바로
    등록됨), 해제 시 `is_external:false`+`mentor_student_id:null`로 되돌림. 각 행에
    "타반으로 전환"/"타반 해제" 버튼 추가.
- 2026-07-25 (12차): "타반(다른반)" 계정 지원 신설 — 3-1 소속이 아닌 학생(개인 과외/멘토링
  대상)에게도 계정을 만들어줘서 개인용 학습 도구만 쓰게 함. 선택과목 드롭다운 누락
  수정(윤리와사상), 마이페이지 "학교 설정"(리로스쿨 링크) 신설도 같이 진행. `sw.js`의
  `SW_BUILD`도 `2026-07-25-12`로 올림. 상세 설계는 대화 중 작성한 플랜 파일
  (`C:\Users\User\.claude\plans\parallel-hatching-sundae.md`) 참고.
  - **`user_roles`에 컬럼 2개 추가**: `is_external`(= 타반 여부, `is_teacher`처럼
    `role`과 독립적인 플래그), `mentor_student_id`(담당 멘토 학번, 보통 계정을 만들어준
    사람). 별도 "친구추가" 테이블 없이 이 컬럼 하나로 멘토-멘티 관계를 표현(멘토는 1명이라는
    전제).
  - **`applyExternalAccountVisibility()` 신설**(`loadMyRole()` 끝에서 호출) — 타반
    계정이면 사이드바에서 공지사항/캠스터디/게시판(그룹 전체) 숨김, 대시보드의 시간표·
    급식·공지 섹션 숨김, 플래너 통계바에서 "총 공부 시간"만 남기고 나머지(참여자/현재공부중/
    등수/상위) 숨김, 리포트의 "반 랭킹" 섹션 숨김, 전체화면 타이머의 반 랭킹 그리드 숨김.
    학습 플래너 본체·타이머·성적계산기·뉴스·즐겨찾기·마이페이지는 그대로 노출.
  - **게시판(자유/질문/버그)은 예외적으로 DB RLS에서도 진짜로 차단**(사용자가 명시적으로
    요청 — 다른 항목은 UI에서만 가림). `is_staff(uuid)`와 동일 패턴의 `is_external(uuid)`
    SECURITY DEFINER 함수를 신설하고, `posts`/`comments`의 SELECT(`누구나 읽기`)·
    INSERT(`본인만 쓰기`) 정책에 `NOT is_external(auth.uid())` 조건을 추가.
  - **반 랭킹/참여자 집계에서 타반 계정 기록 제외**: `loadExternalIdSet()`(5분 캐시,
    `loadProfileMap()`과 동일 패턴)을 신설해 `refreshStats()`/`renderReport()`의 랭킹
    조회/`fetchTfRankData()`에서 타반 계정의 `study_sessions` 행을 걸러냄(타반 계정
    본인에게는 이 UI 자체가 안 보이므로 반대 방향 필터는 불필요).
  - **DM은 타반 계정 ↔ 담당 멘토 사이만 가능**: `loadDmRoster()`를 계정 유형별로 분기 —
    타반 계정은 `mentor_student_id` 한 명만 상대 목록에 뜨고, 3-1(일반) 계정은 타반 계정을
    상대 목록에서 제외하되 "내가 그 계정의 멘토인 경우"만 예외로 보이게 함(멘토도 먼저 말을
    걸 수 있어야 하므로).
  - **"내 학생" 페이지 신설**(멘토 전용, `page-mentees`) — 기존 교사 뷰(`renderTeacherGrid`
    등)와 거의 동일한 카드 그리드 패턴을 재사용하되 대상만 `user_roles.mentor_student_id
    = 나`인 학생들로 한정. "+ 학생 추가"로 학번을 입력해 등록(해당 학번이 한 번이라도
    로그인해서 `user_profiles` 행이 있어야 함), 카드의 🗑️ 버튼으로 멘토 해제. 카드 클릭 시
    기존 `openStudentDetail()`을 그대로 재사용(범용 함수라 손 안 댐). owner-tier(계정 생성
    권한과 동일 기준)에게만 노출.
  - **관리자 탭 "계정 생성"에 "타반 계정" 체크박스 추가** — 체크하면 계정 생성 성공 직후
    `user_roles`에 `is_external:true, mentor_student_id:<생성자 학번>`을 upsert(백엔드
    API 안 거치고 프론트에서 직접, `setTeacherFlag()`와 동일한 패턴). 백엔드
    (`bugwang-server`)는 이미 임의의 아이디 문자열/전체 계정 목록을 다루고 있어서 수정
    불필요함을 확인 후 진행.
  - **마이페이지 "학교 설정" 신설**(리로스쿨 링크 저장, `user_metadata.riro_url`) —
    부광고 외 다른 학교 소속 계정(타반 등)이 즐겨찾기의 "리로스쿨" 항목을 자기 학교 주소로
    덮어쓸 수 있게 함. `renderFavorites()`가 렌더링 시점에 저장된 값이 있으면 그걸 우선
    사용, 없으면 기존 부광고 기본 주소(`bg.riroschool.kr`) 그대로.
  - **선택과목 드롭다운 누락 수정**: "탐구 과목 2" 드롭다운(`setup-exp2`/`mp-sel-exp2`)에
    "윤리와사상"이 빠져 있던 걸 발견해서 추가("탐구 과목 1" 드롭다운엔 원래 있었음).
- 2026-07-25 (11차): 자유게시판을 하위 카테고리 4개(자랑/공부인증/잡동사니/정보·팁)로 분리.
  `sw.js`의 `SW_BUILD`도 `2026-07-25-11`로 올림.
  - **스키마 변경 없이 `posts.category` 값 자체를 4개 새 키('brag'/'studycert'/'misc'/'tips')로
    씀**(원래 `category`가 CHECK 제약 없는 text 컬럼이라 가능). `FREE_BOARD_CATEGORIES` 배열이
    단일 소스 — 탭 버튼(`#free-category-tabs`)과 글쓰기 폼의 카테고리 select
    (`#free-post-category`) 둘 다 이 배열로 렌더링(`renderFreeCategoryTabs()`).
  - `boardLoader(type)`/`renderPost()`의 좋아요 표시 조건이 예전엔 `type==='free'`로 리터럴
    비교했는데, 이제 4개 값 중 하나가 다 들어올 수 있어서 `FREE_CATEGORY_KEYS.includes(type)`
    체크로 일반화. `submitPost('free')`는 여전히 글쓰기 폼 DOM id(`free-content` 등)는
    그대로 쓰되, 실제 저장되는 `category` 값은 폼의 select에서 고른 하위 카테고리를 사용하도록
    분리(폼 id 프리픽스와 DB 카테고리 값을 디커플링). 글을 올리면 그 카테고리 탭으로 자동
    전환해서 바로 보여줌.
  - **기존 `category='free'` 게시글 20건은 DB에서 `misc`(잡동사니)로 일괄 마이그레이션** —
    안 옮기면 어느 탭에서도 안 보이는 상태로 남기 때문. 코드 변경이 아니라 운영 데이터
    정리라 마이그레이션 자체는 이 저장소 커밋에 안 남고 Supabase에 직접 적용함.
- 2026-07-25 (10차): "학생현황"(선생님용) 화면을 학생 본인 학습 플래너와 같은 경험으로 확장 +
  과목별 비율 파이를 일/주/월 단위로 볼 수 있게 함(학생현황·학습리포트 양쪽 모두).
  `sw.js`의 `SW_BUILD`도 `2026-07-25-10`으로 올림.
  - **`renderTimeblock()`/`renderSessionLogForDate()`에 `idPrefix` 파라미터 추가** — DOM id
    접두사만 다르게 줘서 학생 본인 플래너('')와 학생현황('sd-') 양쪽에서 같은 렌더 로직을
    그대로 재사용. 학생현황엔 이 두 함수를 쓰는 새 "타임테이블" 탭을 추가(`sd-tab-timetable`)
    — 학생 본인 플래너와 동일한 리스트/타임테이블 전환 + ‹ 날짜 › 🗓 내비게이션을 그대로 갖춤
    (`sdState.logDate`로 상태 관리, `loadSdLogDate`/`shiftSdLogDate`/`pickSdLogDate`).
  - **과목별 비율 도넛 렌더를 `renderSubjectPie(subjWithTime,totalSec,idPrefix)` 공용 함수로
    추출**하고, 학생 본인 리포트(`page-report`)와 학생현황 리포트 탭 양쪽에 일/주/월 토글
    (`.pie-range-toggle`)을 추가함. "일"은 기존처럼 실시간(오늘 실행 중인 타이머 경과분 포함)
    으로 계산하고, "주"/"월"은 `study_sessions`을 해당 기간(이번 주 월요일부터/이번 달 1일부터)
    으로 새로 집계(`getPieRangeStart()`). 과목 색상은 현재 `subjects` 목록에 있으면 그 색을,
    없으면(과거에 이름이 바뀌었거나 지워진 과목) `colorForSubject()` 해시색으로 폴백해서
    항상 일관되게 표시.
- 2026-07-25 (9차): 학습 플래너 일지 뷰(리스트/타임테이블)에서 오늘이 아닌 다른 날짜의 공부
  기록도 넘겨볼 수 있는 날짜 내비게이션 추가. `sw.js`의 `SW_BUILD`도 `2026-07-25-9`로 올림.
  - `.view-toggle`(리스트/타임테이블 버튼) 옆에 ‹ 날짜 › 🗓 내비게이션 추가(`planner-log-datenav`).
    ‹/›는 하루씩 이동(`shiftPlannerViewDate`), 🗓은 숨겨둔 `<input type="date">`의 네이티브
    피커를 열어(`openPlannerDatePicker`, `showPicker()` 우선 사용) 원하는 날짜로 바로 점프
    (`pickPlannerViewDate`). 미래 날짜는 기록이 있을 수 없으므로 이동/선택 모두 오늘까지로 막음.
  - **왼쪽 "과목별 태스크" 패널(할 일 추가·체크·타이머)은 이 날짜 내비게이션과 무관하게 항상
    오늘 것만 다룸** — 브라우징 대상은 오른쪽 일지 뷰뿐. 과거 날짜를 보는 동안엔 리스트는
    (기존의 "과제별 누적 합산" 대신) 그날 실제 세션을 시간순으로 그대로 보여주는
    `renderSessionLogForDate()`가 담당하고, 타임테이블은 기존 `renderTimeblock()`을
    `sessions` 인자를 받는 형태로 확장해 재사용(인자 없이 호출되면 "오늘 실시간" 모드로
    동작, 인자를 주면 그 배열을 그대로 그림).
  - **핵심 함정 처리**: `renderSessionLog()`/`renderTimeblock()`(인자 없이 호출되는 "오늘
    실시간" 경로)은 타이머 tick·세션 저장 등 앱 곳곳에서 초 단위로 호출되는데, 사용자가
    과거 날짜를 보고 있는 도중 이게 그대로 실행되면 화면이 오늘 데이터로 도로 덮어써진다 —
    두 함수 모두 맨 앞에 `if(!isPlannerViewToday())return;` 가드를 넣어서, 과거 날짜를 보는
    동안엔 오늘의 실시간 갱신이 조용히 스킵되게 함(다시 오늘로 돌아오면 정상 갱신 재개).
  - 과거 날짜 조회는 `study_sessions.subject`가 지금 `subjects` 목록에 없을 수 있으므로(과목
    이름 변경/삭제), `colorForSubject()`(이름 해시 기반 색) 폴백을 타임테이블/리스트 양쪽에
    적용해 항상 일관된 색으로 표시되게 함.
- 2026-07-25 (8차): 성능 최적화 일괄 적용(DM 폴링, 타이머 랭킹, 교사 뷰, 게시판 선조회, 각종
  폴링의 백그라운드 가드) + 업데이트 배너 애니메이션을 transform-only에서 opacity+transform
  방식으로 교체(사용자가 정확한 CSS 스펙을 직접 지정). `sw.js`의 `SW_BUILD`도
  `2026-07-25-8`로 올림.
  - **DM 방 목록 폴링(`loadDmRooms`, 7초 주기)이 가장 심각했음** — 변화가 없어도 매번 모든
    방의 메시지 기록을 `limit` 없이 통째로 다시 받고 있었음. 이제 "전체 방 중 가장 최신
    메시지 1건 id + 내 읽음 상태"로 지문(`dmRoomsFingerprint`)을 만들어 지난 폴링과 같으면
    무거운 조회 자체를 건너뛰고, 바뀌었을 때만 최신 300건 창 안에서 다시 계산(그 밖의 오래
    조용한 방은 이전 캐시된 미리보기를 재사용, 없으면 그 방만 1건씩 보충 조회).
  - **`loadDmMessages()`도 방 전체 기록을 무제한으로 받던 걸 최신 200개로 제한**(스레드를
    열 때 + 7초 폴링마다 계속 커지는 구조였음 — 필요해지면 위로 스크롤 시 과거분 추가 로드로
    확장 가능).
  - **학습 타이머 전체화면 랭킹**(`fetchTfRankData`/`renderTfRankGrid`)이 5초마다(시간당
    720번) 반 전체 세션+프로필을 재조회하고, 순위 변동이 없어도 아바타 이미지 포함 전체를
    매초 innerHTML로 다시 그리고 있었음 — 진행 중 세션은 로컬에서 초 단위로 이어 계산되므로
    DB 재조회는 30초 주기(+화면이 안 보이면 건너뜀)로 늦추고, `tfRankOrderKey`로 학생
    구성·순서가 그대로면 시간 텍스트 노드만 바꿔치기하도록 diffing 추가. 장시간 켜두는
    화면이라 배터리 영향이 컸을 것.
  - **교사 뷰**(`updateTeacherViewData`)가 교사 페이지를 벗어나도 앱을 끌 때까지 5초마다
    계속 `/api/users` + 전체 세션 조회를 돌리고 있었음 — 페이지가 실제로 활성 상태이고
    화면이 보일 때만 돌게 가드 추가, 학생 명단(`teacherUsersCache`)은 수업 중 안 바뀌므로
    페이지 진입 시 1회만 받아 재사용, 주기도 5초→15초로 늘림. 매번 카드 등장 애니메이션이
    재생되며 깜빡이던 것도 `.teacher-grid.loaded .student-card{animation:none}` 한 줄로
    최초 1회만 재생되게 함.
  - **`loadProfileMap()`(반 전체 이름/아바타 맵, DM·게시판·타이머 랭킹 공용)에 5분 캐시
    추가** — 자주 안 바뀌는 데이터를 폴링마다 매번 반 전체를 다시 받고 있었음. 이름/아바타
    변경 반영이 최대 5분 늦어질 수 있는 트레이드오프.
  - **게시판 3종(자유/질문/버그)을 로그인 직후 무조건 미리 받던 것을 제거**, 실제로 그
    페이지를 열 때(`navigate()`)만 불러오도록 변경 — 대부분 안 열어보는 페이지까지 매
    로그인마다 선조회해서 초기 로딩만 늦추고 있었음.
  - **`initApp()`에서 `loadMeal()`/`loadNotices()`가 각각 두 번씩 호출되던 중복 제거**.
    `loadNotices()`는 실모반 전용 노출 여부가 역할 로드 결과에 좌우돼서 원래 역할 로드
    전/후 두 번 부르고 있었는데, 역할이 확정된 시점 한 번만 부르는 것으로 정리(역할 로드
    전에 한 번 더 부르던 건 실모반 공지가 잠깐 안 보였다 다시 나타나는 깜빡임의 원인이기도
    했음). `loadMeal()`은 역할과 무관한데 그냥 똑같이 중복 호출되고 있던 것.
  - **DM 폴링(7초)/알림 카운트 폴링(30초)에 `document.hidden` 가드 추가** — 탭이 백그라운드로
    밀려 있을 때는 쉬도록 함.
  - **다음 단계로 남겨둔 것**: 위 폴링들을 Supabase Realtime 구독으로 바꾸면 더 근본적으로
    해결되지만 구조 변경이 커서 이번엔 손대지 않음. 지금 상태로도 유휴 시 트래픽이 크게
    줄어서 당분간은 충분할 것으로 판단.
- 2026-07-25 (7차): "새로고침하기" 업데이트 배너(`#update-banner`)가 07-25(5차)로 다른 하단
  잘림은 다 고쳐진 뒤에도 유독 계속 잘려 보인다는 제보 — 원인 조사 대신 사용자 요청대로 아예
  화면 하단이 아니라 **상단으로 위치를 옮김**. `sw.js`의 `SW_BUILD`도 `2026-07-25-7`로 올림.
  - 데스크톱: `bottom:24px` → `top:24px`. 모바일(`@media(max-width:834px)`)은 상단에 이미
    모바일 탑바(`.topbar`, 높이 `var(--nav-h)+safe-area-inset-top`)가 있어서 그 위로 겹치지
    않도록 `top:calc(var(--nav-h) + env(safe-area-inset-top) + 12px)`로 그 아래 여백에 배치.
    슬라이드 애니메이션 방향도 아래에서 올라오던 것(`translateY(140%)→0`)을 위에서
    내려오는 것(`translateY(-140%)→0`)으로 맞춰 뒤집음.
- 2026-07-25 (6차): 우하단 학습 타이머 배지(`#timer-badge`)가 다른 UI를 가린다는 제보로
  자유롭게 드래그해서 옮길 수 있게 함(`initTimerBadgeDrag()`). `sw.js`의 `SW_BUILD`도
  `2026-07-25-6`으로 올림.
  - Pointer Events(`pointerdown`/`move`/`up`/`cancel`)로 마우스/터치를 한 코드로 처리.
    4px 이상 움직였을 때만 "드래그"로 인정하고, 움직임이 없었으면(=그냥 탭/클릭) 기존처럼
    `reopenTimerView()`로 전체화면 타이머를 열도록 유지 — 이 판단 때문에 배지의
    `onclick="reopenTimerView()"` 인라인 속성은 제거하고 `pointerup` 핸들러 안에서 조건부로
    호출하도록 옮김. 정지 버튼(`.timer-badge-stop`)은 `pointerdown` 시점에 타깃이 그
    버튼이면 드래그 시작 자체를 건너뛰어서 기존 정지 동작을 그대로 보존.
  - 옮긴 위치는 `localStorage`(`timerBadgePos`)에 저장해 다음에 열어도 유지, 화면 크기가
    바뀌면(회전 등) 저장된 좌표를 뷰포트 안으로 재보정. 드래그 전(기본 상태)에는 기존 CSS의
    우하단 고정 위치(모바일 safe-area 대응 포함)를 그대로 쓰고, 한 번이라도 드래그하면 그때부터
    인라인 `left`/`top`이 그 CSS를 덮어써서 자유 위치로 전환됨. `touch-action:none`을 추가해
    모바일에서 드래그 중 배경 스크롤과 충돌하지 않게 함.
- 2026-07-25 (5차): DM 하단 잘림의 **진짜** 근본 원인을 사용자가 정확히 특정해줌 — `.page.active`에
  걸린 `page-in` 애니메이션이 `animation-fill-mode:both`라서 애니메이션이 끝난 뒤에도
  `transform:translateY(0)`이 계속 남아있었고, 이 `transform`이 자손 `position:fixed` 요소의
  containing block을 뷰포트가 아니라 `.page`(`#page-dm`) 자신으로 바꿔버려서, `.dm-thread-panel`의
  `position:fixed`가 진짜 뷰포트 기준이 아니라 `#page-dm` 기준으로 잡히며 그만큼 아래로 밀려
  하단이 잘렸던 것(CSS 스펙: `transform`이 `none`이 아닌 조상은 그 자손 `fixed`/`absolute`
  요소의 containing block이 된다). `sw.js`의 `SW_BUILD`도 `2026-07-25-5`로 올림.
  - **수정은 `page-in` 키프레임에서 `transform` 자체를 빼고 `opacity`만 남기는 것 하나**
    (`@keyframes page-in{from{opacity:0}to{opacity:1}}`). **07-25(2차~4차)에 시도했던
    `--vvh`(visualViewport 실측)/`height:100%` 제거 등은 전부 이 진짜 원인이 아니었음** —
    당시엔 증상이 간헐적/기기별로 달라 보여서 다른 방향으로 파고들었는데, 실은 처음부터
    `.page`에 걸린 애니메이션의 `fill-mode:both` 잔여 transform이 원인이었음. **교훈: 어떤
    페이지 안에서 `position:fixed` 자식 요소가 뷰포트가 아니라 그 부모 컨테이너 기준으로
    잘못 위치하는 것처럼 보이면, 그 부모(또는 조상)에 `transform`(애니메이션으로 남은 잔여
    값 포함)이 걸려있는지부터 확인할 것 — `filter`/`perspective`/`will-change:transform`도
    동일하게 containing block을 바꾸므로 같이 의심.**
- 2026-07-25 (4차): 사용자가 DM 하단 잘림의 진짜 원인을 직접 특정해줌 + 과목 색상 팔레트를
  "스테들러 클래식 파스텔"로 재교체. `sw.js`의 `SW_BUILD`도 `2026-07-25-4`로 올림.
  - **DM 하단 잘림의 실제 원인은 `.dm-thread-active{height:100%}`였음**(사용자 진단, 코드로
    확인 후 반영). `.dm-thread-panel`(flex-column) 안에서 `.dm-thread-active`는 이미
    `flex:1`로 `.dm-thread-head`가 차지한 만큼을 제외한 남는 공간을 정확히 채우는데, 여기에
    `height:100%`를 같이 주면 형제 요소(`.dm-thread-head`)의 높이를 고려하지 않은 부모 전체
    높이 기준으로 다시 커지려고 해서 실제 가용 공간보다 커짐 — 이 초과분만큼 맨 아래
    `.dm-thread-input-row`가 화면 밖으로 밀려 잘렸던 것. `height:100%` 삭제, `flex:1`만
    남김. **07-25(2차/3차)에 시도했던 `--vvh`(visualViewport 실측) 접근도 나쁜 방향은
    아니었지만(다른 종류의 뷰포트 오차에는 여전히 유효한 방어책이라 그대로 둠), 이번 건의
    진짜 원인은 그쪽이 아니라 순전히 flex 자식의 `height:100%` 오지정이었다는 게 밝혀짐 —
    앞으로 `flex:1`이 붙은 요소에 `height:100%`를 같이 주는 패턴은 형제 요소가 있는 flex
    컨테이너에서는 특히 의심해볼 것.**
  - **과목 색상 팔레트를 "스테들러 클래식 파스텔" 10색으로 재교체**(`SUBJECT_COLORS`,
    07-25 3차에 넣었던 "마일드 라이너" 팔레트를 대체). 마지막 값(`#4a4a4a`)은 사용자가 준
    원본 이미지에서 스와치는 진회색인데 hex 라벨이 바로 위 항목과 똑같이 잘못 찍혀 있어서
    (이미지 자체의 오타로 보임) 실제 색상에 맞춰 추정한 값 — 정확한 hex를 받으면 교체 필요.
    이 팔레트에 진한 색(#4a4a4a)이 섞여 있어서, 07-25(3차)에 타임테이블 블록에 추가한 과제
    이름 라벨의 글자색을 검정 고정에서 **배경 밝기 기준 자동 흑/백 선택**(`readableTextColor()`,
    YIQ 근사 공식)으로 바꿔서 어두운 블록 위에서도 라벨이 읽히게 함.
- 2026-07-25 (3차): 07-25(2차)에서 `top+bottom`만으로 채우게 고쳤는데도 같은 안드로이드
  태블릿에서 DM 입력창 하단 잘림이 재현됨(사용자가 재차 스크린샷 제보) — `top/bottom:0`
  방식 자체도 이 기기/브라우저에서는 실제 보이는 영역과 안 맞았다는 뜻이라, 더 확실한 방법으로
  교체. `sw.js`의 `SW_BUILD`도 `2026-07-25-3`으로 올림.
  - **`window.visualViewport`로 실측한 높이를 CSS 변수(`--vvh`)로 내려주는 방식 도입**
    (`updateRealViewportHeight()`, 메인 스크립트 최상단). `resize`/`orientationchange`/
    `visualViewport.resize` 이벤트마다 갱신. `#timer-fullscreen`/`.dm-thread-panel`은 이제
    `bottom`을 아예 안 쓰고 `height:100dvh;height:var(--vvh,100dvh)`로 교체 — `--vvh`가
    아직 없으면(JS 실행 전 첫 페인트 순간) `100dvh`로 폴백하고, JS가 돌면 즉시 진짜 측정값으로
    스냅됨. **07-25(2차)에 "top+height+bottom 동시 지정 금지"라고 적었던 건 여전히 유효한
    스펙 지식이지만, 그 자체가 이 기기의 하단 잘림을 완전히 못 고쳤다는 게 이번에 확인됨 —
    top/bottom(inset) 방식보다 JS 실측 `--vvh`가 더 신뢰도가 높다는 게 이번 조사의 결론.**
    앞으로 새 전체화면 오버레이를 만들 때도 `--vvh`를 우선 사용할 것.
- 2026-07-25 (2차): 안드로이드 태블릿 스크린샷 제보로 DM 스레드 입력창(전송 버튼 포함)이
  하단에서 잘려 보이는 실제 원인을 특정해서 수정. `sw.js`의 `SW_BUILD`도 `2026-07-25-2`로 올림.
  - **원인은 CSS `top`+`height`+`bottom` 동시 지정으로 인한 과잉조건(over-constrained)**.
    `.dm-thread-panel`(모바일)이 `top:0;left:0;right:0;bottom:0`으로 뷰포트를 꽉 채우면서
    동시에 `width:100vw;height:100dvh`도 명시하고 있었는데, CSS 스펙상 절대/고정 위치 요소에서
    top·height·bottom이 모두 지정되면 **bottom은 무시되고 height 쪽 계산값이 이긴다** — 즉
    이 패널의 실제 렌더링 높이는 "위→아래 꽉 채움"이 아니라 그냥 `100dvh` 값 그 자체가 됐던
    것. 안드로이드 브라우저에서 이 `100dvh` 계산값이 실제로 보이는 화면보다 크게 잡히면서
    패널이 화면 밖으로 밀려나고, 그 안의 맨 아래 요소인 메시지 입력창(전송 버튼 포함)이
    반쯤 잘려 보였음. **바로 전 세션(07-23)에 내가 `#timer-fullscreen`에 방어적으로
    `height:100vh;height:100dvh`를 추가한 것도 같은 실수**(원래 `inset:0`만 있던 걸 굳이
    height까지 같이 준 것)라 같이 되돌림. 두 곳 모두 `top/right/bottom/left` 네 오프셋만으로
    크기를 결정하게 하고 별도 `width`/`height`는 아예 안 주는 쪽으로 정리 — 이 방식이 dvh
    지원 여부/정확도에 의존하지 않고 뷰포트를 정확히 꽉 채우는 더 안전한 방법. **앞으로
    `position:fixed`+전체화면 오버레이를 만들거나 손댈 때, top/bottom(또는 inset)과 height를
    동시에 주지 말 것 — 항상 offset 네 개(또는 inset:0)만으로 크기를 결정하게 둘 것.**
- 2026-07-25: 모바일 UI 최적화 요청 처리(패드 세로거치 시 하단 잘림, 작은 터치 버튼들, 그리고
  가장 심각했던 "두 과목이 동시에 카운트되는" 버그) + 타임테이블에 과제 이름 라벨 추가 + 과목
  색상 팔레트를 사용자가 준 "마일드 라이너" 파스텔 팔레트로 교체. `sw.js`의 `SW_BUILD`도
  `2026-07-25-1`로 올림.
  - **"두 과목이 동시에 카운트되는" 버그(가장 심각한 제보)**: 2026-07-22에 한 번 고쳤다고
    기록됐던 문제인데도 재발했음 — 원인은 `attachTimerInterval()`이 호출될 때마다 그 결과인
    `setInterval` id를 오직 `activeTimer.interval` 필드에만 저장했는데, `activeTimer`가
    통째로 새 객체로 교체되는 경로(예: 태스크 전환, 07-23에 추가한 다른 기기 재동기화
    `applyServerTimerTruth()`의 재구성 로직)에서 이전 interval을 못 지우고 놓치면, 그 이전
    interval이 자기 클로저에 갇힌 옛 과목의 si/ti를 계속 들고 살아남아 `subjects[si].tasks[ti]
    .seconds`를 영원히 계속 올리는 상태가 될 수 있었음 — 이게 "두 과목이 동시에 초가 오른다"의
    실체. 이중으로 방어함: 1) `activeTimer` 객체가 아니라 모듈 전역 변수 `timerIntervalId`
    하나로 "지금 살아있는 timer interval"을 추적해서 `attachTimerInterval()`이 항상 이걸 먼저
    지우고 시작하게 함. 2) 더 결정적으로, interval 콜백 자신이 매 tick마다 "내가 만들어질 때의
    si/ti가 지금의 `activeTimer`와 여전히 일치하는지" 스스로 확인해서, 불일치하면(=자기가
    지워지지 않고 살아남은 낡은 interval이면) 스스로 `clearInterval`하고 더 이상 아무 것도
    쓰지 않도록 함 — 이 두 번째 방어가 진짜 안전망이라 설령 앞으로 또 다른 경로에서 interval을
    못 지우는 실수가 생겨도 "두 과목 동시 카운트" 증상 자체는 재발하지 않음. 추가로
    `applyServerTimerTruth()`에도 `timerGen`(기존에 시작/정지 경합 방지용으로 있던 카운터)
    스냅샷 검사를 넣어서, 서버 조회가 진행되는 동안(await) 사용자가 직접 다른 태스크로
    전환했으면 그 낡은 조회 결과로 방금 시작한 진짜 타이머를 덮어쓰지 않고 조용히 물러나게 함.
  - **패드를 세로로 거치했을 때 화면 하단이 잘리는 문제**: 학습 플래너 전체화면 타이머
    (`#timer-fullscreen`)의 `.tf-body`가 `flex:1`인데 `min-height:0`이 없어서, flex 자식의
    기본값(`min-height:auto`)이 내용물(과목/할일 목록이 많을 때)만큼 강제로 커지면서 부모의
    고정 높이를 넘어버리고 — 이 전체화면은 `document.body.style.overflow='hidden'`으로 배경
    스크롤을 잠가두기 때문에 넘친 부분이 스크롤로도 안 닿는 진짜 "잘림"이 됐던 것. `.tf-body`,
    `.tf-left`, `.tf-right`에 `min-height:0`을 추가해 각자의 `overflow-y:auto`가 실제로
    작동하도록 고침(고전적인 flex/grid "min-height:auto 함정"). 여기에 더해 body/앱쉘/
    메인콘텐츠의 `min-height:100vh`에 `100dvh` 폴백을 병기하고(2026-07-16 DM 패널 수정 때와
    동일한 이유 — 모바일 브라우저 주소창 유무로 100vh 기준이 실제 보이는 높이와 달라짐),
    `#timer-fullscreen`/`.tf-left`/`.tf-right`에 `env(safe-area-inset-bottom)` 패딩을 추가해
    홈 인디케이터/제스처 바에 컨트롤 버튼이 가려지지 않게 함.
  - **모바일 터치 버튼 크기/hover 의존성 문제**: 학습 플래너 할 일 행의 수정·시간수정·삭제
    버튼(`.task-edit-btn`/`.task-del-btn`)이 `opacity:0`이고 `.task-row:hover`일 때만 보이는
    CSS였음 — 07-23에 이미 수정 모달(`.erm-row`)에서 같은 클래스의 같은 문제를 고쳤었는데,
    정작 원본인 할 일 목록 자체는 그대로 남아있었던 것(터치 기기는 hover가 없어 늘 안 보이고
    탭도 안 됨). `@media(pointer:coarse)` 블록을 신설해서(폭 기준이 아니라 터치 입력 여부
        기준 — 아이패드는 가로모드 큰 화면에서도 터치라 폭 미디어쿼리로는 못 잡음) 이 버튼들을
    항상 보이게 하고 탭 패딩을 넉넉히 늘림(Apple HIG 44pt/Material 48dp 권장에 맞춤). 같은
    블록에서 체크(완료) 버튼, 과목 추가 버튼, 재생 버튼, 모달 닫기 버튼도 함께 키움. `.task-name`에
    `overflow:hidden;text-overflow:ellipsis`를 추가해 버튼이 커진 만큼 이름이 자연스럽게
    말줄임되도록 함.
  - **타임테이블 블록에 과제 이름 라벨 추가**: 07-23에 만든 시:분 격자 타임테이블은 같은 과목
    기록을 테두리로만 구분했는데, 사용자가 칸 안에 과제 이름 자체를 적어달라고 요청 — 블록
    폭이 6% 이상(너무 좁은 조각이 아닐 때)이면 `<span class="timeblock-block-label">`로
    과제 이름을 얹음(`pointer-events:none`이라 클릭은 그대로 부모 블록의 토스트로 감).
  - **과목 색상 팔레트를 사용자가 준 "마일드 라이너" 형광펜 파스텔 10색으로 교체**
    (`SUBJECT_COLORS`, `#cee4f5` 등). 기존엔 진한 원색 팔레트였음 — 타임테이블 블록 라벨
    텍스트를 검정으로 고정했는데 이 파스텔 배경과 대비가 잘 맞음. 이 색상은 과목 점(dot)/
    파이차트/막대그래프 등에서만 쓰이고 흰 글자를 얹는 배지 패턴은 없어서(전부 점+별도 텍스트
    구조) 대비 문제 없이 안전하게 교체됨.
- 2026-07-23 (2차): 사용자 제보 3건(학습 플래너 기기 간 동기화 깨짐, 타임블록에서 기록 구분이
  안 됨, 공부 시간 수정 모달의 저장 버튼이 안 보임) 조사 후 수정. `sw.js`의 `SW_BUILD`도
  `2026-07-23-2`로 올림.
  - **기기 간(폰/PC/패드) 타이머 동기화가 Socket.IO 실시간 이벤트에만 의존하던 문제**.
    한 기기가 백그라운드로 밀리거나 소켓이 일시적으로 끊기면 그 사이의 `timer-sync` 이벤트를
    영영 놓치는데, 그 상태에서 계속 흐른(stale) 로컬 시간을 나중에 정지/일시정지/재개 시점에
    그대로 DB에 써버려서 다른 기기가 이미 끝낸 세션 행의 `duration_seconds`를 부풀려
    덮어쓰는 버그였음(제보: PC에서 기록1을 1시간에 멈추고 기록2를 시작했는데, 패드는 이걸
    못 받아 기록1이 계속 흘러 결국 2시간으로 기록됨). 두 겹으로 방어함:
    1) `pauseCurrentTimer`/`resumeCurrentTimer`/`stopCurrentTimer`의 모든 `study_sessions`
       update에 `.is('ended_at',null)` 조건을 추가해서 "내가 알던 세션이 여전히 열려있을
       때만" 쓰게 하고, 이미 다른 기기가 끝내놨다면(0행 반영) stale 값으로 덮어쓰지 않고
       대신 서버 진실로 로컬을 다시 맞춤(`applyServerTimerTruth()` 신설,
       `resumeActiveTimerIfAny()`의 "DB의 열린 세션을 기준으로 이어받기" 로직을 부팅
       시점이 아닌 언제든 호출 가능하게 뺀 버전).
    2) 소켓 재연결 시(`studySocket.on('connect', ...)`), 탭/앱이 다시 화면에 보일 때
       (`visibilitychange`), 그리고 60초마다 주기적으로 `applyServerTimerTruth()`를 호출해서
       놓친 이벤트가 있어도 스스로 교정되도록 안전망을 추가함.
  - **공부 시간 수정 모달(`#edit-record-modal`)의 저장 버튼이 항상 안 보이던 버그**.
    `saveRecordRow`/`deleteRecordRow` 버튼이 `.task-edit-btn`/`.task-del-btn` 클래스를
    재사용했는데, 이 클래스들은 `opacity:0`이고 `.task-row:hover`일 때만 보이도록 CSS가
    짜여 있었음 — 모달의 행은 `.task-row`가 아니라 `.erm-row`라 이 hover 규칙이 전혀 안
    걸려서 버튼이 늘 투명 상태였음(터치 기기는 hover 자체가 없어 더더욱 못 누름). 버튼은
    DOM에 있고 동작도 정상이었던 것이라, `.erm-row .task-edit-btn,.erm-row .task-del-btn`에
    `opacity:1`을 강제하는 CSS 한 줄로 해결.
  - **타임블록을 사용자가 준 화이트보드 참고 사진 스타일의 격자 "타임테이블"로 재설계**.
    기존엔 시간축 하나에 세션을 절대좌표로 얹는 연속 캔버스였는데, 세로=시(7:00, 8:00...),
    가로=분(10~60)인 실제 격자로 바꿈 — 시간당 한 행이고, 그 행 안에서 세션이 시작/종료
    "분"에 비례하는 가로 위치·너비로 배치됨(1시간 넘는 세션은 시 경계마다 조각으로 나눠
    이어 그림, `renderTimeblock()`). 세로 10분 단위 눈금선도 추가(`repeating-linear-gradient`
    to right). 같은 과목(같은 색)이라도 서로 다른 기록 구간을 구분할 수 있도록 모든 블록에
    캔버스 배경색과 같은 2px 테두리(`border:2px solid var(--canvas)`)를 둬서 붙어있는
    블록끼리도 시각적으로 갈라져 보이게 함. 보기 전환 버튼 라벨도 "타임블록"→"타임테이블"로
    통일(내부 CSS 클래스/id는 `timeblock-*` 그대로 유지 — 이름 자체는 기능에 영향 없음).
- 2026-07-23: DM 사진 로드 시 채팅창이 위로 밀리는 문제 재수정(`index.html`
  `hydrateDmPhotoUrls`). 전날(07-22) `img.onload`로 스크롤을 재보정하는 수정을 했는데도
  재현됐음 — 원인은 브라우저가 이미지 박스 크기를 `load` 이벤트(다운로드 완료)가 아니라
  헤더 파싱 직후(다운로드 도중)에 이미 실제 크기로 키우기 때문에, onload 기준 보정이 한
  박자 늦었던 것. `ResizeObserver`로 이미지 박스의 실제 크기 변화를 감지해서 그때마다
  맨 아래로 재보정하도록 교체. `sw.js`의 `SW_BUILD`도 `2026-07-23-1`로 올림.
- 2026-07-22 (3차): 알림센터(종모양 드롭다운) 신설 + 학습 플래너 타임블록을 연속 캔버스 방식
  타임테이블로 교체 + 공지 아이콘을 사이렌으로 변경 + 캠스터디 참여 알림 추가 + 알림 미설정자
  강제 유도 팝업. 프론트(`index.html`) + 백엔드(`bugwang-server/server.js`) + Supabase
  마이그레이션 함께 적용, `sw.js`의 `SW_BUILD`도 올림.
  - **`notifications` 테이블 신설(알림센터용 영구 로그)**. 기존 웹 푸시는 그 순간 구독 중인
    기기에만 잠깐 뜨고 사라져서 나중에 다시 훑어볼 방법이 없었음 — 이 테이블은 앱 안에
    계속 남는 알림 목록을 위한 것. `dm_messages`와 동일한 컨벤션으로
    `recipient_student_id`(백엔드가 이미 하던 student_id 기반 수신자 계산과 맞춤)와
    `recipient_user_id`(RLS `auth.uid()`용)를 함께 둠. RLS는 본인 것만 조회/수정(읽음 처리)/
    삭제 가능(개인화된 내용이 섞여 있어 `teacher_messages`/`dm_messages`처럼 진짜로 제한) —
    INSERT 정책은 만들지 않아서 프론트에서는 절대 못 쓰고, `bugwang-server`가 서비스 롤로만
    기록할 수 있음(이 프로젝트의 "제목/본문을 클라이언트가 보낸 문자열로 안 믿고 서버가
    직접 만든다"는 기존 보안 원칙과 동일선상).
  - **백엔드에 `insertNotifications()` 헬퍼 신설**, 기존 5개 `/api/notify/*`
    엔드포인트(notice/comment/poll-vote/teacher-message/dm-message)가 각자 이미 계산해둔
    수신자 `studentIds`를 그대로 재사용해서 `sendPushNotification()`과 나란히 호출 — 푸시를
    구독 안 한 학생도 인앱 알림센터에는 남도록, `studentIds`가 null(공지 "전체 공지")이면
    `user_roles` 전체 명단으로 폴백. 각 이벤트에 `link`(프론트 `navigate()`가 받는 페이지
    id)를 같이 저장해서 알림을 누르면 관련 페이지로 이동(공지→`notice`, 댓글→글
    카테고리에 따라 `free-board`/`qna-board`/`bug-report`, 투표참여→`notice`, 선생님메시지→
    `mypage`, DM→`dm`).
  - **캠스터디 참여 알림 신설**(`POST /api/notify/camstudy-join`, `requireAuth`만, 별도
    파라미터 없이 토큰의 주인을 그대로 참여자로 사용). 캠스터디에 입장(`joinStudy()`
    성공 시)하면 본인을 제외한 학급 전체(`user_roles` 전체 명단)에게 "{이름}님이
    캠스터디에 참여하고 있어요" 푸시 + 알림센터 기록(`link:'camstudy'`)이 감. **주의**:
    학급 전원에게 매번 방송되는 구조라 캠스터디 입장이 잦아지면 알림이 많이 쌓일 수 있음 —
    필요해지면 쿨다운/스로틀링을 추가로 요청할 것(이번 요청 범위엔 없었음).
  - **알림센터 프론트 UI**. 사이드바 헤더(데스크톱)와 모바일 상단바 양쪽에 종모양 버튼을
    추가(`.notif-bell-btn`, "공지사항" 사이드바 아이콘과 동일한 벨 SVG 재사용) — 안 읽은
    개수 뱃지(`.notif-badge`, 두 버튼이 클래스를 공유하므로 `querySelectorAll`로 동시 갱신).
    드롭다운 패널은 DM 메시지 컨텍스트 메뉴와 동일한 패턴으로 전역에 하나만 두고
    클릭된 버튼 기준으로 위치만 옮김(`positionNotifDropdown`). 알림 항목을 누르면 읽음
    처리 후 `link`로 `navigate()`, "모두 읽음"/"전체 삭제"(확인창) 버튼 제공. 로그인
    시(`loadNotifCount()`) + 30초 폴링으로 뱃지 갱신(드롭다운이 열려 있는 동안은 건너뜀).
    로그아웃 시 알림 상태를 지워서 공용 기기에서 다음 사람이 이어보지 못하게 함(이
    저장소의 기존 컨벤션과 동일).
  - **알림 미설정자에게 강제 유도 팝업**. 로그인할 때마다(`initApp()` 끝)
    `maybeShowForcePushModal()`이 iOS 홈 화면 미추가(`isIosNonStandalone()`, 이 경우는
    첫 실행 안내에서 이미 "홈 화면에 추가" 안내가 나가므로 건너뜀)나 브라우저 자체 차단
    (`Notification.permission==='denied'`, "지금 켜기"로는 못 풀어서 반복 안 띄움)이
    아니면서 아직 구독이 없는 사용자에게 "지금 켜기"/"나중에" 팝업을 띄움. "나중에"를
    눌러도 다음 로그인 때 다시 뜸(요청한 "강제로"에 맞춰 완전히 끄는 옵션은 의도적으로
    안 둠 — 실제로 알림을 켜야만 다시 안 뜸).
  - **학습 플래너 "타임블록"을 연속 캔버스 방식 "타임테이블"로 교체**. 예전엔 6시~23시를
    시간당 행(each 48px)으로 나누고 그 안에 세션을 절대배치했는데, 1시간 넘는 세션이 행
    경계에서 겹치거나 다음 행의 다른 세션에 가려질 수 있는 구조적 문제가 있었음(`overflow`가
    안 잘리는 것에 우연히 기대는 방식). 6시~23시 전체를 하나의 캔버스(`#timeblock-canvas`)로
    두고 세션을 `top`/`height`(px-per-hour) 절대좌표로 배치하도록 다시 짬 — 여러 시간에
    걸친 공부도 하나로 이어진 색 블록으로 자연스럽게 표시됨. 사용자가 준 참고 이미지처럼
    블록 안에 텍스트 라벨을 넣지 않고 색만 표시(클릭하면 과목/할일/시간 범위를 토스트로
    보여주고, `title` 속성으로 PC에서는 마우스오버 툴팁도 뜸). 시간 눈금은 24시간 대신
    참고 이미지처럼 12시간제 숫자만 표시(`6,7,...,12,1,...,11`).
  - **공지 아이콘을 클립보드(📋)에서 사이렌(🚨)으로 변경**(공지 목록 각 항목의 아이콘).
- 2026-07-22 (2차): 관리자/운영자/선생님이 모든 게시글·댓글·공지를 실제로 삭제/수정할 수 있도록
  권한 보강 + 게시글/댓글/공지 수정 기능 신설 + DM 메시지 삭제/수정을 꾹 누르기(모바일)·
  우클릭(PC) 컨텍스트 메뉴로 전환. `sw.js`의 `SW_BUILD`도 같이 올림.
  - **DB 차원의 진짜 버그를 발견함**: 프론트의 `isBoardModerator()`는 `admin`/`owner`만 보고
    `is_teacher`가 빠져 있어서 선생님 계정은 애초에 삭제 버튼 자체가 안 보였고, 설사 버튼이
    보이는 관리자/운영자라 해도 `posts`/`comments`의 실제 RLS DELETE 정책이 `auth.uid() =
    user_id`(작성자 본인만)로 걸려있어서 — 관리자가 남의 글을 삭제해도 RLS에 막혀 매칭되는
    행이 0개라 에러 없이 "삭제되었습니다" 토스트만 뜨고 실제로는 아무것도 안 지워지는 상태였음
    (Postgres RLS의 잘 알려진 함정: RLS로 막힌 delete/update는 보통 에러가 아니라 조용히 0행
    반영으로 끝남). UI만 고쳐서는 해결이 안 되는 문제라 Supabase 마이그레이션을 같이 적용함.
  - **`is_staff(uuid)` SECURITY DEFINER 함수 신설**(`user_roles`+`user_profiles`를 조인해
    `role in (admin,owner) or is_teacher` 판단, `teacher_messages` RLS에서 쓰던 것과 동일한
    조건을 재사용 가능한 함수로 뺌). `is_dm_participant`/`is_dm_room_creator`와 동일하게
    `public`/`anon` 양쪽 다 EXECUTE 회수하고 `authenticated`에만 부여.
  - **`posts`/`comments` RLS 정책 변경**: DELETE 정책(`본인만 삭제`)을 `auth.uid()=user_id or
    is_staff(auth.uid())`로 넓히고, 원래 아예 없던 UPDATE 정책을 새로 추가(`본인 또는
    스태프만 수정`, 마찬가지로 작성자 본인 또는 스태프). 이제 관리자/운영자/선생님이 실제로
    남의 글·댓글을 삭제·수정할 수 있음.
  - **`dm_messages`에 UPDATE 정책 신설**(`본인 메시지만 수정`, `sender_user_id=auth.uid()`만
    허용). DM은 참가자 간 사적인 대화라 이번엔 스태프 열람/수정 권한을 주지 않음 — 삭제와
    동일하게 본인 메시지만.
  - **`isBoardModerator()`를 `isStaffRole()`과 동일 기준으로 통일**(더 이상 `currentRole` 직접
    비교 안 함) — 이제 프론트 판단과 DB RLS 판단이 정확히 일치함.
  - **게시글/댓글 인라인 수정 UI 신설**. "수정" 버튼(작성자 본인 또는 스태프에게만 노출)을
    누르면 본문이 `<textarea>`로 바뀌고 저장/취소 버튼이 뜨는 방식(`startEditPost`/
    `saveEditPost`/`cancelEditPost`, 댓글은 `startEditComment`류로 동일 패턴). 취소는 원본
    텍스트를 `textContent`로 미리 담아뒀다가 그대로 복원(재조회 없음), 저장은
    `boardLoader(type)()`로 목록 전체를 다시 불러옴 — 이 부분은 기존 `deletePost`/
    `deleteComment`와 동일한 트레이드오프(저장/삭제 시 게시판 전체가 다시 그려지면서 펼쳐둔
    댓글창이 다시 접힘)라 이번에 새로 생긴 문제는 아님.
  - **게시글/댓글에 있던 저장형 XSS 이스케이프 누락을 같이 고침**. `renderPost()`가 `p.content`/
    `c.content`(둘 다 학생이면 누구나 쓸 수 있는 값)를 `escHtml()` 없이 그대로 `innerHTML`에
    꽂고 있었음 — `<img onerror=...>` 같은 걸 글/댓글에 쓰면 보는 사람 전원(운영자 포함)의
    브라우저에서 그대로 실행되는 저장형 XSS였음. 이번에 수정 기능을 만들며 이 코드를 다시
    손대는 김에 `escHtml()`을 씌움(신규 댓글을 DOM에 바로 추가하는 `submitComment()`의
    경로도 동일하게 처리). `notices.content`도 같은 문제가 있어서(공지는 스태프만 쓸 수 있어
    학생 게시글보다는 위험도가 낮지만) 같이 이스케이프함. 이스케이프해도 줄바꿈이 깨지지
    않도록 `.qna-content`/`.comment-text`에 `white-space:pre-wrap`을 추가(`.notice-content`는
    원래부터 있었음 — 애초에 순수 텍스트를 전제로 설계된 CSS였다는 뜻이라, 그동안의 raw HTML
    삽입이 의도가 아니라 누락이었다는 정황).
  - **공지 수정 기능 신설**. 기존 "공지 작성" 페이지(`page-notice-write`)를 그대로 재활용 —
    `editNotice(id)`가 해당 공지를 다시 불러와 제목/내용/대상을 채우고 `editingNoticeId`를
    세팅, `submitNotice()`가 이 값이 있으면 insert 대신 update로 분기함. 투표가 달린 공지는
    수정 범위에서 제외(질문/선택지를 바꾸면 이미 쌓인 투표 기록과 안 맞게 되는 문제가 있어서)
    — 수정 화면에서는 "투표 추가" 섹션 자체를 숨김.
  - **DM 메시지 삭제/수정을 꾹 누르기(모바일)/우클릭(PC) 메뉴로 전환**. 예전엔 내 메시지
    아래에 항상 보이는 "· 삭제" 텍스트 링크였는데, 사용자 요청으로 길게 누르면(모바일)/
    우클릭하면(PC) 뜨는 컨텍스트 메뉴(`#dm-msg-menu`, `showDmMsgMenu`)로 바꾸고 "수정"도
    추가함(텍스트가 있는 메시지만 — 사진 전용 메시지는 수정 대상에서 제외). 모바일은
    `touchstart`에서 500ms 타이머로 롱프레스를 직접 판정(`dmTouchStart`/`dmTouchEnd`,
    `touchmove`가 오면 스크롤로 간주해 타이머 취소) — 브라우저 네이티브 `contextmenu`
    롱프레스 감지가 iOS/Android/기종마다 들쭉날쭉해서 못 믿고 직접 구현함. **롱프레스로
    메뉴가 뜬 직후 손가락을 떼면 브라우저가 뒤이어 합성(synthetic) click 이벤트를 쏘는데,
    이걸 막지 않으면 메뉴를 닫는 전역 click 리스너에 뜨자마자 바로 닫혀버림** — 롱프레스가
    실제로 발동했을 때만 `touchend`에서 `preventDefault()`로 이 합성 클릭을 막아서 해결.
    메뉴는 화면 밖으로 안 나가게 위치를 clamp함. 수정(`startEditDmMessage`/
    `saveEditDmMessage`)은 게시글/댓글과 같은 인라인 textarea 방식.
- 2026-07-22: 사용자 제보 4건(모바일/iOS UI 겹침, DM 타이핑 중 화면 튐, 학습 타이머 동시 카운트,
  더블 엔터로 인한 중복 게시) 조사 후 수정. `sw.js`의 `SW_BUILD`도 같이 올림.
  - **모바일에서 모달이 안 보이던 버그(z-index)**. `.modal-overlay`(대부분의 모달이 공유하는
    공통 오버레이)가 `z-index:200`이었는데, 그보다 위에 있는 전체화면 레이어들
    — 모바일 DM 스레드 패널(`z-index:500`), 학습 타이머 전체화면(`#timer-fullscreen`,
    `z-index:300`), 선생님용 학생 상세 전체화면(`#student-detail-fullscreen`,
    `z-index:300`) — 위에서 모달을 열면(예: DM 단톡방 "+ 초대", 전체화면 타이머 중 뜨는
    "아직 공부하고 있나요?" 4시간 확인 모달) 모달이 그 뒤로 완전히 가려져 아무것도
    안 보이는 상태였음(배경 어둡게만 깔리고 내용이 없는 것처럼 보임). `.modal-overlay`를
    `z-index:550`으로 올려서 이 세 레이어보다 항상 위에 오도록 통일. 앞으로 새 전체화면
    오버레이를 추가할 때도 550 미만으로 유지하거나, 그 위에서 모달을 띄울 일이 있으면
    이 값을 참고할 것.
  - **모바일 DM에서 타이핑 중 화면이 위로 끌려 올라가는 버그**. 모바일 DM 스레드
    (`.dm-thread-panel`, `position:fixed`로 전체화면을 덮는 패널)가 열려 있는 동안 뒤쪽
    `body`가 계속 스크롤 가능한 상태로 남아있었음 — iOS Safari에서 메시지 입력창 포커스/
    키보드 열림·닫힘마다 배경이 스크롤되면서 `position:fixed` 패널이 같이 밀리는 것처럼
    보이는 현상의 원인이었음. `openTimerView`/`openStudentDetail`이 이미 쓰던
    `document.body.style.overflow='hidden'` 잠금 패턴을 `openDmThread()`에도 적용(모바일
    폭에서만, `window.innerWidth<=834`). 스레드를 닫는 경로가 여러 곳(`closeDmThreadMobile`,
    `leaveDmRoom`, DM 페이지를 벗어나는 `navigate()`, `doLogout()`)이라 전부 짝을 맞춰
    잠금 해제하도록 같이 손봄 — 특히 `navigate()`는 DM 스레드를 연 채로 사이드바의 다른
    메뉴를 눌러도(모바일에서 실제 발생 가능) 잠금이 안 풀린 채 남는 걸 막기 위해, "우리가
    연 잠금일 때만"(`dm-layout.thread-open` 클래스 존재 여부로 판단) 풀도록 가드를 넣음.
  - **학습 타이머가 두 할 일을 동시에 세는 것처럼 보이던 버그**. 할 일 목록의 재생 버튼이
    호출하는 `openTimerView(si,ti)`에 `if(activeTimer&&...)stopCurrentTimer();` 다음 줄에
    `if(!activeTimer)startTaskTimer(si,ti);`라는 가드가 있었는데, `stopCurrentTimer()`는
    DB 저장이 끝난 뒤에야(비동기로) `activeTimer=null` 처리를 하기 때문에, 바로 다음 줄이
    실행되는 시점엔 `activeTimer`가 아직 이전 값 그대로 남아있어 `!activeTimer`가 거짓이 되고
    — 결과적으로 다른 할 일이 실행 중일 때 새 할 일의 재생 버튼을 눌러도 새 타이머가 아예
    시작되지 않거나(첫 클릭으로는 이전 것만 멈추고, 다시 눌러야 시작), 빠르게 연달아 누르면
    두 할 일의 `study_sessions` 행이 동시에 열린 채로 남는 경합이 있었음. 이 전환 로직을
    `openTimerView`/`tfSwitchTask`(전체화면 안에서 할 일 전환)/`toggleTaskTimer`(현재 미사용,
    정의만 있음) 세 곳에서 각자 비슷하게 구현하고 있던 것도 함께 정리해서, `switchActiveTimer(si,ti)`
    공용 함수 하나로 통합 — 반드시 `await stopCurrentTimer()`로 이전 타이머가 완전히 멈추는
    걸 기다린 뒤에 `await startTaskTimer()`로 새 타이머를 시작하도록 순서를 강제함. 전체화면은
    이 전환을 기다리지 않고 먼저 열어(반응성 유지) UI가 느려 보이지 않게 함.
  - **공부 시간 수정 UI를 "몇 시부터 몇 시까지" 방식으로 전면 교체**. 예전 `editTaskTime()`은
    `prompt()`로 하루 총 "분(分)" 수를 입력받아서, 늘어난 만큼은 가장 최근 `study_sessions`
    행에 더하고 줄어든 만큼은 최근 행부터 깎아나가는 방식이었음 — 여러 구간이 있을 때 정확히
    어느 구간이 왜 바뀌는지 사용자가 알 수 없고, 분 단위 암산도 오류가 잦다는 제보가 있었음.
    새 모달(`#edit-record-modal`, `openEditRecordModal(si,ti)`)이 그 날의 `study_sessions`
    행을 구간별로 나열하고 각 행의 시작/종료 시각을 네이티브 `<input type="time">` 두 개로
    직접 입력·저장(`saveRecordRow`)·삭제(`deleteRecordRow`, `confirm` 확인)할 수 있게 했고,
    "+ 구간 직접 추가"로 수동 구간(`study_sessions` 신규 insert)도 넣을 수 있음. 외부 라이브러리
    (예: flatpickr류 시간 선택 UI)는 검토했지만, 이미 CDN 스크립트를 쓰는 프로젝트이긴 해도
    `<input type="time">`이 모바일에서 기기 자체의 네이티브 피커를 띄워주고 추가 의존성/CSP
    리스크가 없어 이 앱 규모엔 더 적합하다고 판단해 그쪽으로 감. 진행 중(미종료)인 세션은
    목록에서 제외(`s.ended_at` 있는 행만) — 실행 중인 타이머는 먼저 멈추고 수정하도록 유도.
  - **플래너 할 일(계획) 삭제 시 확인 문구 추가**. `deleteTask(si,ti)`에 확인 문구 자체가
    없어서 실수로 삭제 버튼(×)을 눌러도 바로 지워졌음 — 다른 삭제 액션들(공지, DM 메시지,
    게시글 등)과 동일하게 `confirm()`을 추가.
  - **더블 엔터/렉으로 인한 중복 게시 방지**. 텍스트 입력 후 엔터로 전송하는 곳들
    (`addTask`/플래너 할 일 추가, `submitComment`/게시판 댓글, `sendDmMessage`/DM,
    `sendMyReplyToTeacher`·`sendTeacherMessageToStudent`/선생님 메시지)은 공통적으로
    "DB 응답이 온 뒤에야 입력창을 비우는" 구조라, 렉이 걸린 상태에서 엔터를 두 번 누르면
    같은 내용이 입력창에 그대로 남아있어 두 번째 호출도 똑같은 내용으로 다시 전송되는
    문제가 있었음 — DB 요청을 보내기 *전에* 입력창부터 먼저 비우도록 순서를 바꿔서, 겹쳐
    불린 두 번째 호출은 빈 값으로 조기 반환되게 함(실패 시엔 입력값을 다시 채워 넣어 사용자가
    잃지 않게 함). `sendDmMessage`는 버튼 클릭 두 번은 이미 `sendBtn.disabled`로 막고
    있었지만 엔터 키 경로는 그 disabled 상태를 확인하지 않아 여전히 뚫려있었던 것도 같이 막음.
    버튼 클릭형인 `submitNotice`(공지 작성)는 게시판 글쓰기(`submitPost`)가 이미 쓰던
    "제출 버튼을 요청 시작 시 `disabled` 처리했다가 끝나면 푸는" 패턴이 통일돼 있지 않았던
    것을 발견해 동일하게 맞춤.
- 2026-07-17: 학습 플래너 타이머를 클라이언트 카운트 방식에서 서버 타임스탬프 재계산 방식으로
  전면 교체 + 같은 학생의 폰/PC 실시간 동기화(Socket.IO) 추가.
  - **Supabase 마이그레이션**: `study_sessions`에 `start_timestamp`(bigint, epoch ms, 실행
    중일 때만 값 있음)와 `accumulated_seconds`(int, default 0)를 추가. 화면에 보이는 경과
    시간은 이제 항상 `computeElapsedSeconds(startTimestamp, accumulatedSeconds)`로 그때그때
    다시 계산함 — `accumulated_seconds + (Date.now()-start_timestamp)`, `start_timestamp`가
    없거나 숫자로 안 바뀌면 그 구간 기여분은 0으로 처리(NaN 가드). 기존엔 클라이언트가
    `setInterval`로 `Date.now()-startedAt`을 계속 다시 계산하고는 있었지만 일시정지 상태를
    서버에 전혀 저장하지 않아서, 일시정지→재개 시 `activeTimer.elapsed`가 `undefined`인 채로
    더해져 `NaN`이 되는 실제 버그가 있었음 — 이번에 같이 고침.
  - **일시정지/재개가 서버에 저장되도록 변경**. 예전엔 전체화면 타이머의 일시정지가 순수
    클라이언트 로컬 상태였음(새로고침하면 날아감). 이제 일시정지 시 `study_sessions` 행에
    `accumulated_seconds`를 확정하고 `start_timestamp=null`로, 재개 시 새
    `start_timestamp`를 찍어서 저장(`pauseCurrentTimer`/`resumeCurrentTimer`).
  - **다른 기기(폰/PC) 실시간 동기화**. `bugwang-server/server.js`의 Socket.IO 연결 시 학생을
    본인 소유 개인 룸(`user:<studentId>`)에 자동 join시키고, `timer-sync` 이벤트를 그 룸으로만
    릴레이(매초가 아니라 시작/일시정지/재개/정지 시점에만 emit). 프론트는 로그인 즉시(캠스터디
    입장과 무관하게) 이 소켓에 연결하도록 `initApp`에서 `connectStudySocket()`을 호출하게
    바꿈 — 원래 캠스터디 채팅 전용이던 소켓을 재사용.
  - **DB 기반 다중 기기 이어받기로 교체**. `resumeActiveTimerIfAny()`가 예전엔 `localStorage`
    (기기별)만 보고 이어받았는데, 그러면 폰에서 시작한 타이머를 PC에서 처음 열었을 때
    `closeOrphanSessions()`가 그걸 "고아 세션"으로 오인해 0초로 마감시켜버리는 문제가 있었음
    (이번 기능 자체를 무력화하는 버그라 같이 고침). 이제 항상 DB에서 `ended_at IS NULL`인
    오늘자 세션을 조회해서 이어받고, `localStorage` 기반 활성 타이머 저장(`ACTIVE_TIMER_KEY`
    등)은 완전히 제거함.
  - 적용 범위는 **학습 플래너 과목/할일 타이머만**이고, 타이머 페이지의 자유 스톱워치
    (`swState`)나 쪽잠/모의고사 알림 카운트다운은 그대로 로컬 전용으로 남아있음(요청 범위 아님).
  - 백엔드 수정은 `bugwang-server/server.js`에만 적용(루트의 `server.js`는 안 쓰는 옛날 사본).
- 2026-07-16: (사용자가 직접 수정, 커밋 `2f89b3f`) 모바일에서 DM 화면 UI가 깨지던 버그 수정.
  `.dm-thread-panel`의 모바일 전체화면 오버레이가 `100vh`를 썼는데, 모바일 브라우저는
  주소창이 나타났다 사라졌다 하면서 실제 보이는 높이가 달라져서 `100vh` 기준으로는 상단
  탑바 밑에 깔리거나 레이아웃이 밀리는 문제가 있었음 — 동적 뷰포트 단위 `100dvh`로 교체하고
  `z-index`도 120→500으로 올려 탑바를 확실히 덮게 함, `dm-thread-log`/`dm-thread-input-row`에
  `!important`로 flex/스크롤/safe-area 패딩을 강제 적용. **`100vh`는 모바일에서 이런 종류의
  버그를 자주 일으키므로, 전체화면 오버레이류를 새로 만들 땐 처음부터 `100dvh`를 쓸 것.**
- 2026-07-16: 게시판 글쓴이 이름을 항상 최신으로 표시하도록 수정 + 좋아요를 "누가 눌렀는지"
  보이는 방식으로 재설계.
  - **이름 변경이 게시판에도 반영되도록 수정**. `posts.author_name`/`comments.author_name`은
    글을 쓴 시점의 스냅샷 텍스트라서, 마이페이지에서 나중에 이름을 바꿔도 예전 글/댓글은
    옛날 이름 그대로 보이는 문제가 있었음 — 렌더링 시점에 항상 `user_profiles`에서 최신
    `display_name`을 찾아 보여주도록 수정(`loadProfileMap()`, DM에서 쓰던
    `loadDmProfileMap()`을 이름을 일반화해서 게시판과 공용으로 씀). 스냅샷 컬럼 자체는
    그대로 둠(탈퇴 등으로 `user_profiles`에 없는 경우의 폴백 + 다른 기능에서 참고할 수
    있어서) — DB 값을 지우거나 매번 갱신하는 대신 "보여줄 때만 최신 걸로 바꿔치기"하는
    가벼운 방식을 택함.
  - **좋아요를 사용자별 테이블로 재설계**. 원래 `posts.like_count` 정수 컬럼 + 증감 RPC로
    막 만들었었는데, "누가 눌렀는지 보이게 해달라"는 요청이 들어와서 애초에 합산 카운터
    방식으로는 답할 수 없는 질문이라 구조를 바꿈 — `post_likes` 테이블(자세한 내용은 위
    "Supabase 스키마" 섹션)로 교체, `like_count` 컬럼/`toggle_post_like()` 함수는 삭제.
    좋아요 수 옆의 "좋아요 N명" 글자를 누르면 이미 불러와 둔 명단으로(추가 쿼리 없이) 이름
    목록 모달을 띄움. 부수 효과로 예전 localStorage 기반 "내가 눌렀는지" 추적(기기 바꾸면
    초기화되던 문제)도 서버 기준으로 정확해짐.
- 2026-07-16: DM(친구 1:1 / 단톡방) 기능 신설 + 마이페이지 이름 변경 기능 추가 + 자유게시판
  좋아요 버튼 동작 안 하던 버그 수정.
  - **DM 기능**. 사이드바 "실시간" 그룹에 새 페이지(`page-dm`) 추가 — 왼쪽 대화 목록 +
    오른쪽 스레드 패널 2단 레이아웃(모바일은 방을 열면 스레드가 전체화면으로 덮는 방식,
    `dm-layout.thread-open` 클래스로 전환). "+ 새 대화"에서 `user_profiles`를 검색해
    상대를 고르는데, 1명 고르면 1:1(이미 있는 방이면 재사용), 2명 이상 고르면 단톡방(이름
    선택 입력 가능)으로 생성됨. 신규 테이블/RLS/스토리지 설계는 위 "Supabase 스키마" 섹션의
    `dm_rooms`/`dm_participants`/`dm_messages`/`dm-photos` 항목 참고 — 특히 참가자만
    보고 쓸 수 있게 진짜 RLS로 막았고(이 프로젝트에 흔한 permissive `true` 패턴이 아님),
    사진은 비공개 버킷+서명URL로 대화 밖에서는 못 보게 함. 실시간 소켓 없이 7초 폴링
    (DM 페이지가 열려 있을 때만) — 새 메시지가 있을 때만 스레드를 다시 그려서(마지막
    메시지 id 비교) 스크롤 위치가 계속 튀는 걸 피함. 단톡방은 "나가기"가 되지만 1:1은
    의도적으로 뺌(나가면 상대는 예전 방을 계속 보게 되는 애매함 때문). 로그아웃/세션
    만료 시 DM 상태(`dmRooms`/`dmActiveRoomId` 등)를 명시적으로 지워서 공용 기기에서
    다음 로그인한 사람이 이전 대화를 이어보지 못하게 함(이 저장소의 기존 컨벤션과 동일).
    이후(같은 날) 아래 두 가지를 추가로 붙임:
    - **푸시 알림 연동**. `bugwang-server`에 `POST /api/notify/dm-message`(requireAuth) 신설
      — 호출자가 실제 그 메시지의 발신자인지(`sender_user_id`) 확인한 뒤, 본인 제외 나머지
      참가자 전원에게 발송. 제목은 1:1이면 보낸 사람 이름, 단톡방이면 "이름 (방이름)".
      `sendDmMessage()`가 메시지 insert 성공 후 `.select().single()`로 id를 받아서
      `triggerNotify('dm-message',{message_id})` 호출(다른 알림들과 동일하게 실패해도
      메시지 전송 자체는 막지 않음). 이번엔 발신 시점에 이미 참가자로 확정된 상태라 위
      "겪은 문제"의 RLS+RETURNING 순환이 없어서 `.select()`를 그대로 붙여도 안전함.
    - **단톡방 멤버 초대 UI 추가**. 스레드 헤더에 "+ 초대" 버튼(단톡방에서만 노출, 나가기
      버튼과 동일 조건) → 이미 참가 중인 사람은 제외한 명단에서 여러 명 골라
      `dm_participants`에 바로 insert. RLS는 "기존 참가자 누구나 초대 가능"으로 이미
      열려 있었으므로 프론트 UI만 새로 만들면 됐음. 강퇴 기능은 아직 없음(필요하면
      "본인이거나 스태프면 다른 참가자 행도 삭제 가능"하도록 DELETE 정책을 넓혀야 함 —
      현재는 `본인만 나가기`만 있어서 그대로는 못 만듦).
  - **마이페이지 "이름 변경" 기능 추가**. 예전엔 최초 로그인 시(`saveName()`)에만 이름을
    정하고 이후엔 바꿀 방법이 없었음(사용 안 하는 계정 설정 모달에 입력칸만 있고
    `saveAccount()` 함수 자체가 없는 죽은 UI였음, 그대로 방치) — 마이페이지에 새 카드를
    추가해 `auth.updateUser()`와 `user_profiles.display_name`을 함께 갱신하도록 함.
  - **좋아요 버튼 버그 수정**. 직전 커밋(`7dbb225`)에서 좋아요 버튼 UI만 추가되고
    `toggleLike()` 함수 자체가 정의돼 있지 않아 눌러도 아무 반응이 없었음. `posts` 테이블에
    `like_count` 컬럼도 없었고 UPDATE RLS 정책도 없어서, 있었더라도 막혔을 상태. 위
    "Supabase 스키마" 섹션 `posts.like_count` 항목 참고.
- 2026-07-16: 처음 앱을 카카오톡 링크로 열었을 때, 먼저 Chrome(크롬)에 추가하고 바탕화면에
  추가해야 한다는 안내 모달을 첫 실행 시 한 번만 보여주도록 추가. 알림 설정도 
  별도로 켜야 한다는 메시지를 함께 안내해, 설치 후 푸시 알림을 받을 수 있도록 유도.
- 2026-07-16: 자유게시판에 좋아요 버튼을 추가하고, 로컬 상태로 토글이 즉시 반영되도록 처리.
  게시글/댓글 삭제는 본인 글 또는 관리자/운영자 권한이 있는 경우에만 가능하도록 프론트
  권한 분기를 보강.
- 2026-07-15: 새 버전 배포 시 새로고침 유도 배너 추가. 서비스 워커(`sw.js`) 업데이트 감지
  메커니즘을 그대로 활용 — `sw.js`의 `SW_BUILD` 상수 값이 바뀌어 배포되면 브라우저가 자동으로
  새 워커를 내려받아 "대기" 상태로 두는데, 그 상태를 `updatefound`/`statechange` 이벤트로
  감지해서 화면 하단에 "🚀 새 버전이 있어요 / 새로고침하기" 배너(`#update-banner`)를 띄움.
  버튼을 누르면 대기 중인 워커에 `postMessage({type:'SKIP_WAITING'})`로 즉시 활성화를
  요청하고, `controllerchange` 이벤트가 오면(새 워커가 컨트롤을 넘겨받은 시점)
  `location.reload()`. 서비스 워커는 이제 푸시 알림뿐 아니라 이 "버전 신호" 용도로도
  쓰이므로, **`index.html`을 배포할 때마다 `sw.js`의 `SW_BUILD` 값을 반드시 같이 올릴 것**
  (안 올리면 이 배너가 영원히 안 뜸 — 위 "파일 구조" 섹션에도 적어둠). 첫 설치(그 브라우저가
  이 서비스 워커를 처음 등록하는 순간)에는 아직 "컨트롤 중인" 워커가 없어서 배너가 안 뜨도록
  분기했음(막 접속한 사람한테 "새로고침하라"고 뜨는 건 의미 없으므로) — `enablePush()`가 SW를
  중복 등록하던 것도 겸사겸사 공용 `swRegistration` 변수 하나를 재사용하도록 정리함(푸시
  구독 여부와 무관하게 로그인 전부터 항상 서비스 워커를 등록해야 이 배너가 모든 사용자에게
  뜨므로, 등록 자체를 `enablePush()` 안에서 페이지 로드 시점의 `initServiceWorker()`로 옮김).
- 2026-07-15: 웹 푸시 알림 + 선생님→학생 메시지 기능 신설 (프론트 `index.html` + 신규
  `sw.js` + 백엔드 `bugwang-server/server.js`, Supabase 마이그레이션 포함).
  - **선생님↔학생 메시지 기능을 이번에 처음 만듦**. `teacher_messages` 테이블은 예전부터
    스키마만 있고 실제로 쓰는 곳이 없던 빈 테이블이었음 — 마이페이지에 "선생님 메시지" 카드
    (학생 본인 스레드 + 답장 입력)를 추가하고, 선생님 탭(학생 현황) 학생 카드에 💬 버튼을
    추가해 모달로 1:1 대화를 주고받을 수 있게 함. `sender_role`('student'|'teacher')로
    누가 보낸 메시지인지 구분해서 말풍선 정렬(교사=왼쪽 회색, 학생=오른쪽 파란색). 안 읽은
    선생님 메시지가 있으면 사이드바 "마이페이지" 항목에 빨간 점 배지가 뜨고, 그 스레드를
    열면 자동으로 읽음 처리됨. 이 테이블은 이전엔 RLS가 꺼져 있었는데(전체 공개), 사적인
    1:1 대화를 실제로 담게 되면서 이번에 RLS를 켬 — 자세한 정책은 위 스키마 섹션 참고.
  - **웹 푸시 알림 기능 추가**. 대상 이벤트 4가지: 새 공지사항, 내 글/댓글에 달린 댓글, 내가
    만든 공지 투표에 새 참여, 선생님 메시지. 사용자에게 미리 확인받은 내용:
    (1) **아이폰(iOS Safari)은 홈 화면에 추가(PWA 설치)해야만 푸시가 동작함**(iOS 16.4+
    한정, 일반 브라우저 탭으로는 아예 안 됨) — 마이페이지 알림 카드가 iOS이면서
    standalone이 아닌 경우 토글 대신 "홈 화면에 추가해주세요" 안내만 보여줌
    (`isIosNonStandalone()`). (2) 진행에 동의받음. 구조:
    - 새 서비스 워커(`sw.js`, 프로젝트 루트) — `push`/`notificationclick` 이벤트만 처리,
      오프라인 캐싱은 안 함(캐시가 낡은 대시보드를 보여주면 오히려 혼란스러움). GitHub
      Pages 프로젝트 페이지 배포(서브패스)라 등록도 `navigator.serviceWorker.register('./sw.js')`
      처럼 항상 상대경로로 해야 스코프가 올바르게 잡힘(절대경로 `/sw.js`는 스코프가 루트로
      잘못 잡혀서 등록 자체가 거부될 수 있음) — 이 저장소의 다른 정적 자산 참조 방식과 동일한
      컨벤션.
    - 새 테이블 `push_subscriptions`(기기별 구독 정보, RLS로 본인 것만). VAPID 키 쌍은
      `web-push` 패키지의 `generateVAPIDKeys()`로 생성해서 공개키는 프론트
      `index.html`의 `VAPID_PUBLIC_KEY` 상수에 박아넣고(공개키는 노출돼도 안전),
      개인키는 Railway `bugwang-server` 서비스 환경변수 `VAPID_PRIVATE_KEY`로 등록해야
      함(코드에 없음 — 아직 Railway에 안 넣었으면 발송 자체가 조용히 비활성 상태로 남음,
      `sendPushNotification()`이 키 없으면 그냥 아무것도 안 하고 리턴).
    - 백엔드에 발송 헬퍼(`sendPushNotification(payload, studentIds)`, 410/404 응답이면
      만료된 구독으로 보고 자동 정리)와 `/api/notify/*` 엔드포인트 4개 신설. **제목/본문을
      클라이언트가 보낸 문자열로 그대로 안 믿고 항상 서버가 id로 원본 행을 다시 조회해서
      직접 만듦** — 그래야 이 엔드포인트를 직접 두드려서 학급 전체에 임의의 문구로 푸시를
      뿌리는 악용을 막을 수 있음. `notice`/`teacher-message`는 스태프만
      호출 가능(`requireStaffAuth` 신설, `requireAdmin`과 달리 진짜 토큰 검증 기반).
      `comment`/`poll-vote`는 로그인만 하면 호출 가능하지만, comment는 호출자가 그
      댓글의 실제 작성자인지, poll-vote는 투표 생성자 본인에게는 안 보내는지 등을 서버가
      다시 확인함.
    - 프론트 4개 지점에 발송 트리거 연결: `submitNotice()`(성공 후), `submitComment()`
      (성공 후), `voteOnPoll()`(성공 후 — 재투표해도 매번 알림 가므로 스팸 소지 있음, 필요시
      "최초 투표만 알림"으로 좁힐 수 있음), `sendTeacherMessageToStudent()`(성공 후).
      전부 `triggerNotify()`로 실패를 조용히 삼켜서, 알림 발송이 실패해도 원래 하려던 글쓰기/
      투표/메시지 자체는 절대 막히지 않게 함.
    - **학교 공용 컴퓨터/태블릿 대비**: 로그아웃할 때(`doLogout()`) 이 기기의 브라우저 푸시
      구독 자체를 해지(`unsubscribePushSilently()`)하도록 함 — 안 그러면 학생 A가 켜둔
      알림을, A가 로그아웃하고 같은 기기로 로그인한 학생 B가(A 앞으로 온 선생님 메시지
      등 사적인 내용까지 포함해서) 계속 받게 되는 정보 유출이 생김.
    - **아직 실제 기기에서 푸시가 도착하는지까지는 검증 못 했음** — 이 환경엔 배포된
      Railway 백엔드에 접근할 수단도, 실제 브라우저/기기도 없어서 코드 리뷰·문법 검사로만
      확인함. 무엇보다 **Railway에 `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` 환경변수를 아직
      안 넣었으면 서버는 정상 동작하되 푸시는 계속 조용히 안 나가는 상태**이니, 이 기능을
      실제로 켜려면 그것부터 확인할 것.
- 2026-07-15: 타이머 탭(쪽잠/모의고사/스톱워치)도 학습 타이머와 같은 방식으로 새로고침해도
  안 끊기게 수정. 시작/일시정지할 때마다 `localStorage`(`bugwang_timer_nap`/
  `bugwang_timer_exam`/`bugwang_stopwatch`)에 재개 정보를 저장해두고, 로그인 직후
  `resumeMiscTimersOnLoad()`가 이어서 복원함 — 카운트다운(쪽잠/모의고사)은 자리를 비운
  사이에 이미 시간이 다 지나버렸으면 그 자리에서 바로 알람을 울리도록 처리. 학습 타이머와
  달리 DB에 남는 기록이 아니고 다른 사람이 봐도 문제없는 정보라 소유자 확인까지는 안 하지만,
  깔끔하게 로그아웃 시엔 지움. `startCountdown`/재개 로직이 겹치는 부분(`beginCountdownUI`)은
  공용 함수로 뺌.
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
