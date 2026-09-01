const products = [
  {id:'seasoned20',name:'조미구이재래김 5매×20봉',type:'재래김 · 온 가족 실속 구성',filter:'jaerae',price:27000,image:'./products/seasoned-jaerae-20.webp',desc:'온 가족 식탁에 넉넉하게 준비하는 전장 재래김 20봉 구성입니다.',features:['5매씩 간편하게 나눈 포장','가정 식탁에 넉넉한 20봉','밥반찬·주먹밥·간식으로 활용']},
  {id:'lunch24',name:'재래도시락김 9절9매×24봉',type:'도시락김 · 한 끼 포장',filter:'lunch',price:12000,image:'./products/lunchbox-jaerae-24.webp',desc:'밥 한 공기에 곁들이기 좋은 9절 재래 도시락김입니다.',features:['한 끼에 알맞은 9절 9매','보관과 휴대가 간편한 24봉','도시락·여행·간단한 식사에 추천']},
  {id:'seasoned6',name:'조미구이재래김 5매×6봉',type:'재래김 · 맛보기 구성',filter:'jaerae',price:11000,image:'./products/seasoned-jaerae-6.webp',desc:'처음 맛보거나 가볍게 준비하기 좋은 재래김 6봉 구성입니다.',features:['부담 없이 고르는 6봉','개봉 직후 바삭하게','소가족·맛보기용 추천']},
  {id:'lunch27',name:'재래도시락김 9절9매×27봉',type:'도시락김 · 넉넉한 구성',filter:'lunch',price:18000,image:'./products/lunchbox-jaerae-27.webp',desc:'학교, 직장, 여행지에서도 간편하게 꺼내 먹는 도시락김 27봉입니다.',features:['먹기 좋은 9절 크기','한 봉씩 간편한 소포장','27번의 든든한 한 끼']},
  {id:'gift10x4',name:'조미구이재래김 10봉×4박스',type:'선물세트 · 대량 구성',filter:'gift',price:60000,image:'./products/seasoned-jaerae-10x4.webp',desc:'가족, 지인, 직원에게 나누어 전달하기 좋은 네 박스 구성입니다.',features:['5매 10봉 구성 4박스','명절·행사·단체 선물 추천','수량·납기 실시간 상담']},
  {id:'table16',name:'조미구이식탁김 9절24매×16봉',type:'식탁김 · 가정용',filter:'table',price:21000,image:'./products/table-jaerae-16.webp',desc:'별도로 자를 필요 없이 식탁에 바로 올리는 9절 식탁김입니다.',features:['한 봉에 9절 24매','가족 식사에 편한 크기','16봉 실속 구성']},
  {id:'table30',name:'조미구이식탁김 9절24매×30봉',type:'식탁김 · 대용량',filter:'table',price:33000,image:'./products/table-jaerae-30.webp',desc:'여럿이 넉넉하게 즐기기 좋은 식탁김 30봉 구성입니다.',features:['먹기 좋은 9절','넉넉한 30봉','가정·사무실에 추천']},
  {id:'table24',name:'조미구이식탁김 9절24매×24봉',type:'식탁김 · 실속 구성',filter:'table',price:28000,image:'./products/table-jaerae-24.webp',desc:'매일의 식탁에 부담 없이 올리기 좋은 식탁김 24봉입니다.',features:['9절 24매씩 포장','24봉 실속 구성','가정용으로 추천']},
  {id:'seasoned30',name:'조미구이재래김 5매×30봉',type:'재래김 · 대용량',filter:'jaerae',price:38000,image:'./products/seasoned-jaerae-30.webp',desc:'대천우정김 재래김을 넉넉하게 쟁여 두는 30봉 구성입니다.',features:['전장 5매씩 포장','가정·사무실 대용량','여럿이 나누기 좋은 구성']},
  {id:'seasoned12',name:'조미구이재래김 5매×12봉',type:'재래김 · 알찬 구성',filter:'jaerae',price:19000,image:'./products/seasoned-jaerae-12.webp',desc:'부담 없이 쟁여 두고 즐기는 전장 재래김 12봉 구성입니다.',features:['5매 소포장','12봉 알찬 구성','밥반찬·간식으로 추천']},
  {id:'gift6x5',name:'조미구이재래김 6봉×5박스',type:'선물세트 · 답례용',filter:'gift',price:50000,image:'./products/seasoned-jaerae-6x5.webp',desc:'작게 나눈 다섯 박스로 여러 분께 마음을 전하기 좋은 구성입니다.',features:['6봉 구성 5박스','답례·단체 선물 추천','필요한 수량별로 전달']},
  {id:'seasoned10',name:'조미구이재래김 5매×10봉',type:'재래김 · 기본 구성',filter:'jaerae',price:17000,image:'./products/seasoned-jaerae-10.webp',desc:'가볍게 주문하기 좋은 전장 재래김 10봉 기본 구성입니다.',features:['5매씩 간편 포장','10봉 기본 구성','소가족 식탁에 추천']},
  {id:'light6',name:'조미하지 않은 살짝구운재래김 10g×6봉',type:'무조미김 · 담백한 맛',filter:'jaerae',price:11000,image:'./products/lightly-roasted-jaerae-6.webp',desc:'조미하지 않아 김 본연의 담백함을 즐기는 살짝 구운 재래김입니다.',features:['조미하지 않은 재래김','10g씩 6봉','양념장·김밥 재료로 활용']},
  {id:'set30',name:'구이김 3종 세트 각 10봉',type:'선물세트 · 3가지 맛',filter:'gift',price:38000,image:'./products/grilled-set-30.webp',desc:'재래김, 파래김, 살짝 구운 김을 골고루 맛보는 30봉 세트입니다.',features:['3종 각 10봉','취향에 맞춰 골라 먹기','가족·선물용 추천']},
  {id:'seasoned25',name:'조미구이재래김 5매×25봉',type:'재래김 · 넉넉한 구성',filter:'jaerae',price:34000,image:'./products/seasoned-jaerae-25.webp',desc:'가정과 사무실에서 넉넉히 즐기는 전장 재래김 25봉입니다.',features:['5매씩 25봉','여럿이 즐기는 구성','개별 포장으로 간편 보관']},
  {id:'parae30',name:'조미구이파래김 5매×30봉',type:'파래김 · 대용량',filter:'parae',price:38000,image:'./products/seasoned-parae-30.webp',desc:'파래의 향을 더해 고소하게 즐기는 조미구이김 30봉 구성입니다.',features:['파래를 더한 조미김','5매씩 30봉','가정·사무실 대용량']},
  {id:'gift5x4',name:'조미구이재래김 5봉×4박스',type:'선물세트 · 소포장',filter:'gift',price:30000,image:'./products/seasoned-jaerae-5x4.webp',desc:'부담 없이 나누어 선물하기 좋은 재래김 네 박스 구성입니다.',features:['5봉 구성 4박스','답례·가벼운 선물 추천','박스별로 편하게 전달']},
  {id:'parae12',name:'조미구이파래김 5매×12봉',type:'파래김 · 알찬 구성',filter:'parae',price:19000,image:'./products/seasoned-parae-12.webp',desc:'파래김을 부담 없이 즐기는 12봉 구성입니다.',features:['파래 향의 고소한 김','5매씩 12봉','소가족 식탁 추천']},
  {id:'parae20',name:'조미구이파래김 5매×20봉',type:'파래김 · 가족 구성',filter:'parae',price:27000,image:'./products/seasoned-parae-20.webp',desc:'온 가족 식탁에 넉넉하게 올리는 파래김 20봉입니다.',features:['5매씩 소포장','20봉 가족 구성','밥반찬·간식 추천']},
  {id:'set20',name:'구이김세트 재래김10봉+파래김10봉',type:'선물세트 · 두 가지 맛',filter:'gift',price:28000,image:'./products/grilled-set-20.webp',desc:'재래김과 파래김을 골고루 담은 20봉 혼합 세트입니다.',features:['재래김 10봉','파래김 10봉','두 가지 맛을 한 번에']},
  {id:'light20',name:'조미하지 않은 살짝구운재래김 5매×20봉',type:'무조미김 · 대용량',filter:'jaerae',price:27000,image:'./products/lightly-roasted-jaerae-20.webp',desc:'담백한 살짝 구운 재래김을 넉넉하게 준비하는 20봉입니다.',features:['조미하지 않은 담백함','5매씩 20봉','양념장·김밥에 활용']},
  {id:'light12',name:'조미하지 않은 살짝구운재래김 5매×12봉',type:'무조미김 · 실속 구성',filter:'jaerae',price:18000,image:'./products/lightly-roasted-jaerae-12.webp',desc:'김 본연의 맛을 부담 없이 즐기는 살짝 구운 재래김 12봉입니다.',features:['담백한 살짝 구운 김','5매씩 12봉','소가족용으로 추천']}
];

