# Cloudflare 기본 명령 자동 대응 — 추가 배포 안내

이 안내는 docs/CLOUDFLARE.md의 수동 빌드 명령 변경 안내를 보완합니다.
이 수정 이후에는 기존 `ujk` Worker 대시보드의 명령을 바꾸지 않아도 됩니다.

```text
Build command: npm run build
Deploy command: npx wrangler deploy
Worker name: ujk
Production branch: main
Root directory: /
```

## 변경 방식

- Cloudflare Workers Builds는 빌드에 `WORKERS_CI=1`을 자동으로 주입합니다.
- `npm run build`는 이제 `scripts/build.mjs`를 거칩니다. Workers Builds에서는 기존에 검수한 `scripts/build-cloudflare.mjs`를 실행하여 PostgreSQL JS client, Next.js, OpenNext 배포 파일을 모두 만듭니다.
- 일반 로컬 개발과 GitHub CI에서는 기존 `prisma generate && next build` 동작을 그대로 유지합니다. `CI=true`만으로 Cloudflare 빌드가 선택되지는 않습니다.
- `.nvmrc`로 Node.js 22를 선택합니다. 별도 NODE_VERSION 변수를 대시보드에 넣을 필요는 없습니다. 대시보드에 명시적인 버전 재정의가 이미 있다면 그 설정도 확인해야 합니다.
- 명시적 `npm run build:cloudflare` 및 `npm run deploy:cloudflare`도 계속 지원합니다.

수정된 main 커밋이 연결 저장소에 push되면 기존 Cloudflare Git 연동이 새 빌드를 시작합니다. 자동 빌드가 꺼져 있는 계정이라면 최신 main을 대상으로 수동 실행이 한 번 필요할 수 있습니다.

## 오류 구분

이전 `Could not find compiled Open Next config`는 일반 Next.js 빌드 결과만 만들어진 상태에서 배포한 오류입니다. 이 수정 이후 새로운 빌드 로그에는 아래 메시지가 표시되어야 합니다.

```text
[ujk] Cloudflare build: generating PostgreSQL client, Next.js and OpenNext output.
OpenNext — Cloudflare build
```

이 변경은 대시보드 값을 API로 수정한 것이 아니라, **현재 저장된 명령에 코드가 대응하도록 변경한 것**입니다. 기존 실패 커밋을 다시 빌드하면 수정이 적용되지 않으므로 최신 main을 사용합니다.

## 검수

Cloudflare CI에서 대시보드와 같은 `WORKERS_CI=1 npm run build` 및 `WORKERS_CI=1 npx wrangler deploy --dry-run`을 실행합니다. 일반 Node.js CI도 그대로 유지합니다. 빌드 분기, 오류 전파, 재귀 실행 방지에 대한 회귀검사와 기존 workerd/테스트 DB/이미지 저장소 검사를 포함합니다.

## 변경하지 않는 항목

DB 내용, 관리자 비밀번호, 결제 설정, 카카오/네이버 키, 런타임 Secret, GoDaddy DNS, Cloudflare 요금제는 변경하지 않습니다. 빌드·배포 성공과 실제 쇼핑몰 정상 운영은 구분합니다. 운영 DB 및 인증 설정은 docs/CLOUDFLARE.md를 따릅니다.

## 공식 근거

- 기본 빌드 변수: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#default-variables
- Node.js 버전 파일: https://developers.cloudflare.com/workers/ci-cd/builds/build-image/
