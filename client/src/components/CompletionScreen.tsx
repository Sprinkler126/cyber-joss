import { memo } from 'react';

interface CompletionScreenProps {
  totalBurns: number;
  onRestart: () => void;
  packetsSent: number;
  mingli: number;
}

function CompletionScreen({ totalBurns, onRestart, packetsSent, mingli }: CompletionScreenProps) {
  return (
    <div className="w-full max-w-xl rounded-[30px] border border-[#6d3417]/60 bg-black/35 p-8 text-center shadow-[0_0_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/25 bg-amber-950/25 text-2xl text-amber-100">
        灰
      </div>
      <p className="text-xs tracking-[0.35em] text-stone-500">焚化完成</p>
      <h2 className="mt-3 text-3xl text-amber-50">你的思念已化为数字之灰</h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-stone-300/78">
        火焰已吞没文字与纸品，余烬在光缆与路由之间漂流。愿这份想念，穿过无形网络，抵达你心中的彼岸。
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#6d3417]/50 bg-[#1a110e]/70 p-4">
          <div className="text-xs tracking-[0.2em] text-stone-500">本次冥力</div>
          <div className="mt-2 text-2xl text-amber-100">{mingli}</div>
        </div>
        <div className="rounded-2xl border border-[#6d3417]/50 bg-[#1a110e]/70 p-4">
          <div className="text-xs tracking-[0.2em] text-stone-500">消散分片</div>
          <div className="mt-2 text-2xl text-amber-100">{packetsSent}</div>
        </div>
        <div className="rounded-2xl border border-[#6d3417]/50 bg-[#1a110e]/70 p-4">
          <div className="text-xs tracking-[0.2em] text-stone-500">总焚烧数</div>
          <div className="mt-2 text-2xl text-amber-100">{totalBurns.toLocaleString()}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-8 rounded-[20px] border border-amber-700/30 bg-amber-950/20 px-6 py-3 text-sm tracking-[0.25em] text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-900/25"
      >
        再 寄 一 份
      </button>
    </div>
  );
}

export default memo(CompletionScreen);