const data=Object.fromEntries(products.map(p=>[p.id,p]));
const won=n=>`${n.toLocaleString('ko-KR')}원`;
const cart=new Map();
const modal=document.querySelector('.product-modal');
const loginModal=document.querySelector('.login-modal');
const drawer=document.querySelector('.drawer');
const shade=document.querySelector('.shade');
const toast=document.querySelector('.toast');
const grid=document.querySelector('#product-grid');
let selected=null,timer;

function message(text){toast.textContent=text;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),2300)}

function card(p,index){return `<article class="card appear" data-id="${p.id}" data-filter="${p.filter}"><button class="photo" aria-label="${p.name} 상세 보기"><i class="${index%3===1?'teal':index%3===2?'yellow':''}">${index<4?'BEST':'SHOP'}</i><img src="${p.image}" alt="대천우정김 ${p.name}" loading="lazy"><span>상세 보기</span></button><div class="card-copy"><small>${p.type}</small><h3>${p.name}</h3><p>${p.desc}</p><div><strong>${won(p.price)}</strong><button class="add" aria-label="${p.name} 장바구니 담기">담기</button></div></div></article>`}

function renderProducts(filter='all'){
  const list=filter==='all'?products:products.filter(p=>p.filter===filter);
  grid.innerHTML=list.map(card).join('');
  grid.querySelectorAll('.card').forEach(cardEl=>{
    const id=cardEl.dataset.id;
    cardEl.querySelector('.photo').onclick=()=>detail(id);
    cardEl.querySelector('.add').onclick=()=>add(id);
  });
  requestAnimationFrame(()=>grid.querySelectorAll('.appear').forEach(x=>x.classList.add('show')));
}

