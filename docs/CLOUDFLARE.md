# 우정김 Cloudflare Workers 배포

대상 저장소: `jhonedang2-create/ujk` · Worker 이름: `woojeonggim` · 연결 예정 도메인: `woojeonggim.com`.

이 경로는 GitHub Pages의 `demo`를 옮기는 것이 아니라 **서버 기능이 있는 Next.js 앱**을 OpenNext로 빌드하는 경로입니다. 기존 `seven-kingdom`, GoDaddy DNS, Supabase 운영 데이터는 빌드 과정에서 변경하지 않습니다.

## 1. Cloudflare 생성 화면

| 항목 | 값 |
|---|---|
| Project name | `woojeonggim` |
| Repository | `jhonedang2-create/ujk` |
| Production branch | `main` |
| Root directory | 저장소 최상위, 비워 두기 |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Preview builds | 처음에는 OFF |
| Preview command | 필요한 경우에만 `npm run upload:cloudflare` |

Worker 이름은 `wrangler.jsonc`의 name 및 WORKER_SELF_REFERENCE service와 같아야 합니다. `ujk`로 만들었다면 세 곳을 임의로 섞지 말고 생성 화면 이름을 `woojeonggim`으로 맞추세요. `npx wrangler preview`는 이 프로젝트의 미리보기 명령이 아닙니다.

빌드 환경 Node.js는 22를 사용하세요. 필요할 경우 Build variables에 `NODE_VERSION=22`를 등록합니다. 빌드는 `prisma/.cloudflare/schema.prisma`에 PostgreSQL JS 엔진 클라이언트를 생성한 뒤 Next.js 및 OpenNext를 빌드합니다. 기존 개발 SQLite 스키마와 운영 마이그레이션 파일을 덮어쓰지 않습니다.

**배포 성공은 DB 연결, 로그인, 결제, 도메인 연결이 모두 끝났다는 뜻이 아닙니다.** 먼저 Worker를 만들고 아래 런타임 설정을 완료하세요. DB 설정 전에는 상품 페이지가 정상 동작하지 않을 수 있습니다.

## 2. 우선 필요한 런타임 Secret

Cloudflare의 해당 Worker → Settings → Variables and Secrets에 서버 비밀값을 저장하고 적용하세요. Build variables와 Worker runtime secrets는 구분합니다. DB 비밀번호와 서비스 키를 GitHub, 채팅, NEXT_PUBLIC 변수에 넣지 마세요.

| 이름 | 용도 |
|---|---|
| `DATABASE_URL` | 활성화한 Supabase PostgreSQL 연결 문자열 |
| `AUTH_SECRET` | 기존 인증 Secret 또는 안전하게 생성한 32자 이상 임의 값 |
| `DATABASE_SSL_CA` | 필요할 경우 Supabase가 제공한 서버 CA 인증서 PEM. 인증서 검증을 끄지 않습니다. |

런타임 기본값 `UJK_CLOUDFLARE=true`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_SITE_URL=https://woojeonggim.com`은 wrangler 설정에 있습니다. `AUTH_URL`은 최초 workers.dev 점검 때 비워 두어 현재 요청 주소를 사용합니다. 실제 도메인 연결 후 `AUTH_URL=https://woojeonggim.com`으로 맞추고 카카오·네이버 콜백도 같은 주소로 등록하세요.

임의 Secret 생성 예시(로컬 터미널):

```sh
openssl rand -base64 48
```

기존 Secret이 있는 서비스에서는 새로 생성하여 세션을 무효화하지 말고 기존 운영 값을 이어서 사용합니다.

### Supabase 연결

기존 UJK 프로젝트 ref는 `pgykpxtprvawwerdappq`입니다. 2026-09-29 점검 시 프로젝트 상태가 `INACTIVE`였습니다. Supabase에서 **기존 프로젝트를 Resume/Restore하여 활성화한 뒤** Connect 화면의 PostgreSQL 연결 문자열을 사용하세요. 새 프로젝트를 만들거나 기존 데이터를 초기화할 필요는 없습니다.

