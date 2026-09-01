'use client';

import { useActionState, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveMessageSetting,
  saveTemplate,
  sendDirect,
  sendCampaign,
  previewTargets,
  testMessageProvider,
  type Res,
} from '@/actions/messaging';
import {
  byteLength,
  decorateAd,
  checkAdCompliance,
  isNightTime,
  messageTypeOf,
  parseKstLocal,
  SMS_LIMIT,
  LMS_LIMIT,
  type AdOptions,
} from '@/lib/messaging/compliance';
import { TEMPLATE_VARS_CLIENT } from '@/lib/messaging/vars';
import { cn, num } from '@/lib/utils';

type Setting = {
  provider: string;
  hasKey: boolean;
  senderNumber: string;
  pfId: string;
  channelName: string;
  autoOnPaid: boolean;
  autoOnDeposit: boolean;
  autoOnShipping: boolean;
  autoOnDelivered: boolean;
  autoOnCancelled: boolean;
  adPrefix: string;
  adOptOutText: string;
  adOptOutUrl: string;
};

type Template = {
  code: string;
  name: string;
  kakaoTemplateId: string;
  smsText: string;
  description: string;
  isActive: boolean;
};

type CampaignRow = {
  id: string;
  name: string;
  body: string;
  isAd: boolean;
  targetType: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
  blocked: number;
  scheduledAt: string | null;
  createdAt: string;
};

type LogRow = {
  id: string;
  to: string;
  name: string;
  type: string;
  status: string;
  blockReason: string;
  errorMessage: string;
  isAd: boolean;
  body: string;
  at: string;
};

const initial: Res = { ok: false, message: '' };

const TABS = [
  ['send', '문자 보내기'],
  ['campaign', '홍보 대량발송'],
  ['auto', '주문 자동알림'],
  ['logs', '발송 이력'],
  ['setting', '발송 설정'],
] as const;
type Tab = (typeof TABS)[number][0];

const TARGETS = [
  ['ALL', '전체 회원'],
  ['BUYER', '최근 90일 구매 회원'],
  ['NONBUYER', '구매 이력 없는 회원'],
  ['GRADE', '특정 등급'],
  ['MANUAL', '번호 직접 입력'],
] as const;

