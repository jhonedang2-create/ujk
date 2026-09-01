'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-bold">문제가 발생했습니다</h1>
      <p className="mt-3 text-sm text-gim-500">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 고객센터로 연락 주시기 바랍니다.
      </p>
      <button onClick={reset} className="btn-primary mt-8">다시 시도</button>
    </div>
  );
}