function detail(id){const p=data[id];if(!p)return;selected=id;modal.querySelector('.modal-photo img').src=p.image;modal.querySelector('.modal-photo img').alt=`대천우정김 ${p.name}`;modal.querySelector('.modal-copy>small').textContent=p.type;modal.querySelector('.modal-copy h2').textContent=p.name;modal.querySelector('.modal-copy>p').textContent=p.desc;modal.querySelector('.modal-copy ul').innerHTML=p.features.map(x=>`<li>${x}</li>`).join('');modal.querySelector('.price').textContent=won(p.price);modal.showModal()}
function add(id){const p=data[id];if(!p)return;cart.set(id,(cart.get(id)||0)+1);renderCart();message(`${p.name}을 장바구니에 담았습니다.`)}
function renderCart(){const count=[...cart.values()].reduce((a,b)=>a+b,0),total=[...cart].reduce((sum,[id,q])=>sum+data[id].price*q,0),list=document.querySelector('.cart-items');document.querySelector('.cart-open em').textContent=count;document.querySelector('.summary strong').textContent=won(total);if(!count){list.innerHTML='<div class="empty">담긴 상품이 없습니다.<br>대천우정김 상품을 둘러보세요.</div>';return}list.innerHTML=[...cart].map(([id,q])=>{const p=data[id];return `<div class="cart-item"><img src="${p.image}" alt=""><div><b>${p.name}</b><small>${won(p.price)} · ${q}개</small></div><button data-remove="${id}">삭제</button></div>`}).join('');list.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart.delete(b.dataset.remove);renderCart()})}
function openCart(){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');shade.hidden=false;document.body.classList.add('lock')}
function closeCart(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');shade.hidden=true;document.body.classList.remove('lock')}

document.querySelectorAll('.filters button').forEach(button=>button.onclick=()=>{document.querySelectorAll('.filters button').forEach(x=>x.classList.remove('active'));button.classList.add('active');renderProducts(button.dataset.filter)});
document.querySelector('.product-modal .x').onclick=()=>modal.close();
document.querySelector('.modal-add').onclick=()=>selected&&add(selected);
document.querySelector('.modal-buy').onclick=()=>{if(selected)add(selected);modal.close();openCart()};
modal.onclick=e=>e.target===modal&&modal.close();
document.querySelector('.cart-open').onclick=openCart;
document.querySelector('.drawer-x').onclick=closeCart;
shade.onclick=closeCart;
document.querySelector('.checkout-demo').onclick=()=>message('운영 서버 연결 후 주문·결제가 진행됩니다.');

document.querySelector('.login-open').onclick=()=>loginModal.showModal();
document.querySelector('.login-x').onclick=()=>loginModal.close();
loginModal.onclick=e=>e.target===loginModal&&loginModal.close();
document.querySelectorAll('[data-social]').forEach(button=>button.onclick=()=>{const consent=document.querySelector('.consent input');if(!consent.checked){message('약관과 개인정보 수집·이용에 먼저 동의해 주세요.');return}message(`${button.dataset.social} 로그인은 운영 서버에서 실제 연결됩니다.`)});
document.querySelector('.staff-login .btn').onclick=()=>message('관리자 로그인은 운영 서버와 DB 연결 후 작동합니다.');

const chatPanel=document.querySelector('.chat-panel');
const chatBody=document.querySelector('.chat-body');
function openChat(){chatPanel.hidden=false;document.querySelector('.chat-form input').focus()}
function closeChat(){chatPanel.hidden=true}
function chatReply(text){const user=document.createElement('div');user.className='bubble user';user.textContent=text;chatBody.appendChild(user);const reply=document.createElement('div');reply.className='bubble bot';const lower=text.toLowerCase();reply.textContent=lower.includes('배송')?'결제 확인 후 순차 출고됩니다. 주문번호를 남겨주시면 운영 서버에서 상담원이 배송 상태를 확인해 드립니다.':lower.includes('선물')?'선물세트는 4박스·5박스·혼합 구성으로 준비되어 있습니다. 수량과 희망 도착일을 남겨주세요.':lower.includes('추천')?'가볍게 시작하려면 재래김 6봉, 매일 가족 식탁에는 20봉, 도시락에는 9절 24봉 구성을 추천합니다.':'문의가 접수되었습니다. 운영 서버에서는 상담원이 같은 채팅방에서 이어서 답변합니다.';setTimeout(()=>{chatBody.appendChild(reply);chatBody.scrollTop=chatBody.scrollHeight},450);chatBody.scrollTop=chatBody.scrollHeight}
document.querySelector('.chat-launch').onclick=openChat;
document.querySelectorAll('.chat-cta').forEach(x=>x.onclick=openChat);
document.querySelector('.chat-x').onclick=closeChat;
document.querySelectorAll('.quick button').forEach(x=>x.onclick=()=>chatReply(x.textContent));
document.querySelector('.chat-form').onsubmit=e=>{e.preventDefault();const input=e.currentTarget.querySelector('input');const text=input.value.trim();if(!text)return;input.value='';chatReply(text)};

const hamb=document.querySelector('.hamb'),nav=document.querySelector('nav');hamb.onclick=()=>{const open=nav.classList.toggle('open');hamb.setAttribute('aria-expanded',open)};nav.querySelectorAll('a').forEach(a=>a.onclick=()=>{nav.classList.remove('open');hamb.setAttribute('aria-expanded','false')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))closeCart()});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');observer.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.appear').forEach(x=>observer.observe(x));
document.querySelector('#year').textContent=new Date().getFullYear();
renderProducts();renderCart();
