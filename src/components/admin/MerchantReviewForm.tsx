'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveMerchantPolicy } from '@/actions/merchant-policy';
import type { MerchantPolicy } from '@/lib/merchant-policy-rules';

export default function MerchantReviewForm({ policy, published }: { policy: MerchantPolicy; published: MerchantPolicy | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveMerchantPolicy, { ok: false, message: '' });
  useEffect(() => { if (state.ok) router.refresh(); }, [state, router]);
  return <form action={action} className="card space-y-6 p-6">
    <input type="hidden" name="expectedRevision" value={policy.revision} />
    <div><h2 className="text-lg font-bold">배송·반품 운영정책</h2><p className="mt-2 text-sm leading-6 text-gim-500">실제 운영 기준을 확인해서 입력하세요. 미확인 출고기간·운송비를 임의로 채우지 않았습니다. 숫자 0원은 무료인 경우에만 입력합니다.</p></div>
    <div className="grid gap-3 rounded-xl border border-gim-100 p-4 text-sm sm:grid-cols-2">
      <div><p className="text-xs text-gim-500">편집본 상태</p><p className="mt-1 font-semibold">{policy.revision === 'unconfirmed' ? '아직 저장하지 않음' : policy.revision === published?.revision ? '현재 공개본과 동일' : '미공개 초안'}</p></div>
      <div><p className="text-xs text-gim-500">현재 고객 공개 상태</p><p className="mt-1 font-semibold">{published ? '마지막으로 확인한 정책 공개 중' : '공개한 정책 없음'}</p></div>
      <p className="text-xs leading-6 text-gim-500 sm:col-span-2">초안을 저장해도 기존 고객 공개본은 유지됩니다. 변경 내용을 고객에게 반영하려면 아래 공개 확인을 선택해 저장하세요.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {([
        ['dispatchDays', '결제 확인 후 출고 준비 (영업일 이내)', 1, 60],
        ['deliveryMinDays', '출고 후 배송기간 최소 (영업일)', 1, 60],
        ['deliveryMaxDays', '출고 후 배송기간 최대 (영업일)', 1, 60],
        ['returnFee', '기본 반품 운송비 (원)', 0, 100000],
        ['exchangeFee', '교환 왕복 운송비 (원)', 0, 200000],
      ] as const).map(([name, label, min, max]) => <label key={name} className="block text-xs font-semibold text-gim-700">{label}<input name={name} type="number" min={min} max={max} step={1} defaultValue={policy[name] ?? ''} className="input mt-2" placeholder="운영자 확인 후 입력" /></label>)}
    </div>
    <label className="block text-sm font-semibold">반품지 주소<input name="returnAddress" maxLength={250} defaultValue={policy.returnAddress} className="input mt-2" placeholder="회수 가능한 실제 주소" /></label>
    <label className="block text-sm font-semibold">추가 배송 안내<textarea name="shippingNote" maxLength={800} rows={3} defaultValue={policy.shippingNote} className="input mt-2" placeholder="연휴·예약상품·도서산간 안내 등 확인된 내용만 입력" /></label>
    <div className="space-y-3 rounded-xl bg-gim-50 p-5 text-sm">
      <label className="flex items-start gap-3"><input type="checkbox" name="confirmed" className="mt-1 h-4 w-4" /><span><strong>이번 입력 내용을 확인했으며 고객 공개본에 반영합니다.</strong><small className="mt-1 block text-gim-500">체크하지 않으면 변경 내용만 초안으로 저장하며, 기존에 공개한 기간·비용·반품지는 그대로 유지합니다.</small></span></label>
      <label className="flex items-start gap-3"><input type="checkbox" name="confirmDraftOnly" className="mt-1 h-4 w-4" /><span>미확정 초안으로 저장하는 경우임을 확인했습니다.</span></label>
      <p className="text-xs leading-6 text-gim-500">아래 내부 점검 결과는 초안 저장 시에도 심사 준비 상태에 반영됩니다.</p>
      <label className="flex items-start gap-3"><input type="checkbox" name="businessVerified" defaultChecked={policy.businessVerified} className="mt-1 h-4 w-4" /><span>사업자등록증 원본과 하단 상호·대표자·사업자번호·주소·연락처를 대조했습니다.</span></label>
      <label className="flex items-start gap-3"><input type="checkbox" name="privacyVerified" defaultChecked={policy.privacyVerified} className="mt-1 h-4 w-4" /><span>개인정보처리방침의 실제 수탁업체·국외 처리·보관기간과 서비스 동작을 별도로 검토했습니다. 체크만으로 검토가 대체되지는 않습니다.</span></label>
    </div>
    {state.message && <p role="status" className={'rounded-xl p-4 text-sm ' + (state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-800')}>{state.message}</p>}
    <button disabled={pending} className="btn-primary">{pending ? '저장 중…' : '정책 저장'}</button>
  </form>;
}