export default function MessageManager({
  isOwner,
  agreedCount,
  defaultOptOutUrl,
  senderName,
  senderTel,
  setting,
  templates,
  campaigns,
  logs,
}: {
  isOwner: boolean;
  agreedCount: number;
  defaultOptOutUrl: string;
  senderName: string;
  senderTel: string;
  setting: Setting;
  templates: Template[];
  campaigns: CampaignRow[];
  logs: LogRow[];
}) {
  const [tab, setTab] = useState<Tab>('send');

  const adOpts: AdOptions = {
    prefix: setting.adPrefix || '(광고)',
    optOutText: setting.adOptOutText || '무료수신거부 ',
    optOutUrl: setting.adOptOutUrl || defaultOptOutUrl,
    senderName,
    senderContact: senderTel,
  };

  const ready = setting.hasKey && !!setting.senderNumber;

  return (
    <div className="space-y-5">
      {!ready && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          <p className="font-bold">발송 설정이 아직 안 끝났습니다</p>
          <p className="mt-1">
            <strong>발송 설정</strong> 탭에서 API 키와 발신번호를 먼저 등록하세요.
            발신번호는 통신사에 사전등록된 번호만 쓸 수 있습니다 (전기통신사업법).
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              tab === t
                ? 'bg-sea-800 text-white'
                : 'border border-gim-200 bg-white text-gim-600 hover:bg-gim-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'send' && <DirectSend adOpts={adOpts} ready={ready} />}
      {tab === 'campaign' && (
        <CampaignSend adOpts={adOpts} ready={ready} agreedCount={agreedCount} campaigns={campaigns} />
      )}
      {tab === 'auto' && <AutoTemplates templates={templates} setting={setting} />}
      {tab === 'logs' && <LogTable logs={logs} />}
      {tab === 'setting' && (
        <SettingForm setting={setting} isOwner={isOwner} defaultOptOutUrl={defaultOptOutUrl} />
      )}
    </div>
  );
}

/* ── 개별 발송 ─────────────────────────────── */

function DirectSend({ adOpts, ready }: { adOpts: AdOptions; ready: boolean }) {
  const [state, action, pending] = useActionState(sendDirect, initial);
  const [body, setBody] = useState('');
  const [isAd, setIsAd] = useState(false);
  const [to, setTo] = useState('');

  const preview = isAd ? decorateAd(body, adOpts) : body;
  const bytes = byteLength(preview);
  const type = messageTypeOf(preview);
  const issues = isAd ? checkAdCompliance(preview, adOpts) : [];
  const count = to.split(/[\s,;\n]+/).filter((x) => x.replace(/\D/g, '').length >= 10).length;

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="card p-6">
        <div className="space-y-4">
          <div>
            <label className="label">받는 번호 * (여러 명은 줄바꿈이나 쉼표로 구분)</label>
            <textarea
              name="to"
              rows={3}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={'010-1234-5678\n010-9876-5432'}
              className="input font-mono text-sm"
            />
            {count > 0 && <p className="mt-1 text-xs text-gim-500">{count}명</p>}
          </div>

          <div>
            <label className="label">내용 *</label>
            <textarea
              name="body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input"
              placeholder="보낼 내용을 입력하세요."
            />
            <p className="mt-1.5 flex items-center gap-2 text-xs">
              <span className={cn(bytes > LMS_LIMIT ? 'text-point' : 'text-gim-500')}>
                {bytes} / {LMS_LIMIT} 바이트
              </span>
              <span className="badge bg-gim-100 text-gim-600">{type}</span>
              {bytes > SMS_LIMIT && bytes <= LMS_LIMIT && (
                <span className="text-gim-400">90바이트를 넘어 장문(LMS)으로 나갑니다</span>
              )}
            </p>
          </div>

          <label className="flex items-start gap-2 rounded-lg bg-gim-50 p-4 text-sm">
            <input
              type="checkbox"
              name="isAd"
              checked={isAd}
              onChange={(e) => setIsAd(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-sea-700"
            />
            <span>
              <strong>광고·홍보성 내용입니다</strong>
              <span className="mt-0.5 block text-[11px] leading-5 text-gim-500">
                켜면 (광고) 표기와 무료 수신거부 안내가 자동으로 붙고, 수신동의한 회원에게만 나갑니다.
                할인·이벤트·신제품 안내는 모두 광고입니다.
              </span>
            </span>
          </label>
        </div>

        {state.message && (
          <p
            className={cn(
              'mt-4 rounded-lg px-4 py-3 text-sm leading-6',
              state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
            )}
          >
            {state.message}
          </p>
        )}

        <button disabled={pending || !ready || !body || !to} className="btn-primary mt-5 px-8">
          {pending ? '보내는 중…' : `${count > 0 ? `${count}명에게 ` : ''}보내기`}
        </button>
      </div>

      <Preview preview={preview} issues={issues} isAd={isAd} />
    </form>
  );
}

/* ── 대량 발송 ─────────────────────────────── */

function CampaignSend({
  adOpts,
  ready,
  agreedCount,
  campaigns,
}: {
  adOpts: AdOptions;
  ready: boolean;
  agreedCount: number;
  campaigns: CampaignRow[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(sendCampaign, initial);
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<string>('ALL');
  const [targetDetail, setTargetDetail] = useState('');
  const [schedule, setSchedule] = useState('');
  const [target, setTarget] = useState<{ total: number; agreed: number } | null>(null);
  const [checking, start] = useTransition();

  const preview = decorateAd(body, adOpts);
  const bytes = byteLength(preview);
  // 서버와 같은 기준(KST)으로 판정해야 미리보기와 실제 발송 결과가 일치합니다
  const at = (schedule ? parseKstLocal(schedule) : null) ?? new Date();
  const issues = checkAdCompliance(preview, adOpts, at);
  const errors = issues.filter((i) => i.level === 'error');
  const night = isNightTime();

  return (
    <div className="space-y-5">
      {night && !schedule && (
        <div className="rounded-xl border border-point/30 bg-red-50 p-4 text-xs leading-6 text-red-800">
          <p className="font-bold">지금은 광고 전송 금지 시간입니다 (21시~08시)</p>
          <p className="mt-1">
            정보통신망법 제50조제3항에 따라 야간 광고 전송에는 별도의 사전 동의가 필요합니다.
            아래에서 <strong>예약 발송 시각</strong>을 내일 오전 8시 이후로 지정해 주세요.
          </p>
        </div>
      )}

      <form action={action} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="card p-6">
          <div className="space-y-4">
            <div>
              <label className="label">캠페인 이름 * (내부 관리용)</label>
              <input name="name" required placeholder="추석 선물세트 사전예약 안내" className="input" />
            </div>

            <div>
              <label className="label">보낼 대상 *</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {TARGETS.map(([t, label]) => (
                  <label
                    key={t}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition',
                      targetType === t ? 'border-sea-600 bg-sea-50' : 'border-gim-200 hover:bg-gim-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value={t}
                      checked={targetType === t}
                      onChange={() => {
                        setTargetType(t);
                        setTarget(null);
                      }}
                      className="h-4 w-4 accent-sea-700"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {targetType === 'GRADE' && (
              <div>
                <label className="label">등급</label>
                <select name="targetDetail" value={targetDetail} onChange={(e) => setTargetDetail(e.target.value)} className="input">
                  <option value="">선택하세요</option>
                  <option value="BASIC">일반</option>
                  <option value="SILVER">실버</option>
                  <option value="GOLD">골드</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            )}

            {targetType === 'MANUAL' && (
              <div>
                <label className="label">번호 목록 (줄바꿈 구분)</label>
                <textarea
                  name="targetDetail"
                  rows={5}
                  value={targetDetail}
                  onChange={(e) => setTargetDetail(e.target.value)}
                  className="input font-mono text-sm"
                />
              </div>
            )}
            {targetType !== 'GRADE' && targetType !== 'MANUAL' && (
              <input type="hidden" name="targetDetail" value="" />
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gim-50 p-4">
              <button
                type="button"
                disabled={checking}
                onClick={() =>
                  start(async () => {
                    const r = await previewTargets(targetType, targetDetail);
                    setTarget(r);
                  })
                }
                className="btn-outline btn-sm"
              >
                {checking ? '확인 중…' : '대상 인원 확인'}
              </button>
              {target && (
                <p className="text-xs text-gim-600">
                  조건 대상 <strong>{num(target.total)}명</strong> 중 수신동의{' '}
                  <strong className="text-sea-700">{num(target.agreed)}명</strong>에게 발송됩니다.
                  {target.total > target.agreed && (
                    <span className="ml-1 text-point">
                      미동의 {num(target.total - target.agreed)}명은 법적으로 제외됩니다.
                    </span>
                  )}
                </p>
              )}
              {!target && (
                <p className="text-xs text-gim-400">
                  현재 마케팅 수신동의 회원 {num(agreedCount)}명
                </p>
              )}
            </div>

            <div>
              <label className="label">내용 *</label>
              <textarea
                name="body"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={'#{이름}님, 추석 선물세트 사전예약이 시작되었습니다.\n지금 주문하시면 15% 할인!'}
                className="input"
              />
              <p className="mt-1.5 text-xs text-gim-500">
                {bytes} / {LMS_LIMIT} 바이트 · <code className="rounded bg-gim-100 px-1">#{'{이름}'}</code> 을 넣으면 이름이 채워집니다.
              </p>
            </div>

            <div>
              <label className="label">예약 발송 (비우면 즉시 발송)</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="input max-w-xs"
              />
            </div>

            <input type="hidden" name="isAd" value="on" />
          </div>

          {state.message && (
            <p
              className={cn(
                'mt-4 rounded-lg px-4 py-3 text-sm leading-6',
                state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
              )}
            >
              {state.message}
            </p>
          )}

          <button
            disabled={pending || !ready || !body || errors.length > 0}
            className="btn-point mt-5 px-8"
            onClick={(e) => {
              if (!confirm('정말 발송할까요? 발송된 문자는 취소할 수 없습니다.')) e.preventDefault();
            }}
          >
            {pending ? '발송 중…' : schedule ? '예약 발송하기' : '지금 발송하기'}
          </button>
          {errors.length > 0 && (
            <p className="mt-2 text-xs text-point">위 항목을 해결해야 발송할 수 있습니다.</p>
          )}
        </div>

        <Preview preview={preview} issues={issues} isAd />
      </form>

      <div className="card overflow-x-auto">
        <p className="border-b border-gim-100 px-5 py-4 text-sm font-bold">지난 발송</p>
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">캠페인</th>
              <th className="px-4 py-3 text-center font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">대상</th>
              <th className="px-4 py-3 text-right font-medium">발송</th>
              <th className="px-4 py-3 text-right font-medium">제외</th>
              <th className="px-4 py-3 text-left font-medium">일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gim-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="line-clamp-1 text-[11px] text-gim-400">{c.body}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      'badge',
                      c.status === 'DONE'
                        ? 'bg-sea-50 text-sea-800'
                        : c.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gim-100 text-gim-500'
                    )}
                  >
                    {c.status === 'DONE' ? '완료' : c.status === 'FAILED' ? '실패' : c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{c.total}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-sea-700">{c.sent}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gim-400">{c.blocked}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gim-500">
                  {c.scheduledAt ?? c.createdAt}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="py-14 text-center text-gim-400">
                  발송 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 미리보기 ─────────────────────────────── */

function Preview({
  preview,
  issues,
  isAd,
}: {
  preview: string;
  issues: { level: string; message: string }[];
  isAd: boolean;
}) {
  return (
    <aside className="h-fit space-y-4 lg:sticky lg:top-6">
      <div className="card p-5">
        <p className="mb-3 text-sm font-bold">실제 받는 화면</p>
        <div className="rounded-2xl bg-gim-100 p-4">
          <div className="max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-white p-4 text-[13px] leading-6 text-gim-800 shadow-sm">
            {preview || <span className="text-gim-300">내용을 입력하면 여기 보입니다.</span>}
          </div>
        </div>
      </div>

      {isAd && (
        <div className="card p-5">
          <p className="mb-3 text-sm font-bold">법규 점검</p>
          {issues.length === 0 ? (
            <p className="rounded-lg bg-green-50 px-3.5 py-2.5 text-xs text-green-800">
              ✓ 표기 요건을 모두 충족합니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {issues.map((i, idx) => (
                <li
                  key={idx}
                  className={cn(
                    'rounded-lg px-3.5 py-2.5 text-xs leading-5',
                    i.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
                  )}
                >
                  {i.level === 'error' ? '✕ ' : '! '}
                  {i.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-5 text-gim-400">
            정보통신망법 제50조 · 위반 시 항목별 3천만원 이하 과태료
          </p>
        </div>
      )}
    </aside>
  );
}

/* ── 자동 알림 템플릿 ───────────────────────── */

function AutoTemplates({ templates, setting }: { templates: Template[]; setting: Setting }) {
  const [state, action, pending] = useActionState(saveTemplate, initial);
  const [open, setOpen] = useState<string | null>(null);

  const AUTO_MAP: Record<string, { label: string; on: boolean }> = {
    ORDER_PAID: { label: '결제완료 시', on: setting.autoOnPaid },
    DEPOSIT_WAIT: { label: '무통장 주문 시', on: setting.autoOnDeposit },
    SHIPPING: { label: '송장 등록 시', on: setting.autoOnShipping },
    DELIVERED: { label: '배송완료 시', on: setting.autoOnDelivered },
    CANCELLED: { label: '주문 취소 시', on: setting.autoOnCancelled },
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sea-200 bg-sea-50 p-4 text-xs leading-6 text-sea-900">
        <strong>주문 안내는 광고가 아닙니다.</strong> 거래 과정에서 생긴 정보 제공이라 수신동의 없이도
        보낼 수 있고 야간 제한도 없습니다. 다만 여기에 할인·이벤트 문구를 섞으면 그 순간 광고가 되니 넣지 마세요.
        <br />
        알림톡 템플릿 코드를 넣으면 카카오톡으로 나가고, 실패하면 문자로 자동 대체됩니다. 비워두면 문자만 나갑니다.
      </div>

      {templates.map((t) => {
        const auto = AUTO_MAP[t.code];
        const opened = open === t.code;
        return (
          <div key={t.code} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-gim-900">
                  {t.name}
                  {auto && (
                    <span
                      className={cn(
                        'badge',
                        auto.on ? 'bg-green-50 text-green-700' : 'bg-gim-100 text-gim-500'
                      )}
                    >
                      {auto.label} {auto.on ? '자동발송 켜짐' : '꺼짐'}
                    </span>
                  )}
                  {t.kakaoTemplateId ? (
                    <span className="badge bg-[#FEE500] text-[#191600]">알림톡</span>
                  ) : (
                    <span className="badge bg-gim-100 text-gim-600">문자만</span>
                  )}
                  {!t.isActive && <span className="badge bg-gim-100 text-gim-400">사용안함</span>}
                </p>
                <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-gim-500">
                  {t.smsText}
                </p>
              </div>
              <button onClick={() => setOpen(opened ? null : t.code)} className="btn-outline btn-sm">
                {opened ? '닫기' : '문구 수정'}
              </button>
            </div>

            {opened && (
              <form action={action} className="border-t border-gim-100 bg-gim-50 p-5">
                <input type="hidden" name="code" value={t.code} />
                <input type="hidden" name="name" value={t.name} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">알림톡 템플릿 코드</label>
                    <input
                      name="kakaoTemplateId"
                      defaultValue={t.kakaoTemplateId}
                      placeholder="비우면 문자로만 발송"
                      className="input bg-white font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-3 text-sm">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={t.isActive}
                        className="h-4 w-4 accent-sea-700"
                      />
                      이 알림 사용
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label">문구 *</label>
                  <textarea
                    name="smsText"
                    rows={7}
                    defaultValue={t.smsText}
                    className="input bg-white"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TEMPLATE_VARS_CLIENT.map(([k, desc]) => (
                      <span
                        key={k}
                        title={desc}
                        className="rounded bg-white px-2 py-1 font-mono text-[11px] text-gim-600 ring-1 ring-gim-200"
                      >
                        #{`{${k}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {state.message && (
                  <p
                    className={cn(
                      'mt-4 rounded-lg px-4 py-2.5 text-sm',
                      state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
                    )}
                  >
                    {state.message}
                  </p>
                )}

                <button disabled={pending} className="btn-primary mt-4 px-8">
                  {pending ? '저장 중…' : '저장'}
                </button>
              </form>
            )}
          </div>
        );
      })}

      {templates.length === 0 && (
        <p className="card py-16 text-center text-sm text-gim-400">
          템플릿이 없습니다. <code className="rounded bg-gim-100 px-1">npm run db:seed</code> 를 실행해 기본 문구를 넣어주세요.
        </p>
      )}
    </div>
  );
}

/* ── 이력 ─────────────────────────────────── */

function LogTable({ logs }: { logs: LogRow[] }) {
  const [filter, setFilter] = useState<'ALL' | 'SENT' | 'FAILED' | 'BLOCKED'>('ALL');
  const shown = useMemo(
    () => (filter === 'ALL' ? logs : logs.filter((l) => l.status === filter)),
    [logs, filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['ALL', `전체 ${logs.length}`],
            ['SENT', `성공 ${logs.filter((l) => l.status === 'SENT').length}`],
            ['FAILED', `실패 ${logs.filter((l) => l.status === 'FAILED').length}`],
            ['BLOCKED', `제외 ${logs.filter((l) => l.status === 'BLOCKED').length}`],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg px-3.5 py-2 text-xs font-semibold',
              filter === f ? 'bg-sea-800 text-white' : 'border border-gim-200 bg-white text-gim-600'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">일시</th>
              <th className="px-4 py-3 text-left font-medium">받는 사람</th>
              <th className="px-4 py-3 text-center font-medium">구분</th>
              <th className="px-4 py-3 text-center font-medium">결과</th>
              <th className="px-4 py-3 text-left font-medium">내용 / 사유</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {shown.map((l) => (
              <tr key={l.id} className="hover:bg-gim-50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gim-500">{l.at}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">{l.to}</span>
                  {l.name && <p className="text-[11px] text-gim-400">{l.name}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="badge bg-gim-100 text-gim-600">{l.type}</span>
                  {l.isAd && <span className="badge ml-1 bg-amber-50 text-amber-700">광고</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      'badge',
                      l.status === 'SENT'
                        ? 'bg-sea-50 text-sea-800'
                        : l.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gim-100 text-gim-500'
                    )}
                  >
                    {l.status === 'SENT' ? '성공' : l.status === 'FAILED' ? '실패' : '제외'}
                  </span>
                </td>
                <td className="max-w-[320px] px-4 py-3 text-xs text-gim-500">
                  {l.status === 'BLOCKED'
                    ? l.blockReason
                    : l.status === 'FAILED'
                      ? l.errorMessage
                      : <span className="line-clamp-2">{l.body}</span>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gim-400">
                  이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 설정 ─────────────────────────────────── */

function SettingForm({
  setting,
  isOwner,
  defaultOptOutUrl,
}: {
  setting: Setting;
  isOwner: boolean;
  defaultOptOutUrl: string;
}) {
  const [state, action, pending] = useActionState(saveMessageSetting, initial);
  const [testing, start] = useTransition();
  const [testResult, setTestResult] = useState('');

  if (!isOwner) {
    return (
      <p className="card py-16 text-center text-sm text-gim-400">
        발송 설정은 최고관리자만 볼 수 있습니다.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="card p-6">
        <h2 className="text-base font-bold">발송 업체 연결</h2>
        <p className="mt-1.5 text-xs leading-6 text-gim-500">
          <a href="https://solapi.com" target="_blank" rel="noreferrer" className="text-sea-700 underline">
            솔라피(SOLAPI)
          </a>
          에 가입하고 API Key/Secret 을 발급받아 넣으세요. 발신번호는 통신사에 사전등록된 번호만 쓸 수 있습니다.
          <br />
          알림톡을 쓰려면 카카오 비즈니스 채널을 만들고 발송대행사에 연결한 뒤 채널 ID(KA01PF…)를 넣으세요.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="provider" value="solapi" />
          <div>
            <label className="label">API Key</label>
            <input
              name="apiKey"
              placeholder={setting.hasKey ? '●●●●●  (변경할 때만 입력)' : ''}
              className="input font-mono text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label">API Secret</label>
            <input
              name="apiSecret"
              type="password"
              placeholder={setting.hasKey ? '●●●●●  (변경할 때만 입력)' : ''}
              className="input font-mono text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label">발신번호 *</label>
            <input
              name="senderNumber"
              defaultValue={setting.senderNumber}
              placeholder="041-000-0000"
              className="input"
            />
          </div>
          <div>
            <label className="label">카카오 채널 ID (알림톡용)</label>
            <input
              name="pfId"
              defaultValue={setting.pfId}
              placeholder="KA01PF…"
              className="input font-mono text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">카카오 채널명</label>
            <input
              name="channelName"
              defaultValue={setting.channelName}
              placeholder="@대천우정김"
              className="input max-w-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={testing || !setting.hasKey}
            onClick={() =>
              start(async () => {
                const r = await testMessageProvider();
                setTestResult(r.message);
              })
            }
            className="btn-outline btn-sm"
          >
            {testing ? '확인 중…' : '연결 확인 · 잔액 조회'}
          </button>
          {testResult && <span className="text-xs text-sea-700">{testResult}</span>}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-bold">자동 발송 스위치</h2>
        <p className="mt-1.5 text-xs text-gim-500">어떤 상황에 자동으로 문자를 보낼지 정합니다.</p>
        <div className="mt-4 space-y-2.5">
          {(
            [
              ['autoOnPaid', '결제가 완료됐을 때', setting.autoOnPaid],
              ['autoOnDeposit', '무통장 주문이 들어왔을 때 (입금 안내)', setting.autoOnDeposit],
              ['autoOnShipping', '송장을 등록했을 때 (발송 안내)', setting.autoOnShipping],
              ['autoOnDelivered', '배송완료로 바꿨을 때', setting.autoOnDelivered],
              ['autoOnCancelled', '주문이 취소됐을 때', setting.autoOnCancelled],
            ] as const
          ).map(([name, label, on]) => (
            <label key={name} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={name} defaultChecked={on} className="h-4 w-4 accent-sea-700" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-bold">광고 표기 (법정 필수)</h2>
        <p className="mt-1.5 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
          정보통신망법 제50조제4항에 따라 광고 문자에는 <strong>(광고) 표기</strong>,{' '}
          <strong>전송자 명칭·연락처</strong>, <strong>무료 수신거부 방법</strong>이 반드시 들어가야 합니다.
          아래 값이 발송 시 자동으로 붙습니다. 21시~08시 광고 전송 차단은 법정 의무라 끌 수 없습니다.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">앞머리 표기</label>
            <input name="adPrefix" defaultValue={setting.adPrefix || '(광고)'} className="input" />
            <p className="mt-1 text-[11px] text-gim-400">(광/고) 같은 변칙 표기는 불가</p>
          </div>
          <div>
            <label className="label">수신거부 안내 문구</label>
            <input
              name="adOptOutText"
              defaultValue={setting.adOptOutText || '무료수신거부 '}
              className="input"
            />
          </div>
          <div>
            <label className="label">수신거부 주소 / 번호</label>
            <input
              name="adOptOutUrl"
              defaultValue={setting.adOptOutUrl || defaultOptOutUrl}
              className="input text-sm"
            />
            <p className="mt-1 text-[11px] text-gim-400">
              자사몰 수신거부 페이지를 그대로 쓰면 됩니다
            </p>
          </div>
        </div>
      </div>

      {state.message && (
        <p
          className={cn(
            'rounded-lg px-4 py-3 text-sm',
            state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
          )}
        >
          {state.message}
        </p>
      )}

      <button disabled={pending} className="btn-primary px-10">
        {pending ? '저장 중…' : '설정 저장'}
      </button>
    </form>
  );
}
