'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDraftProduct } from '@/actions/admin';
import { cn } from '@/lib/utils';

type Category = { id: string; name: string };

type Parsed = {
  url: string;
  ok: boolean;
  message?: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  picked: string[];
  saved?: string[]; // 서버에 복사된 이미지 경로
  createdId?: string;
  busy?: boolean;
};

export default function VendorImport({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [raw, setRaw] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [items, setItems] = useState<Parsed[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');

  const urls = raw
    .split(/\s*[\n,]\s*/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u));

  async function parseAll() {
    if (urls.length === 0) return;
    setRunning(true);
    setItems([]);

    const out: Parsed[] = [];
    for (let i = 0; i < urls.length; i++) {
      setProgress(`${i + 1} / ${urls.length} 분석 중…`);
      try {
        const res = await fetch('/api/admin/vendor-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urls[i] }),
        });
        const json = await res.json();
        out.push(
          json.ok
            ? {
                url: urls[i],
                ok: true,
                title: json.title ?? '',
                description: json.description ?? '',
                price: json.price ?? 0,
                images: json.images ?? [],
                picked: (json.images ?? []).slice(0, 5),
              }
            : {
                url: urls[i],
                ok: false,
                message: json.message ?? '분석 실패',
                title: '',
                description: '',
                price: 0,
                images: [],
                picked: [],
              }
        );
      } catch (e) {
        out.push({
          url: urls[i],
          ok: false,
          message: e instanceof Error ? e.message : '네트워크 오류',
          title: '',
          description: '',
          price: 0,
          images: [],
          picked: [],
        });
      }
      setItems([...out]);
    }

    setProgress('');
    setRunning(false);
  }

  function patch(i: number, p: Partial<Parsed>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }

  async function makeProduct(i: number) {
    const it = items[i];
    if (!it || it.picked.length === 0) return;
    patch(i, { busy: true });

    try {
      // 1) 이미지를 서버로 복사
      const res = await fetch('/api/admin/image-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: it.picked }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? '이미지 저장 실패');

      const saved: string[] = (json.saved ?? []).map((x: { url: string }) => x.url);
      if (saved.length === 0) throw new Error('가져올 수 있는 이미지가 없습니다.');

      // 2) 상품 초안 생성
      const created = await createDraftProduct({
        name: it.title || '이름 없는 상품',
        price: it.price,
        categoryId,
        imageUrls: saved,
        sourceUrl: it.url,
        summary: it.description.slice(0, 120),
      });

      if (!created.ok) throw new Error(created.message);
      patch(i, { saved, createdId: created.id, busy: false, message: created.message });
      router.refresh();
    } catch (e) {
      patch(i, { busy: false, message: e instanceof Error ? e.message : '오류가 발생했습니다.' });
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <label className="label">상품 페이지 주소 (여러 개는 줄바꿈으로 구분)</label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          placeholder={'https://prod.danawa.com/info/?pcode=...\nhttps://www.coupang.com/vp/products/...\nhttps://smartstore.naver.com/...'}
          className="input font-mono text-xs"
        />

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">등록할 카테고리</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input w-52 py-2"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={parseAll}
            disabled={running || urls.length === 0}
            className="btn-primary px-6"
          >
            {running ? progress || '분석 중…' : `${urls.length}개 주소 분석하기`}
          </button>
          {urls.length === 0 && raw.trim() && (
            <span className="text-xs text-point">http/https 로 시작하는 주소를 넣어주세요.</span>
          )}
        </div>
      </div>

      {items.map((it, i) => (
        <div key={it.url + i} className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gim-100 pb-4">
            <div className="min-w-0">
              <p className="truncate text-[11px] text-gim-400">{it.url}</p>
              {it.ok ? (
                <>
                  <input
                    value={it.title}
                    onChange={(e) => patch(i, { title: e.target.value })}
                    className="input mt-2 font-semibold"
                    placeholder="상품명"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gim-500">판매가</span>
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) => patch(i, { price: Number(e.target.value) || 0 })}
                      className="input w-36 py-1.5 text-sm"
                    />
                    <span className="text-xs text-gim-400">원</span>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-point">{it.message}</p>
              )}
            </div>

            {it.ok && (
              <div className="text-right">
                {it.createdId ? (
                  <a href={`/admin/products/${it.createdId}`} className="btn-outline btn-sm">
                    만든 상품 열기 →
                  </a>
                ) : (
                  <button
                    onClick={() => makeProduct(i)}
                    disabled={it.busy || it.picked.length === 0 || !categoryId}
                    className="btn-primary btn-sm px-5"
                  >
                    {it.busy ? '만드는 중…' : `선택 ${it.picked.length}장으로 상품 만들기`}
                  </button>
                )}
                {it.message && it.createdId && (
                  <p className="mt-1.5 text-[11px] text-sea-700">{it.message}</p>
                )}
                {it.message && !it.createdId && !it.busy && (
                  <p className="mt-1.5 text-[11px] text-point">{it.message}</p>
                )}
              </div>
            )}
          </div>

          {it.ok && (
            <>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gim-500">
                  이미지 후보 {it.images.length}장 · 선택 {it.picked.length}장
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => patch(i, { picked: it.images.slice(0, 8) })}
                    className="btn-outline btn-sm"
                  >
                    앞 8장 선택
                  </button>
                  <button onClick={() => patch(i, { picked: [] })} className="btn-outline btn-sm">
                    선택 해제
                  </button>
                </div>
              </div>

              <div className="mt-3 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-gim-100 p-3 sm:grid-cols-8">
                {it.images.map((u) => {
                  const on = it.picked.includes(u);
                  return (
                    <button
                      key={u}
                      onClick={() =>
                        patch(i, {
                          picked: on ? it.picked.filter((x) => x !== u) : [...it.picked, u],
                        })
                      }
                      className={cn(
                        'relative aspect-square overflow-hidden rounded-lg border-2',
                        on ? 'border-sea-700' : 'border-transparent opacity-70 hover:opacity-100'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                      {on && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sea-700 text-[10px] text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
                {it.images.length === 0 && (
                  <p className="col-span-full py-8 text-center text-xs text-gim-400">
                    이미지를 찾지 못했습니다. (로그인이 필요한 페이지이거나 스크립트로 그려지는 경우)
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
