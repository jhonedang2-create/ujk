'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveBanner, deleteBanner, type Res } from '@/actions/admin';

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  sortOrder: number;
  isActive: boolean;
};

const initial: Res = { ok: false, message: '' };

export default function BannerManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Banner | null>(null);
  // null = '아직 손대지 않음', '' = '사용자가 지움' 을 구분해야 지우기가 동작합니다
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(saveBanner, initial);
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);

  const current = imageUrl ?? editing?.imageUrl ?? '';

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('files', files[0]);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.ok && json.saved?.[0]) setImageUrl(json.saved[0]);
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {banners.map((b) => (
          <div key={b.id} className="card flex gap-4 p-4">
            <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-gim-100">
              {b.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-bold">
                {b.title}
                <span className="badge bg-gim-100 text-gim-600">{b.position}</span>
                {!b.isActive && <span className="badge bg-gim-100 text-gim-500">숨김</span>}
              </p>
              <p className="mt-0.5 text-xs text-gim-500">{b.subtitle}</p>
              <p className="mt-0.5 truncate text-[11px] text-gim-400">{b.linkUrl || '링크 없음'}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button onClick={() => { setEditing(b); setImageUrl(null); }} className="btn-outline btn-sm">수정</button>
              <button
                onClick={() => {
                  if (!confirm('삭제하시겠습니까?')) return;
                  start(async () => { await deleteBanner(b.id); router.refresh(); });
                }}
                className="btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-point hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <p className="card py-14 text-center text-sm text-gim-400">등록된 배너가 없습니다.</p>
        )}
      </div>

      <form key={editing?.id ?? 'new'} action={formAction} className="card h-fit p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">{editing ? '배너 수정' : '배너 추가'}</h2>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setImageUrl(null); }} className="text-xs text-gim-400 hover:text-sea-700">
              새로 추가
            </button>
          )}
        </div>

        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="imageUrl" value={current} />

        <div className="space-y-4">
          <div>
            <label className="label">배너 이미지</label>
            {current && (
              <div className="mb-2 h-28 overflow-hidden rounded-lg bg-gim-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <label className="btn-outline btn-sm w-full cursor-pointer">
              {busy ? '업로드 중…' : '이미지 업로드'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files)} />
            </label>
            <input
              value={current}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="또는 이미지 URL 직접 입력"
              className="input mt-2 text-xs"
            />
          </div>
          <div>
            <label className="label">제목 *</label>
            <input name="title" required defaultValue={editing?.title} className="input" />
          </div>
          <div>
            <label className="label">부제목</label>
            <input name="subtitle" defaultValue={editing?.subtitle} className="input" />
          </div>
          <div>
            <label className="label">링크 URL</label>
            <input name="linkUrl" defaultValue={editing?.linkUrl} className="input" placeholder="/products" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">위치</label>
              <select name="position" defaultValue={editing?.position ?? 'MAIN'} className="input">
                <option value="MAIN">메인 대문</option>
                <option value="SUB">서브</option>
                <option value="POPUP">팝업</option>
              </select>
            </div>
            <div>
              <label className="label">정렬</label>
              <input name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-sea-700" />
            노출하기
          </label>
        </div>

        {state.message && (
          <p className={`mt-4 rounded-lg px-4 py-2.5 text-sm ${state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'}`}>
            {state.message}
          </p>
        )}

        <button disabled={pending} className="btn-primary mt-5 w-full">
          {pending ? '저장 중…' : '저장'}
        </button>
      </form>
    </div>
  );
}
