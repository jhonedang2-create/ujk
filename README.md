# (주)대천우정김 공식 홈페이지·쇼핑몰

보령의 김 제조·판매업체 `(주)대천우정김`을 위한 통합 웹 애플리케이션입니다. 고객용 홈페이지와 상품 주문, 결제, 마이페이지, 다채널 주문, 직원 권한형 관리자 화면을 포함합니다.

## 데모 보기

- GitHub Pages 정적 데모: <https://jhonedang2-create.github.io/ujk/>
- 데모는 디자인·상품 상세·장바구니 동작 확인용이며 실제 주문, 결제, 로그인, 관리자, DB는 연결되지 않습니다.
- 실제 운영용 Next.js 앱은 PostgreSQL과 서버 런타임이 있는 호스팅에 별도로 배포해야 합니다.

## 기술 구성

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- Auth.js v5 + Prisma Adapter, 네이버·카카오·이메일 인증
- 개발 DB: SQLite (`prisma/schema.prisma`)
- 운영 DB: PostgreSQL (`prisma/postgresql/schema.prisma` + 기준 마이그레이션)
- 결제: 무통장입금, 토스페이먼츠, 포트원

## 로컬 실행

```bash
npm ci
cp .env.example .env
# .env의 AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD를 반드시 설정
npm run setup
npm run dev
```

기본 관리자 계정이나 기본 비밀번호는 없습니다. 시드는 12자 이상이며 영문 대·소문자, 숫자, 특수문자를 포함하는 `ADMIN_PASSWORD`가 없으면 중단됩니다.

## 실제 등록 제품

초기 시드는 공식 우체국쇼핑 판매자 페이지에서 확인한 다음 제품과 제품 사진을 등록합니다.

- 조미구이재래김 5매×20봉
- 조미구이재래도시락김 9절 9매×24봉
- 조미구이재래김 5매×6봉
- 조미구이재래김 5매×10봉×4박스

가격·포장·표시사항은 판매 시점에 변경될 수 있습니다. 운영자는 판매 전 실물 포장과 공식 판매처를 다시 대조해야 합니다. `public/products/`의 사진은 대천우정김 우체국쇼핑 상품 이미지에서 확보한 브랜드 제품 자료입니다.

## SEO 구현

- `robots.txt`, 동적 `sitemap.xml`, canonical URL
- 회사·웹사이트·상품·Breadcrumb·FAQ JSON-LD
- 상품별 title/description/Open Graph/Twitter 메타데이터
- `/daecheon-gim`에 대천김·우정김·대천우정김·광천김 검색 의도를 설명하는 안내 콘텐츠
- 제품 상세의 고유 설명, 이미지 대체텍스트, 공식 사업자 정보

검색 순위는 기술 설정만으로 보장되지 않습니다. 실제 HTTPS 도메인, Google Search Console, 네이버 서치어드바이저 등록과 지속적인 콘텐츠·평판 관리가 필요합니다.

## 보안·상용화 핵심

- 주문완료 화면은 추측 가능한 주문번호 대신 임의 공개 토큰 사용
- 결제 콜백/웹훅의 금액·주문번호·수단 재검증과 멱등 처리
- 주문 생성 시 원자적 재고 예약, 취소 시 재고·판매량·적립금 일괄 복원
- 장바구니 소유권 검증, 관리자 RBAC, 저장형 HTML 정화
- API 키는 SHA-256 해시만 보관하고 발급 직후 한 번만 표시
- 판매채널 인증정보 AES-256-GCM 암호화
- 업로드 형식·크기·매직바이트 검사, URL 가져오기 도메인 제한
- CSP/HSTS/보안 헤더, 기본 관리자 비밀번호 제거, 요청 빈도 기본 제한
- GitHub Actions에서 타입검사·프로덕션 빌드·의존성 감사를 수행

## 운영 배포

상세 절차는 [docs/PRODUCTION.md](docs/PRODUCTION.md)를 따르세요. 핵심 명령은 다음과 같습니다.

```bash
npm ci
npm run db:deploy:postgres
npm run db:seed:postgres   # 최초 1회
npm run build:postgres
npm start
```

운영에는 PostgreSQL, HTTPS, 영속 객체 스토리지, 외부 Redis/WAF 기반 속도 제한, 백업·모니터링이 필요합니다. 현재 로컬 업로드 폴더는 Vercel 등 읽기 전용/휘발성 파일시스템에서 영속 저장소로 교체해야 합니다.

## 주요 경로

| 경로 | 기능 |
|---|---|
| `/` | 회사·상품 홈 |
| `/daecheon-gim` | 검색 의도별 대천김 안내 |
| `/products`, `/products/[slug]` | 상품 목록·AI 작성 상세페이지 |
| `/cart`, `/checkout` | 장바구니·주문·결제 |
| `/mypage` | 주문·적립금·회원정보 |
| `/admin` | 주문·상품·회원·콘텐츠·상담·채널 관리자 |
| `/api/v1` | 외부 통합관리 솔루션용 범위 제한 API |

## 자료 기준

- 회사·판매자 정보: 대천우정김 기존 공식 사이트와 우체국쇼핑 판매자 정보
- 제품명·가격·사진: 우체국쇼핑 대천우정김 판매 상품
- 식품 원재료·소비기한·영양정보는 출고 실물 포장 표시사항을 최종 기준으로 사용

법률·개인정보처리방침·식품 표시사항·PG 라이브 심사 내용은 실제 운영 주체와 전문가의 최종 검토가 필요합니다.
