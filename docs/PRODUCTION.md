# 운영 배포 체크리스트

## 1. 인프라

- Node.js 20 이상(권장 22 LTS), HTTPS 도메인, PostgreSQL 15 이상을 준비합니다.
- `DATABASE_URL`은 SSL을 사용하는 최소권한 전용 계정으로 설정합니다.
- 업로드 이미지는 S3·Cloudflare R2·Supabase Storage 같은 영속 객체 스토리지로 옮깁니다. `public/uploads` 로컬 저장은 단일 서버 개발용입니다.
- 일별 자동 백업과 복원 훈련, 오류 추적, 가용성 알림을 설정합니다.

## 2. 필수 환경변수

- `DATABASE_URL`, `AUTH_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`(최초 시드에서만 사용)
- `CHANNEL_CREDENTIAL_KEY`, `CRON_SECRET`
- 실제 계좌정보 또는 토스/포트원 라이브 키
- 네이버·카카오 운영 앱 키와 실제 도메인 콜백 URL

모든 비밀값은 호스팅 서비스의 Secret Manager에 저장하고 `.env`를 커밋하지 않습니다. `CHANNEL_CREDENTIAL_KEY`를 잃거나 변경하면 기존 판매채널 인증정보를 복호화할 수 없습니다.

## 3. 데이터베이스

```bash
npm ci
npm run db:deploy:postgres
npm run db:seed:postgres
```

`prisma/postgresql/migrations`는 신규 운영 DB 기준 마이그레이션입니다. 기존 운영 DB가 있다면 백업 후 별도 마이그레이션 검토가 필요합니다. SQLite 파일을 운영에 사용하지 마세요.

## 4. 빌드와 실행

```bash
npm run typecheck
npm run build:postgres
npm audit --omit=dev --audit-level=high
npm start
```

배포 전 실제 PG 테스트 결제→승인→취소→환불 흐름과 중복 웹훅을 검증합니다. `/api/cron/cancel-pending`에 1시간 주기의 `POST` 작업을 등록하고 `Authorization: Bearer {CRON_SECRET}` 헤더를 넣습니다.

## 5. 검색엔진 등록

- `NEXT_PUBLIC_SITE_URL`을 HTTPS 실도메인으로 설정합니다.
- Google Search Console과 네이버 서치어드바이저에서 사이트 소유권을 확인합니다.
- `https://도메인/sitemap.xml`을 양쪽에 제출하고 색인 상태를 확인합니다.
- 회사명·주소·전화번호 표기를 모든 판매처에서 동일하게 유지합니다.
- 검색 상단 노출은 보장되지 않으며, 고유한 제품 콘텐츠·실구매 리뷰·공식 판매처 링크를 지속적으로 축적해야 합니다.

## 6. 운영 전 확인

- 사업자·통신판매업·대표자·주소·연락처를 실제 서류와 대조
- 상품별 원재료, 알레르기, 내용량, 소비기한, 영양정보를 실물 포장과 대조
- 이용약관·개인정보처리방침·교환반품 문구 법률 검토
- 배송비·도서산간·택배사·입금계좌 계약 내용 확인
- 인증·수출·납품 실적은 증빙이 있을 때만 공개
- 관리자 전원 MFA가 필요한 경우 IdP/접근 프록시에서 강제
- CDN/WAF 또는 Redis 속도 제한을 로그인·문의·채팅·결제 API에 적용
- 결제·주문·관리자 작업 로그 보존기간과 개인정보 파기 정책 확정
