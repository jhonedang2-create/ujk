export default function Empty({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gim-200 py-20 text-center">
      <p className="text-sm font-semibold text-gim-600">{text}</p>
      {sub && <p className="mt-1.5 text-xs text-gim-400">{sub}</p>}
    </div>
  );
}