Supavisor Transaction pooler 주소(일반적으로 6543 포트)를 런타임 `DATABASE_URL`로 사용하고, 마이그레이션이 별도로 필요한 경우에만 Session pooler/직접 연결 주소를 `DIRECT_URL`로 사용합니다. 지역·사용자명·호스트명은 Connect 화면의 실제 값으로 확인해야 하며 예시를 그대로 붙여 넣으면 안 됩니다. 비밀번호의 특수문자는 URL 인코딩합니다.

이 코드의 pg 드라이버는 운영 DB에 TLS와 서버 인증서 검증을 사용합니다. 자체 서명 인증서 오류가 발생하면 공식 CA를 `DATABASE_SSL_CA`에 등록하세요. `rejectUnauthorized=false`나 `sslmode=disable`로 우회하지 마세요. Workers에서는 요청마다 Prisma/pg 연결을 구분하고 `maxUses=1`로 다른 요청에 소켓이 재사용되지 않도록 합니다.

**Cloudflare 빌드 명령에 `db push`, `migrate reset`, `seed`를 추가하지 마세요.** 기존 운영 DB를 지우거나 관리자 비밀번호를 변경하지 않습니다. 기존 스키마의 실제 상태는 DB 재활성화 후 확인합니다.

## 3. 이미지 영속 저장소

기존 상품 사진(`public/products`, `public/story`)은 빌드된 정적 자산으로 제공됩니다. 새 관리자 업로드와 외부 이미지 가져오기는 Supabase Storage를 사용합니다. Workers의 가상 파일시스템에 저장하지 않습니다.

기존 UJK 프로젝트의 Storage에 **`ujk-images` 비공개(private) 버킷**을 준비하세요. 허용 형식은 JPEG, PNG, WEBP, GIF이고 개별 파일 제한은 5MB입니다. 공개 업로드 정책이나 anon 쓰기 권한을 추가할 필요가 없습니다.

Worker runtime Secret에 `SUPABASE_SERVICE_ROLE_KEY`를 등록합니다. 이 값은 서버 전용 legacy service_role JWT 키입니다. publishable/anon 키와 다릅니다. 저장소 코드가 사용하는 Bearer 인증 방식에 맞는 키를 사용하세요. 실제 키를 브라우저 코드나 공개 저장소에 넣지 마세요.

기본 설정은 다음과 같습니다.

```text
UPLOAD_STORAGE=supabase
SUPABASE_URL=https://pgykpxtprvawwerdappq.supabase.co
SUPABASE_STORAGE_BUCKET=ujk-images
```

저장한 상품 이미지 URL은 `/uploads/<UUID>.jpg` 등입니다. 서버가 버킷을 인증해 읽고 같은 도메인에서 전달하므로 키가 URL이나 응답에 노출되지 않습니다. 이 경로는 공개 상품 이미지용입니다. 신분증, 주문 개인정보, 고객 첨부 문서는 이 버킷에 넣지 마세요.

저장소를 설정하지 않으면 관리자 업로드는 명시적으로 503을 반환합니다. 설정을 숨기고 임시 디스크에 저장한 척하지 않습니다. 업로드 권한은 기존 products 권한 검사를 유지합니다. 파일당 5MB, 직접 업로드 요청 전체는 25MB로 제한합니다.

## 4. 카카오·네이버·관리자

소셜 로그인에는 기존 `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`, `AUTH_NAVER_ID`, `AUTH_NAVER_SECRET`을 Worker runtime secrets에 넣습니다. 실제 도메인용 Callback URL은 다음과 같습니다.

```text
https://woojeonggim.com/api/auth/callback/kakao
https://woojeonggim.com/api/auth/callback/naver
```

