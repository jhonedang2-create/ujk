import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('▶ 시드 데이터 생성 시작');

  /* ── 관리자 계정 ── */
  const adminLoginId = process.env.ADMIN_USERNAME?.trim() ?? '';
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPw = process.env.ADMIN_PASSWORD ?? '';
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(adminLoginId)) {
    throw new Error('ADMIN_USERNAME은 영문·숫자·점·밑줄·하이픈으로 3~40자여야 합니다.');
  }
  if (adminEmail && !adminEmail.includes('@')) {
    throw new Error('ADMIN_EMAIL을 입력할 경우 올바른 이메일 형식이어야 합니다.');
  }
  if (adminPw.length < 12 || !/[a-z]/.test(adminPw) || !/[A-Z]/.test(adminPw) || !/\d/.test(adminPw) || !/[^\w]/.test(adminPw)) {
    throw new Error('ADMIN_PASSWORD는 12자 이상이며 영문 대/소문자·숫자·특수문자를 포함해야 합니다.');
  }

  const passwordHash = await bcrypt.hash(adminPw, 10);
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { loginId: adminLoginId },
        ...(adminEmail ? [{ email: adminEmail }] : []),
        { role: 'ADMIN' },
      ],
    },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        loginId: adminLoginId,
        ...(adminEmail ? { email: adminEmail } : {}),
        password: passwordHash,
        name: '관리자',
        role: 'ADMIN',
        status: 'ACTIVE',
        provider: 'credentials',
      },
    });
  } else {
    await prisma.user.create({
      data: {
        loginId: adminLoginId,
        email: adminEmail || null,
        password: passwordHash,
        name: '관리자',
        role: 'ADMIN',
        provider: 'credentials',
        phone: '041-936-1600',
        phoneNorm: '0419361600',
      },
    });
  }

  // 기존 회원의 phoneNorm 채우기 (문자 발송 대상 조회에 필요)
  const needsNorm = await prisma.user.findMany({
    where: { phoneNorm: '', phone: { not: null } },
    select: { id: true, phone: true },
  });
  const normalize = (raw: string) => {
    let p = String(raw ?? '').replace(/[^\d+]/g, '');
    if (p.startsWith('+82')) p = `0${p.slice(3)}`;
    else if (p.startsWith('82') && p.length > 10) p = `0${p.slice(2)}`;
    return p.replace(/\D/g, '');
  };

  for (const u of needsNorm) {
    await prisma.user
      .update({ where: { id: u.id }, data: { phoneNorm: normalize(u.phone ?? '') } })
      .catch(() => null);
  }
  if (needsNorm.length > 0) console.log(`  전화번호 정규화 ${needsNorm.length}건 반영`);
  console.log(`  관리자 계정 준비 완료: ${adminLoginId}${adminEmail ? ` (${adminEmail})` : ''}`);

  /* ── 카테고리 ── */
  const cats = [
    { name: '재래김', slug: 'jaerae-gim', sortOrder: 1, description: '전장형 조미구이재래김' },
    { name: '도시락김', slug: 'lunchbox-gim', sortOrder: 2, description: '한 끼에 간편한 9절 도시락김' },
    { name: '식탁김', slug: 'table-gim', sortOrder: 3, description: '가정용 대용량 식탁김' },
    { name: '파래김', slug: 'parae-gim', sortOrder: 4, description: '파래를 더한 조미구이김' },
    { name: '선물세트', slug: 'gift-set', sortOrder: 5, description: '답례·명절·단체용 김 세트' },
  ];

  const catMap: Record<string, string> = {};
  for (const c of cats) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    catMap[c.slug] = row.id;
  }

  /* ── 상품 ── */
  const officialStore = 'https://mall.epost.go.kr/fo/partner/partnerShop.do?suppCompId=31309801';
  const commonIngredients = '재래김(국산), 옥배유, 참기름, 소금 (정확한 원재료명과 함량은 제품 포장 표시사항 참조)';
  const productSpecs = [
    ['daecheon-seasoned-jaerae-20pack', '대천우정김 조미구이재래김 (5매×20봉)', 'jaerae-gim', '온 가족 밥상에 넉넉한 전장 재래김 20봉 구성', 27000, '5매 × 20봉', 'seasoned-jaerae-20.webp', true, true],
    ['daecheon-lunchbox-gim-24pack', '대천우정김 조미구이재래도시락김 (9절 9매×24봉)', 'lunchbox-gim', '한 끼 분량으로 간편하게 즐기는 9절 도시락김 24봉', 12000, '9절 9매 × 24봉', 'lunchbox-jaerae-24.webp', true, true],
    ['daecheon-seasoned-jaerae-6pack', '대천우정김 조미구이재래김 (5매×6봉)', 'jaerae-gim', '처음 맛보기에도 부담 없는 재래김 6봉 구성', 11000, '5매 × 6봉', 'seasoned-jaerae-6.webp', true, true],
    ['daecheon-lunchbox-jaerae-27pack', '대천우정김 조미구이재래도시락김 (9절 9매×27봉)', 'lunchbox-gim', '도시락과 간편식에 잘 어울리는 재래 도시락김 27봉', 18000, '9절 9매 × 27봉', 'lunchbox-jaerae-27.webp', true, false],
    ['daecheon-gift-jaerae-4box', '대천우정김 조미구이재래김 (5매×10봉×4박스)', 'gift-set', '나누어 전달하기 좋은 재래김 4박스 구성', 60000, '5매 × 10봉 × 4박스', 'seasoned-jaerae-10x4.webp', true, false],
    ['daecheon-table-jaerae-16pack', '대천우정김 조미구이식탁김 (9절 24매×16봉)', 'table-gim', '식탁에 바로 올리는 9절 재래김 16봉 구성', 21000, '9절 24매 × 16봉', 'table-jaerae-16.webp', true, true],
    ['daecheon-table-jaerae-30pack', '대천우정김 조미구이식탁김 (9절 24매×30봉)', 'table-gim', '여럿이 넉넉하게 즐기는 식탁김 30봉 구성', 33000, '9절 24매 × 30봉', 'table-jaerae-30.webp', true, false],
    ['daecheon-table-jaerae-24pack', '대천우정김 조미구이식탁김 (9절 24매×24봉)', 'table-gim', '가정 식탁에 알맞은 식탁김 24봉 구성', 28000, '9절 24매 × 24봉', 'table-jaerae-24.webp', true, false],
    ['daecheon-seasoned-jaerae-30pack', '대천우정김 조미구이재래김 (5매×30봉)', 'jaerae-gim', '매일 넉넉하게 꺼내 먹는 전장 재래김 30봉', 38000, '5매 × 30봉', 'seasoned-jaerae-30.webp', false, true],
    ['daecheon-seasoned-jaerae-12pack', '대천우정김 조미구이재래김 (5매×12봉)', 'jaerae-gim', '부담 없이 쟁여 두기 좋은 전장 재래김 12봉', 19000, '5매 × 12봉', 'seasoned-jaerae-12.webp', false, false],
    ['daecheon-seasoned-jaerae-6pack-5box', '대천우정김 조미구이재래김 (5매×6봉×5박스)', 'gift-set', '답례와 단체 선물에 편리한 재래김 5박스 구성', 50000, '5매 × 6봉 × 5박스', 'seasoned-jaerae-6x5.webp', false, false],
    ['daecheon-seasoned-jaerae-10pack', '대천우정김 조미구이재래김 (5매×10봉)', 'jaerae-gim', '가볍게 주문하기 좋은 전장 재래김 10봉', 17000, '5매 × 10봉', 'seasoned-jaerae-10.webp', false, false],
    ['daecheon-lightly-roasted-jaerae-6pack', '대천우정김 조미하지 않은 살짝구운재래김 (10g×6봉)', 'jaerae-gim', '담백하게 즐기는 조미하지 않은 살짝 구운 재래김', 11000, '10g × 6봉', 'lightly-roasted-jaerae-6.webp', false, true],
    ['daecheon-grilled-set-3type-30pack', '대천우정김 구이김 3종 세트 (각 10봉)', 'gift-set', '재래김·파래김·살짝구운김을 한 번에 즐기는 30봉 세트', 38000, '3종 × 각 10봉', 'grilled-set-30.webp', false, false],
    ['daecheon-seasoned-jaerae-25pack', '대천우정김 조미구이재래김 (5매×25봉)', 'jaerae-gim', '가정과 사무실에 넉넉한 전장 재래김 25봉', 34000, '5매 × 25봉', 'seasoned-jaerae-25.webp', false, false],
    ['daecheon-seasoned-parae-30pack', '대천우정김 조미구이파래김 (5매×30봉)', 'parae-gim', '파래의 향을 더한 조미구이김 30봉 구성', 38000, '5매 × 30봉', 'seasoned-parae-30.webp', false, true],
    ['daecheon-seasoned-jaerae-5pack-4box', '대천우정김 조미구이재래김 (5매×5봉×4박스)', 'gift-set', '작게 나누어 선물하기 좋은 재래김 4박스', 30000, '5매 × 5봉 × 4박스', 'seasoned-jaerae-5x4.webp', false, false],
    ['daecheon-seasoned-parae-12pack', '대천우정김 조미구이파래김 (5매×12봉)', 'parae-gim', '파래김을 가볍게 즐기는 12봉 구성', 19000, '5매 × 12봉', 'seasoned-parae-12.webp', false, false],
    ['daecheon-seasoned-parae-20pack', '대천우정김 조미구이파래김 (5매×20봉)', 'parae-gim', '온 가족이 즐기기 좋은 파래김 20봉 구성', 27000, '5매 × 20봉', 'seasoned-parae-20.webp', false, false],
    ['daecheon-grilled-set-jaerae-parae-20pack', '대천우정김 구이김 세트 (재래김 10봉+파래김 10봉)', 'gift-set', '재래김과 파래김을 골고루 담은 20봉 세트', 28000, '재래김 10봉 + 파래김 10봉', 'grilled-set-20.webp', false, false],
    ['daecheon-lightly-roasted-jaerae-20pack', '대천우정김 조미하지 않은 살짝구운재래김 (5매×20봉)', 'jaerae-gim', '담백하게 넉넉히 즐기는 살짝 구운 재래김 20봉', 27000, '5매 × 20봉', 'lightly-roasted-jaerae-20.webp', false, false],
    ['daecheon-lightly-roasted-jaerae-12pack', '대천우정김 조미하지 않은 살짝구운재래김 (5매×12봉)', 'jaerae-gim', '담백한 맛을 부담 없이 즐기는 살짝 구운 재래김 12봉', 18000, '5매 × 12봉', 'lightly-roasted-jaerae-12.webp', false, false],
  ] as const;

  const products = productSpecs.map(([slug, name, categorySlug, summary, price, unit, image, isFeatured, isBest]) => ({
    slug,
    name,
    categorySlug,
    summary,
    price,
    listPrice: 0,
    stock: categorySlug === 'gift-set' ? 80 : 200,
    unit,
    isFeatured,
    isBest,
    foodType: '조미김',
    ingredients: commonIngredients,
    allergyInfo: '제품 포장 표시사항 참조',
    expiryInfo: '제품 포장 별도 표기일까지',
    nutritionInfo: '제품 포장 표시사항 참조',
    description: `<h2>따뜻한 밥과 함께 즐기는 대천우정김</h2>
<p>${summary}입니다. 필요한 만큼 개봉해 밥반찬, 도시락, 주먹밥과 간단한 간식으로 즐겨보세요.</p>
<h3>맛있게 즐기는 방법</h3><ul><li>갓 지은 밥을 한입 크기로 감싸기</li><li>잘게 부숴 주먹밥과 볶음밥에 더하기</li><li>개봉 직후 바삭할 때 바로 즐기기</li></ul>
<h3>제품 구성</h3><p>${unit}. 생산 시점에 따라 포장 디자인과 세부 표시사항이 달라질 수 있으므로 수령한 제품 포장을 가장 정확한 기준으로 확인해 주세요.</p>`,
    images: [`/products/${image}`],
    sourceUrl: officialStore,
  }));

  for (const p of products) {
    const { categorySlug, images, ...rest } = p;
    const productData = {
        ...rest,
        categoryId: catMap[categorySlug],
        maker: '(주)대천우정김',
        origin: '국내산',
        storageInfo: '직사광선을 피해 서늘한 곳에 보관',
    };
    const created = await prisma.product.upsert({
      where: { slug: p.slug },
      update: productData,
      create: {
        ...productData,
        images: {
          create: images.map((url: string, i: number) => ({
            url,
            alt: p.name,
            sortOrder: i,
            isMain: i === 0,
            source: 'official',
            sourceUrl: rest.sourceUrl,
          })),
        },
      },
    });
    // 우체국쇼핑에서 확보한 자사 제품 사진만 갱신합니다.
    // 관리자가 직접 올린 별도 사진(sourceUrl 없음)은 보존합니다.
    await prisma.productImage.deleteMany({
      where: { productId: created.id, sourceUrl: officialStore },
    });
    await prisma.productImage.createMany({
      data: images.map((url: string, i: number) => ({
        productId: created.id,
        url,
        alt: p.name,
        sortOrder: i,
        isMain: i === 0,
        source: 'official',
        sourceUrl: rest.sourceUrl,
      })),
    });
    console.log(`  상품 등록: ${created.name}`);
  }

  // 구버전 시드가 넣었던 검증되지 않은 데모 상품/실적을 안전하게 숨기거나 제거합니다.
  await prisma.product.updateMany({
    where: {
      slug: { in: ['daecheon-jomi-gim-12', 'daecheon-parae-gim-9', 'gift-set-premium', 'family-jomi-gim-30', 'gimgaru-500', 'dried-shrimp-300'] },
    },
    data: { isActive: false, isFeatured: false, isBest: false, isNew: false },
  });
  await prisma.category.updateMany({ where: { slug: { in: ['jomi-gim', 'seafood'] } }, data: { isActive: false } });
  await prisma.history.deleteMany({
    where: {
      content: {
        in: [
          '자사 온라인몰 오픈 및 수산물 카테고리 확대',
          '추석 선물세트 누적 판매 5만 세트 돌파',
          '스마트 HACCP 설비 도입, 생산라인 자동화 완료',
          '보령시 우수 중소기업 선정',
          '제2공장 증설 및 생산능력 2배 확대',
          '온라인 오픈마켓(쿠팡·네이버) 입점',
          'HACCP 인증 획득',
          '(주)대천우정김 법인 전환',
          '충남 보령시 남곡동 김 가공공장 설립',
        ],
      },
    },
  });
  await prisma.certification.deleteMany({
    where: {
      OR: [
        { number: '제0000호' },
        { name: '보령시 우수기업 선정', number: '-' },
      ],
    },
  });

  // 공개자료에서 확인되는 회사 기록과 등록정보만 기본값으로 제공합니다.
  // 판매량·수출국·수상·HACCP 등 별도 증빙이 필요한 실적은 생성하지 않습니다.
  const verifiedHistory = [
    {
      year: '2014',
      month: '',
      content: '통신판매업 신고 (제2014-충남보령-0683호)',
      sortOrder: 10,
    },
    {
      year: '2026',
      month: '09',
      content: '대천우정김 자사몰 및 온라인 제품 안내 채널 정비',
      sortOrder: 10,
    },
    {
      year: '2026',
      month: '09',
      content: '우체국쇼핑 공식 판매자 페이지 기준 제품 정보·이미지 정비',
      sortOrder: 20,
    },
  ];
  for (const h of verifiedHistory) {
    const exists = await prisma.history.findFirst({ where: { content: h.content } });
    if (exists) await prisma.history.update({ where: { id: exists.id }, data: { ...h, isActive: true } });
    else await prisma.history.create({ data: h });
  }

  const verifiedRegistrations = [
    {
      name: '사업자등록',
      issuer: '국세청',
      number: '313-81-27786',
      issuedAt: '',
      sortOrder: 10,
    },
    {
      name: '통신판매업 신고',
      issuer: '충청남도 보령시',
      number: '제2014-충남보령-0683호',
      issuedAt: '2014',
      sortOrder: 20,
    },
  ];
  for (const c of verifiedRegistrations) {
    const exists = await prisma.certification.findFirst({ where: { number: c.number } });
    if (exists) await prisma.certification.update({ where: { id: exists.id }, data: { ...c, isActive: true } });
    else await prisma.certification.create({ data: c });
  }
  console.log('  공개자료 기반 연혁·등록정보 반영 완료');

  /* ── 공지 / FAQ ── */
  const posts = [
    {
      type: 'NOTICE',
      title: '대천우정김 자사몰 오픈 안내',
      isPinned: true,
      content: '<p>안녕하세요, (주)대천우정김입니다.</p><p>대천우정김 자사몰에서 재래김·도시락김·식탁김·파래김 제품 정보와 주문 내역을 확인하실 수 있습니다.</p>',
    },
    {
      type: 'NOTICE',
      title: '상품 표시사항 확인 안내',
      content: '<p>원재료, 영양정보, 보관방법과 소비기한은 수령하신 제품 포장 표시사항을 우선해 확인해 주세요.</p>',
    },
    {
      type: 'FAQ',
      title: '김은 어떻게 보관하나요?',
      content: '<p>직사광선을 피해 서늘하고 건조한 곳에 보관해 주세요. 개봉 후에는 밀봉하여 냉동 보관하시면 바삭함이 오래 유지됩니다.</p>',
    },
    {
      type: 'FAQ',
      title: '대량 구매나 기업 선물세트 주문도 가능한가요?',
      content: '<p>가능합니다. 고객센터 또는 문의하기 페이지에서 수량과 희망 납기를 남겨주시면 확인 후 연락드립니다.</p>',
    },
    {
      type: 'FAQ',
      title: '배송비와 무료배송 기준이 궁금해요.',
      content: '<p>기본 배송비는 3,500원이며 3만원 이상 구매 시 무료배송입니다. 도서산간 지역은 추가 배송비가 발생할 수 있습니다.</p>',
    },
  ];
  for (const p of posts) {
    const exists = await prisma.post.findFirst({ where: { title: p.title } });
    if (exists) await prisma.post.update({ where: { id: exists.id }, data: p });
    else await prisma.post.create({ data: p });
  }
  console.log('  공지/FAQ 등록 완료');

  /* ── 메인 배너 ── */
  const bannerExists = await prisma.banner.findFirst({ where: { position: 'MAIN' } });
  if (!bannerExists) {
    await prisma.banner.create({
      data: {
        title: '보령에서 만드는 대천우정김',
        subtitle: '자사몰에서 제품을 둘러보고 바로 주문하세요.',
        imageUrl: '',
        linkUrl: '/products',
        position: 'MAIN',
        sortOrder: 0,
      },
    });
    console.log('  메인 배너 등록 완료');
  } else if (bannerExists.imageUrl.startsWith('data:')) {
    await prisma.banner.update({
      where: { id: bannerExists.id },
      data: { imageUrl: '', title: '보령에서 만드는 대천우정김', subtitle: '자사몰에서 제품을 둘러보고 바로 주문하세요.' },
    });
  }

  await seedGlobal();
  await seedChannels();
  await seedMessaging();

  console.log('✔ 시드 데이터 생성 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/* ─────────────────────────────────────────────────────────
 * 공개 판매채널
 * 공식적으로 확인되는 판매자 페이지만 생성합니다.
 * ───────────────────────────────────────────────────────── */
async function seedGlobal() {
  const channels = [
    { name: '대천우정김 자사몰', type: 'ONLINE', url: '/', note: '제조사 직접 운영 온라인몰', sortOrder: 0 },
    { name: '우체국쇼핑 대천우정김', type: 'ONLINE', url: 'https://mall.epost.go.kr/fo/partner/partnerShop.do?suppCompId=31309801', note: '우체국쇼핑 공식 판매자 페이지', sortOrder: 1 },
    { name: 'G마켓 대천우정김', type: 'ONLINE', url: 'https://m.gmarket.co.kr/n/minishop/friendshipkim/sellerinfo', note: 'G마켓 판매자 정보', sortOrder: 2 },
  ];

  for (const c of channels) {
    const exists = await prisma.salesChannel.findFirst({ where: { name: c.name } });
    if (!exists) await prisma.salesChannel.create({ data: c });
  }
  console.log('  판매 채널 등록 완료');
}


/* ─────────────────────────────────────────────────────────
 * 판매 채널 (다채널 통합)
 * 코드/이름만 미리 만들어 둡니다. API 키는 관리자 화면에서 입력하세요.
 * ───────────────────────────────────────────────────────── */
async function seedChannels() {
  const channels = [
    { code: 'SELF', name: '자사몰', type: 'SELF', color: '#1e4f5e', adapter: '', syncMode: 'MANUAL', sortOrder: 0 },
    { code: 'SMARTSTORE', name: '네이버 스마트스토어', type: 'OPENMARKET', color: '#03C75A', adapter: 'naver', syncMode: 'API', sortOrder: 1 },
    { code: 'COUPANG', name: '쿠팡', type: 'OPENMARKET', color: '#eb6834', adapter: 'coupang', syncMode: 'API', sortOrder: 2 },
    { code: 'ELEVENST', name: '11번가', type: 'OPENMARKET', color: '#e34948', adapter: '', syncMode: 'MANUAL', sortOrder: 3 },
    { code: 'GMARKET', name: 'G마켓', type: 'OPENMARKET', color: '#1baf7a', adapter: '', syncMode: 'MANUAL', sortOrder: 4 },
    { code: 'AUCTION', name: '옥션', type: 'OPENMARKET', color: '#eda100', adapter: '', syncMode: 'MANUAL', sortOrder: 5 },
    { code: 'OFFLINE', name: '오프라인·납품', type: 'OFFLINE', color: '#584d3d', adapter: '', syncMode: 'MANUAL', sortOrder: 6 },
    { code: 'ETC', name: '기타 채널', type: 'OPENMARKET', color: '#9b8e74', adapter: '', syncMode: 'MANUAL', sortOrder: 7 },
  ];

  for (const c of channels) {
    await prisma.channel.upsert({
      where: { code: c.code },
      // 이름·색상만 갱신하고 인증정보는 건드리지 않습니다
      update: { name: c.name, color: c.color, adapter: c.adapter, sortOrder: c.sortOrder },
      create: c,
    });
  }
  console.log('  판매 채널 8개 준비 완료 (API 키는 관리자 > 판매채널 연동에서 입력)');
}


/* ─────────────────────────────────────────────────────────
 * 알림톡 / 문자 기본 문구
 * 주문 안내는 '정보성'이라 수신동의 없이 보낼 수 있습니다.
 * 여기에 할인·이벤트 문구를 섞으면 그 순간 '광고'가 되니 넣지 마세요.
 * ───────────────────────────────────────────────────────── */
async function seedMessaging() {
  await prisma.messageSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  const templates = [
    {
      code: 'ORDER_PAID',
      name: '결제완료 안내',
      description: '결제가 확인되면 발송',
      smsText:
        '[#{쇼핑몰}] 결제가 완료되었습니다.\n\n' +
        '주문번호 : #{주문번호}\n' +
        '상품 : #{상품명}\n' +
        '결제금액 : #{금액}원\n\n' +
        '빠르게 준비해서 보내드리겠습니다. 감사합니다.',
    },
    {
      code: 'DEPOSIT_WAIT',
      name: '무통장 입금 안내',
      description: '무통장 주문이 들어오면 발송',
      smsText:
        '[#{쇼핑몰}] 주문이 접수되었습니다.\n\n' +
        '주문번호 : #{주문번호}\n' +
        '입금금액 : #{금액}원\n' +
        '입금계좌 : #{입금계좌}\n\n' +
        '48시간 내 미입금 시 자동 취소됩니다.',
    },
    {
      code: 'SHIPPING',
      name: '발송 안내',
      description: '송장을 등록하면 발송 (택배사·송장번호 자동 삽입)',
      smsText:
        '[#{쇼핑몰}] 상품이 발송되었습니다.\n\n' +
        '#{이름}님 주문하신 #{상품명}\n' +
        '택배사 : #{택배사}\n' +
        '송장번호 : #{송장번호}\n\n' +
        '배송조회 : #{조회링크}\n' +
        '맛있게 드세요. 감사합니다.',
    },
    {
      code: 'DELIVERED',
      name: '배송완료 안내',
      description: '배송완료로 바꾸면 발송',
      smsText:
        '[#{쇼핑몰}] 배송이 완료되었습니다.\n\n' +
        '주문번호 : #{주문번호}\n' +
        '상품이 잘 도착했는지 확인해 주세요.\n' +
        '문제가 있으면 언제든 연락 주세요.',
    },
    {
      code: 'CANCELLED',
      name: '주문취소 안내',
      description: '주문이 취소되면 발송',
      smsText:
        '[#{쇼핑몰}] 주문이 취소되었습니다.\n\n' +
        '주문번호 : #{주문번호}\n' +
        '취소금액 : #{금액}원\n\n' +
        '카드 결제는 취소 반영까지 3~5영업일이 걸릴 수 있습니다.',
    },
  ];

  for (const t of templates) {
    await prisma.messageTemplate.upsert({
      where: { code: t.code },
      update: { name: t.name, description: t.description }, // 문구는 수정본을 덮어쓰지 않습니다
      create: t,
    });
  }

  console.log('  알림 문구 5종 준비 완료 (관리자 > 알림톡·문자 에서 수정)');
}
