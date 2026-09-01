'use client';

import { useActionState, useState } from 'react';
import { saveProduct, type Res } from '@/actions/admin';

type Category = { id: string; name: string };

export type ProductFormData = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  summary: string;
  description: string;
  price: number;
  listPrice: number;
  cost: number;
  stock: number;
  sku: string;
  origin: string;
  maker: string;
  unit: string;
  weight: number;
  isActive: boolean;
  isFeatured: boolean;
  isBest: boolean;
  isNew: boolean;
  foodType: string;
  ingredients: string;
  allergyInfo: string;
  storageInfo: string;
  expiryInfo: string;
  nutritionInfo: string;
  sourceUrl: string;
  imageUrls: string[];
  options: string[];
};

const initial: Res = { ok: false, message: '' };

export default function ProductForm({
  categories,
  data,
}: {
  categories: Category[];
  data: ProductFormData;
}) {
  const [state, formAction, pending] = useActionState(saveProduct, initial);

  const [images, setImages] = useState<string[]>(data.imageUrls);
  const [vendorUrl, setVendorUrl] = useState(data.sourceUrl);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [parsed, setParsed] = useState<{ title: string; price: number } | null>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  async function parseVendor() {
    if (!vendorUrl) return;
    setBusy('parse');
    setNote('');
    try {
      const res = await fetch('/api/admin/vendor-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: vendorUrl }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setCandidates(json.images ?? []);
      setPicked([]);
      setParsed({ title: json.title ?? '', price: json.price ?? 0 });
      setNote(`이미지 후보 ${json.images?.length ?? 0}개를 찾았습니다. ${json.notice ?? ''}`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : '파싱에 실패했습니다.');
    } finally {
      setBusy('');
    }
  }

  async function importPicked() {
    if (picked.length === 0) return;
    setBusy('import');
    try {
      const res = await fetch('/api/admin/image-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: picked }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      const urls: string[] = (json.saved ?? []).map((x: { url: string }) => x.url);
      setImages((prev) => [...prev, ...urls]);
      setPicked([]);
      setNote(
        `${urls.length}개 이미지를 서버에 저장했습니다.` +
          (json.failed?.length ? ` (${json.failed.length}개 실패)` : '')
      );
    } catch (e) {
      setNote(e instanceof Error ? e.message : '이미지 가져오기에 실패했습니다.');
    } finally {
      setBusy('');
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy('upload');
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setImages((prev) => [...prev, ...(json.saved ?? [])]);
      setNote(`${json.saved?.length ?? 0}개 이미지를 업로드했습니다.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : '업로드에 실패했습니다.');
    } finally {
      setBusy('');
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="imageUrls" value={images.join('\n')} />

      <section className="card p-6">
        <h2 className="text-base font-bold">벤더사 상품 이미지 가져오기</h2>
        <p className="mt-1.5 text-xs leading-5 text-gim-500">
          다나와 · 쿠팡 · 스마트스토어 등에 이미 등록된 자사 상품 페이지 주소를 넣으면
          이미지 후보를 찾아 서버로 복사해 옵니다.
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-[11px] leading-5 text-amber-800">
          ⚠️ 자사가 촬영했거나 사용 권한을 가진 이미지에만 사용하세요. 오픈마켓·타사가 제작한
          이미지는 무단 사용 시 저작권 문제가 발생할 수 있습니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            name="sourceUrl"
            value={vendorUrl}
            onChange={(e) => setVendorUrl(e.target.value)}
            placeholder="https://prod.danawa.com/info/?pcode=..."
            className="input min-w-[240px] flex-1"
          />
          <button
            type="button"
            onClick={parseVendor}
            disabled={busy === 'parse'}
            className="btn-outline btn-sm px-5"
          >
            {busy === 'parse' ? '분석 중…' : '이미지 찾기'}
          </button>
        </div>

        {parsed && (
          <p className="mt-3 text-xs text-gim-500">
            추출된 상품명: <strong>{parsed.title || '-'}</strong>
            {parsed.price > 0 && (
              <> · 가격 추정: <strong>{parsed.price.toLocaleString()}원</strong></>
            )}
          </p>
        )}

        {candidates.length > 0 && (
          <>
            <div className="mt-4 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-gim-100 p-3 sm:grid-cols-6">
              {candidates.map((url) => {
                const on = picked.includes(url);
                return (
                  <button
                    type="button"
                    key={url}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== url) : [...p, url]))}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                      on ? 'border-sea-700' : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {on && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sea-700 text-[10px] text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={importPicked}
              disabled={picked.length === 0 || busy === 'import'}
              className="btn-primary btn-sm mt-3"
            >
              {busy === 'import' ? '가져오는 중…' : `선택한 ${picked.length}개 가져오기`}
            </button>
          </>
        )}

        {note && <p className="mt-3 rounded-lg bg-sea-50 px-3.5 py-2.5 text-xs text-sea-800">{note}</p>}
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">상품 이미지</h2>
          <label className="btn-outline btn-sm cursor-pointer">
            {busy === 'upload' ? '업로드 중…' : '내 컴퓨터에서 업로드'}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </label>
        </div>

        {images.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gim-200 py-10 text-center text-sm text-gim-400">
            등록된 이미지가 없습니다.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {images.map((url, i) => (
              <div
                key={url + i}
                className="relative aspect-square overflow-hidden rounded-lg border border-gim-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="badge absolute left-1 top-1 bg-sea-800 text-white">대표</span>}
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ×
                </button>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...images];
                      const tmp = next[0];
                      next[0] = next[i];
                      next[i] = tmp;
                      setImages(next);
                    }}
                    className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
                  >
                    대표로
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-base font-bold">기본 정보</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">상품명 *</label>
            <input name="name" required defaultValue={data.name} className="input" />
          </div>
          <div>
            <label className="label">URL 주소(slug)</label>
            <input name="slug" defaultValue={data.slug} className="input" placeholder="비우면 자동 생성" />
          </div>
          <div>
            <label className="label">카테고리 *</label>
            <select name="categoryId" required defaultValue={data.categoryId} className="input">
              <option value="">선택하세요</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">한 줄 소개</label>
            <input name="summary" defaultValue={data.summary} className="input" />
          </div>

          <div>
            <label className="label">판매가 *</label>
            <input name="price" type="number" required defaultValue={data.price} className="input" />
          </div>
          <div>
            <label className="label">정상가 (할인 전, 0이면 미표시)</label>
            <input name="listPrice" type="number" defaultValue={data.listPrice} className="input" />
          </div>
          <div>
            <label className="label">원가 (관리용)</label>
            <input name="cost" type="number" defaultValue={data.cost} className="input" />
          </div>
          <div>
            <label className="label">재고 수량</label>
            <input name="stock" type="number" defaultValue={data.stock} className="input" />
          </div>

          <div>
            <label className="label">상품코드(SKU)</label>
            <input name="sku" defaultValue={data.sku} className="input" />
          </div>
          <div>
            <label className="label">구성/중량 표기</label>
            <input name="unit" defaultValue={data.unit} className="input" placeholder="예) 5g x 12봉" />
          </div>
          <div>
            <label className="label">원산지</label>
            <input name="origin" defaultValue={data.origin} className="input" />
          </div>
          <div>
            <label className="label">제조사</label>
            <input name="maker" defaultValue={data.maker} className="input" />
          </div>
          <div>
            <label className="label">중량(g) — 배송비 계산용</label>
            <input name="weight" type="number" defaultValue={data.weight} className="input" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={data.isActive} className="h-4 w-4 accent-sea-700" />
            판매중
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={data.isFeatured} className="h-4 w-4 accent-sea-700" />
            메인 추천
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isBest" defaultChecked={data.isBest} className="h-4 w-4 accent-sea-700" />
            BEST
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isNew" defaultChecked={data.isNew} className="h-4 w-4 accent-sea-700" />
            NEW
          </label>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-bold">상품 옵션</h2>
        <p className="mt-1.5 text-xs text-gim-500">
          한 줄에 하나씩 <code className="rounded bg-gim-100 px-1">옵션명|옵션값|추가금액|재고</code> 형식으로 입력하세요.
        </p>
        <textarea
          name="options"
          rows={5}
          defaultValue={data.options.join('\n')}
          className="input mt-3 font-mono text-xs"
          placeholder={'구성|재래김 10봉|0|100\n구성|재래김 20봉|9000|50'}
        />
      </section>

      <section className="card p-6">
        <h2 className="text-base font-bold">상세 설명 (HTML 입력 가능)</h2>
        <textarea
          name="description"
          rows={12}
          defaultValue={data.description}
          className="input mt-3 font-mono text-xs"
          placeholder="<h3>제품 특징</h3><p>...</p>"
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-base font-bold">식품 표시사항</h2>
        <p className="mb-5 text-xs text-gim-500">
          「전자상거래 등에서의 상품정보제공 고시」에 따라 식품은 아래 항목을 표기해야 합니다.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">식품유형</label>
            <input name="foodType" defaultValue={data.foodType} placeholder="예) 조미김" className="input" />
          </div>
          <div>
            <label className="label">원재료명</label>
            <input name="ingredients" defaultValue={data.ingredients} placeholder="예) 마른김(국산), 옥수수유, 천일염" className="input" />
          </div>
          <div>
            <label className="label">알레르기 유발물질</label>
            <input name="allergyInfo" defaultValue={data.allergyInfo} placeholder="예) 대두 함유" className="input" />
          </div>
          <div>
            <label className="label">보관방법</label>
            <input name="storageInfo" defaultValue={data.storageInfo} placeholder="예) 직사광선을 피해 서늘한 곳" className="input" />
          </div>
          <div>
            <label className="label">소비기한</label>
            <input name="expiryInfo" defaultValue={data.expiryInfo} placeholder="예) 제조일로부터 12개월" className="input" />
          </div>
          <div>
            <label className="label">영양성분</label>
            <input name="nutritionInfo" defaultValue={data.nutritionInfo} placeholder="예) 1회 제공량 5g당 25kcal" className="input" />
          </div>
        </div>
      </section>

      {state.message && !state.ok && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>
      )}

      <div className="flex justify-end gap-2">
        <a href="/admin/products" className="btn-outline">취소</a>
        <button disabled={pending} className="btn-primary px-10">
          {pending ? '저장 중…' : '저장하기'}
        </button>
      </div>
    </form>
  );
}
