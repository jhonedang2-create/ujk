import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('▶ 시드 데이터 생성 시작');

  /* ── 관리자 계정 ── */
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPw = process.env.ADMIN_PASSWORD ?? '';
  if (!adminEmail || !adminEmail.includes('@')) {
    throw new Error('ADMIN_EMAIL 환경변수에 관리자 이메일을 입력해야 합니다.');
  }
  if (adminPw.length < 12 || !/[a-z]/.test(adminPw) || !/[A-Z]/.test(adminPw) || !/\d/.test(adminPw) || !/[^\w]/.test(adminPw)) {
    throw new Error('ADMIN_PASSWORD는 12자 이상이며 영문 대/소문자·숫자·특수문자를 포함해야 합니다.');
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      password: await bcrypt.hash(adminPw, 10),
      name: '관리자',
      role: 'ADMIN',
      provider: 'credentials',
      phone: '041-936-1600',
      phoneNorm: '0419361600',
    },
  });

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
  console.log(`  관리자 계정 준비 완료: ${adminEmail}`);

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
  const products: any[] = [
    {
      slug: 'daecheon-seasoned-jaerae-20pack',
      name: '대천우정김 조미구이재래김 (5매×20봉)',
      categorySlug: 'jaerae-gim',
      summary: '온 가족 밥상에 넉넉한 전장 재래김 20봉 구성',
      price: 27000,
      listPrice: 0,
      stock: 200,
      unit: '5매 × 20봉',
      isFeatured: true,
      isBest: true,
      foodType: '조미김',
      ingredients: commonIngredients,
      allergyInfo: '제품 포장 표시사항 참조',
      expiryInfo: '제품 포장 별도 표기일까지',
      nutritionInfo: '제품 포장 표시사항 참조',
      description: `<h2>매일 꺼내 먹기 좋은 대천우정김</h2>
<p>전장형 조미구이재래김을 5매씩 나누어 담은 20봉 구성입니다. 한 봉씩 개봉해 밥반찬이나 간단한 안주로 즐기기 좋습니다.</p>
<h3>추천하는 순간</h3><ul><li>갓 지은 밥과 함께하는 일상 반찬</li><li>주먹밥·김밥을 만들 때</li><li>여럿이 나누는 가정용 실속 구성</li></ul>
<h3>보관 안내</h3><p>직사광선과 습기를 피해 서늘한 곳에 보관하고, 개봉 후에는 가능한 한 빨리 드세요. 원재료와 소비기한은 수령한 제품 포장 표시를 우선합니다.</p>`,
      images: ['/products/seasoned-laver-20pack.jpg'],
      options: [],
      sourceUrl: officialStore,
    },
    {
      slug: 'daecheon-lunchbox-gim-24pack',
      name: '대천우정김 조미구이재래도시락김 (9절 9매×24봉)',
      categorySlug: 'lunchbox-gim',
      summary: '한 끼 분량으로 간편하게 즐기는 9절 도시락김 24봉',
      price: 12000,
      listPrice: 0,
      stock: 200,
      unit: '9절 9매 × 24봉',
      isFeatured: true,
      isBest: true,
      foodType: '조미김',
      ingredients: commonIngredients,
      allergyInfo: '제품 포장 표시사항 참조',
      expiryInfo: '제품 포장 별도 표기일까지',
      nutritionInfo: '제품 포장 표시사항 참조',
      description: `<h2>식탁에 바로 올리는 간편한 도시락김</h2><p>먹기 좋은 9절 크기의 재래김을 한 봉에 9매씩 담았습니다. 별도 손질 없이 바로 꺼내 한 끼 반찬으로 이용할 수 있습니다.</p><h3>이런 분께 권합니다</h3><ul><li>매번 김을 자르는 번거로움을 줄이고 싶은 가정</li><li>도시락·간편식과 함께할 김을 찾는 분</li><li>낱봉 보관이 편한 구성을 원하는 분</li></ul><p>실제 중량, 원재료와 영양정보는 제품 포장 표시를 확인해 주세요.</p>`,
      images: ['/products/lunchbox-laver-24pack.jpg'],
      options: [],
      sourceUrl: officialStore,
    },
    {
      slug: 'daecheon-seasoned-jaerae-6pack',
      name: '대천우정김 조미구이재래김 (5매×6봉)',
      categorySlug: 'jaerae-gim',
      summary: '처음 맛보기에도 부담 없는 재래김 6봉 구성',
      price: 11000,
      listPrice: 0,
      stock: 200,
      unit: '5매 × 6봉',
      isFeatured: true,
      isBest: true,
      foodType: '조미김',
      ingredients: commonIngredients,
      allergyInfo: '제품 포장 표시사항 참조',
      expiryInfo: '제품 포장 별도 표기일까지',
      nutritionInfo: '제품 포장 표시사항 참조',
      description: `<h2>부담 없이 시작하는 6봉 구성</h2><p>대천우정김 전장 재래김을 소량으로 구성해 처음 구매하거나 가볍게 선물하기 좋습니다.</p><h3>활용 방법</h3><ul><li>밥을 감싸 한입 반찬으로</li><li>잘게 부숴 주먹밥과 볶음밥에</li><li>간단한 술안주와 간식으로</li></ul><p>포장 상태와 표시사항은 출고 시점의 실제 제품을 기준으로 합니다.</p>`,
      images: ['/products/seasoned-laver-6pack.jpg'],
      options: [],
      sourceUrl: officialStore,
    },
    {
      slug: 'daecheon-gift-jaerae-4box',
      name: '대천우정김 조미구이재래김 (5매×10봉×4박스)',
      categorySlug: 'gift-set',
      summary: '나누어 전달하기 좋은 재래김 4박스 구성',
      price: 60000,
      listPrice: 0,
      stock: 80,
      unit: '5매 × 10봉 × 4박스',
      isFeatured: true,
      foodType: '조미김',
      ingredients: commonIngredients,
      allergyInfo: '제품 포장 표시사항 참조',
      expiryInfo: '제품 포장 별도 표기일까지',
      nutritionInfo: '제품 포장 표시사항 참조',
      description: `<h2>감사한 마음을 나누는 4박스 구성</h2><p>조미구이재래김 10봉 구성을 네 박스로 나눈 상품입니다. 가족·지인·직원에게 각각 전달해야 하는 주문에 편리합니다.</p><h3>주문 전 확인</h3><ul><li>구성: 5매 재래김 10봉 × 4박스</li><li>대량 주문과 납기는 고객센터 사전 문의 권장</li><li>포장 디자인은 생산 시점에 따라 달라질 수 있음</li></ul>`,
      images: ['/products/gift-set-4box.jpg'],
      options: [],
      sourceUrl: officialStore,
    },
  ];

  for (const p of products) {
    const { categorySlug, images, options, ...rest } = p;
    const productData = {
        ...rest,
        categoryId: catMap[categorySlug],
        maker: '(주)대천우정김',
        origin: '국내산',
        storageInfo: rest.storageInfo ?? '직사광선을 피해 서늘한 곳에 보관',
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
        ...(options.length
          ? { options: { create: options.map((o: Record<string, unknown>, i: number) => ({ ...o, sortOrder: i })) } }
          : {}),
      },
    });
    const imageCount = await prisma.productImage.count({ where: { productId: created.id } });
    if (imageCount === 0) {
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
    }
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

  // 연혁·인증은 증빙이 확인된 값만 관리자에서 등록합니다. 샘플 실적은 생성하지 않습니다.

  /* ── 공지 / FAQ ── */
  const posts = [
    {
      type: 'NOTICE',
      title: '대천우정김 자사몰 오픈 안내',
      isPinned: true,
      content: '<p>안녕하세요, (주)대천우정김입니다.</p><p>공식 온라인몰에서 재래김·도시락김·식탁김 제품 정보와 주문 내역을 확인하실 수 있습니다.</p>',
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
        subtitle: '공식 제품과 판매처를 확인하세요.',
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
      data: { imageUrl: '', title: '보령에서 만드는 대천우정김', subtitle: '공식 제품과 판매처를 확인하세요.' },
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
    { name: '대천우정김 공식몰', type: 'ONLINE', url: '/', note: '자사 운영 온라인몰', sortOrder: 0 },
    { name: '우체국쇼핑 대천우정김', type: 'ONLINE', url: 'https://mall.epost.go.kr/fo/partner/partnerShop.do?suppCompId=31309801', note: '우체국쇼핑 공식 판매자 페이지', sortOrder: 1 },
    { name: 'G마켓 대천우정김', type: 'ONLINE', url: 'https://m.gmarket.co.kr/n/minishop/friendshipkim/sellerinfo', note: 'G마켓 판매자 정보', sortOrder: 2 },
  ];

  for (const c of channels) {
    const exists = await prisma.salesChannel.findFirst({ where: { name: c.name } });
    if (!exists) await prisma.salesChannel.create({ data: c });
  }
  console.log('  공식 판매 채널 등록 완료');
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