관리자 전용 로그인은 **`/staff/sign-in`**, 관리자 화면은 `/admin`입니다. GitHub Pages의 저장소 경로 `/ujk`는 실제 운영 도메인의 경로 앞에 붙이지 않습니다. 기존 DB의 관리자 계정을 이용하세요. 테스트 workflow가 만드는 관리자 계정은 폐기되는 CI DB에만 있으며 운영 로그인용 계정이 아닙니다.

공개용 결제 키처럼 `NEXT_PUBLIC_*` 값이 바뀌는 경우 빌드 변수도 바꾸고 다시 빌드해야 합니다. 서버용 결제·메시지·암호화 키는 runtime Secret으로만 관리하세요. 기존 `CHANNEL_CREDENTIAL_KEY`를 임의 교체하면 저장된 채널 인증정보를 해독하지 못할 수 있습니다.

## 5. 점검 순서

```text
/api/health          Worker 응답 확인 (200)
/api/ready           PostgreSQL SELECT 1 및 AUTH_SECRET 확인 (정상 200, 미설정 503)
/                    홈페이지와 상품 이미지
/products            상품 목록 및 상세 진입
/staff/sign-in       기존 관리자 계정 로그인
/admin               비로그인 차단, 로그인 후 권한 확인
/api/admin/upload    권한 없는 요청 403, 실제 관리자 이미지 저장·새로고침 확인
```

`/api/ready` 200은 결제·OAuth·이미지 버킷까지 검사한 결과가 아닙니다. 카카오/네이버 실제 계정 로그인, 주문·재고·취소, PG 테스트결제, 상담, 이미지 업로드 후 재접속 검수는 실제 계정 설정 후 추가로 수행해야 합니다.

GitHub Actions의 Cloudflare CI는 별도 PostgreSQL 컨테이너를 만들고 타입/빌드, Wrangler dry-run, 로컬 workerd의 SSR·인증·권한·병렬 요청을 검사합니다. 운영 Supabase와 Cloudflare 계정에 배포하거나 GoDaddy DNS를 변경하지 않습니다. `scripts/smoke-cloudflare.mjs`는 실수로 운영 DB를 지정할 수 없도록 localhost DB만 허용합니다.

실서비스 트래픽 및 CPU 한도는 Cloudflare 계정 플랜에 따라 다릅니다. 특히 bcrypt 관리자 로그인과 Next.js SSR은 Free의 요청당 CPU 한도에 걸릴 수 있으므로 공개 운영 전에 계정의 CPU 사용량과 요금제를 확인해야 합니다. 코드 변경만으로 유료 플랜을 구독하지 않습니다.

## 6. 도메인 연결은 마지막에

Worker 임시 주소에서 실제 DB·기능을 먼저 확인합니다. 이어서 Cloudflare에 `woojeonggim.com`을 추가하고 기존 DNS 레코드(특히 이메일 MX/TXT)를 확인한 다음 GoDaddy 네임서버를 Cloudflare에서 발급한 실제 값으로 변경합니다. Worker의 Settings → Domains & Routes에 Custom Domain을 등록하고 TLS 발급/접속을 확인합니다. 네임서버 값이나 서버 IP를 예시로 임의 작성하지 마세요.

루트 도메인을 대표 주소로 사용하고 www를 사용할 경우 별도 연결/리다이렉트를 설정합니다. 이 저장소의 커밋 자체로 DNS나 결제·OAuth 심사가 완료되는 것은 아닙니다.

## 공식 참고 자료

- Cloudflare OpenNext: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- OpenNext 설정 및 CLI: https://opennext.js.org/cloudflare/get-started · https://opennext.js.org/cloudflare/cli
- OpenNext DB 연결: https://opennext.js.org/cloudflare/howtos/db
- Supabase Storage 접근 제어: https://supabase.com/docs/guides/storage/security/access-control
- Cloudflare 플랫폼 한도: https://developers.cloudflare.com/workers/platform/limits/
