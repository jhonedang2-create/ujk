export type ProductStory = {
  eyebrow: string;
  headline: string;
  intro: string;
  momentTitle: string;
  moments: Array<{ title: string; copy: string }>;
  tableTitle: string;
  tableCopy: string;
  packPoint: string;
};

const STORIES: Record<string, ProductStory> = {
  'daecheon-seasoned-jaerae-20pack': {
    eyebrow: 'EVERYDAY CRISP',
    headline: '갓 지은 밥이 기다려지는\n바삭한 한 장',
    intro:
      '전장 재래김을 5매씩 나눠 담아, 식탁에 올릴 때마다 알맞게 꺼내기 좋은 구성입니다. 얇고 바삭한 김에 따뜻한 밥을 감싸 일상의 한 끼를 더 맛있게 즐겨보세요.',
    momentTitle: '온 가족이 자주 찾는 순간',
    moments: [
      { title: '따뜻한 아침밥', copy: '갓 지은 밥을 한입 크기로 감싸 간단하고 든든하게' },
      { title: '주먹밥과 볶음밥', copy: '잘게 부숴 고소한 풍미와 바삭한 식감을 더하기' },
      { title: '가벼운 간식', copy: '한 봉씩 꺼내 부담 없이 나누어 먹기 좋은 구성' },
    ],
    tableTitle: '매일 먹는 김일수록\n꺼내기 편해야 하니까',
    tableCopy:
      '20봉의 넉넉한 구성으로 온 가족 식탁에 두기 좋습니다. 개봉 전에는 습기와 직사광선을 피해 보관하고, 개봉한 김은 바로 드시면 바삭한 식감을 더 잘 느낄 수 있습니다.',
    packPoint: '5매씩 나눈 20봉 가정용 구성',
  },
  'daecheon-lunchbox-gim-24pack': {
    eyebrow: 'ONE MEAL, ONE PACK',
    headline: '한 끼에 딱 맞게\n꺼내는 도시락김',
    intro:
      '먹기 좋은 9절 크기의 재래김을 9매씩 담았습니다. 자를 필요 없이 바로 식탁과 도시락에 올릴 수 있어 바쁜 아침과 간단한 한 끼에 잘 어울립니다.',
    momentTitle: '어디서든 간편하게',
    moments: [
      { title: '아이들 식사', copy: '작은 크기로 집어 먹기 편한 9절 도시락김' },
      { title: '직장 도시락', copy: '한 끼 분량의 낱봉으로 휴대와 보관을 간편하게' },
      { title: '여행과 캠핑', copy: '별도 손질 없이 반찬 하나를 빠르게 준비' },
    ],
    tableTitle: '봉지를 열면 바로\n한 끼 반찬 완성',
    tableCopy:
      '24봉 낱개 포장으로 필요한 만큼만 꺼내 먹을 수 있습니다. 도시락, 컵밥, 간편식에 곁들이거나 아이들의 식사 반찬으로 준비해 보세요.',
    packPoint: '9절 9매씩 담은 24봉 소포장',
  },
  'daecheon-seasoned-jaerae-6pack': {
    eyebrow: 'LIGHT START',
    headline: '부담 없이 맛보는\n대천의 바삭함',
    intro:
      '처음 대천우정김을 고르거나 적은 구성부터 시작하고 싶은 분을 위한 6봉 상품입니다. 소가족의 일상 반찬과 가벼운 선물에 알맞습니다.',
    momentTitle: '작은 구성이라 더 알맞은 순간',
    moments: [
      { title: '첫 구매', copy: '넉넉한 대용량 전에 가볍게 맛보는 구성' },
      { title: '소가족 식탁', copy: '보관 부담을 줄이고 바삭할 때 즐기기' },
      { title: '작은 마음 선물', copy: '부담스럽지 않게 고소한 한 끼를 나누기' },
    ],
    tableTitle: '필요한 만큼만 두고\n맛있을 때 즐기세요',
    tableCopy:
      '5매씩 담긴 6봉 구성이라 보관 공간의 부담이 적습니다. 밥반찬은 물론 잘게 부숴 주먹밥과 볶음밥에 활용하기 좋습니다.',
    packPoint: '5매씩 나눈 6봉 맛보기 구성',
  },
  'daecheon-gift-jaerae-4box': {
    eyebrow: 'SHARE THE TABLE',
    headline: '고마운 마음을\n맛있는 한 상으로',
    intro:
      '조미구이재래김 10봉 구성을 네 박스로 나눠 담았습니다. 가족과 지인, 행사와 단체 선물처럼 여러 분께 각각 전달해야 할 때 편리한 구성입니다.',
    momentTitle: '마음을 나누는 자리',
    moments: [
      { title: '명절과 가족 모임', copy: '온 가족이 함께 즐기기 좋은 친숙한 선물' },
      { title: '감사 인사', copy: '실용적이고 부담 없이 전하는 식탁 선물' },
      { title: '기업·단체 주문', copy: '수량과 납기를 고객센터에서 미리 상담' },
    ],
    tableTitle: '한 박스씩 나누어\n따뜻한 마음까지 전달',
    tableCopy:
      '10봉 구성 네 박스를 한 번에 준비할 수 있습니다. 포장 디자인과 출고 일정은 생산 시점에 따라 달라질 수 있으므로 대량 주문은 고객센터에 먼저 문의해 주세요.',
    packPoint: '5매×10봉을 네 박스로 나눈 선물 구성',
  },
};

export function productStory(slug: string, name: string, unit: string): ProductStory {
  return STORIES[slug] ?? {
    eyebrow: 'TASTE OF BORYEONG',
    headline: '따뜻한 밥과 함께\n더 맛있는 대천김',
    intro: `${name}을(를) 일상의 식탁에서 간편하게 즐겨보세요. 실제 구성과 표시사항은 수령한 제품 포장을 기준으로 확인해 주세요.`,
    momentTitle: '이렇게 즐겨보세요',
    moments: [
      { title: '밥반찬', copy: '따뜻한 밥을 감싸 간편한 한입으로' },
      { title: '주먹밥', copy: '잘게 부숴 고소한 식감을 더하기' },
      { title: '간단한 간식', copy: '필요한 만큼 꺼내 가볍게 즐기기' },
    ],
    tableTitle: '매일 식탁에\n친숙한 바삭함',
    tableCopy: '습기와 직사광선을 피해 보관하고, 개봉 후에는 가능한 한 빨리 드세요.',
    packPoint: unit || '제품 포장 표시사항 참조',
  };
}
