import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// 현재 페이지는 세션/DB에 의존하는 동적 렌더링입니다.
// R2/유료 Images를 자동 생성하지 않습니다. ISR 도입 시 별도로 캐시를 구성하세요.
export default defineCloudflareConfig({});
