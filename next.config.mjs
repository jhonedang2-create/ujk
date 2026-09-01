/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // 운영에 필요한 이미지 호스트만 허용합니다. 임의 호스트(**)는 SSRF 위험이 있습니다.
    remotePatterns: [
      { protocol: 'https', hostname: 'image.epost.go.kr' },
      { protocol: 'https', hostname: 'phinf.pstatic.net' },
      { protocol: 'https', hostname: 'k.kakaocdn.net' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://js.tosspayments.com https://cdn.iamport.kr https://t1.daumcdn.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://image.epost.go.kr https://phinf.pstatic.net https://k.kakaocdn.net",
      "font-src 'self' data:",
      "connect-src 'self' https://api.tosspayments.com https://api.iamport.kr",
      "frame-src 'self' https://*.tosspayments.com https://*.iamport.kr https://postcode.map.daum.net https://www.openstreetmap.org",
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; ');

    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ...(process.env.NODE_ENV === 'production'
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
          : []),
      ],
    }];
  },
};
export default nextConfig;
