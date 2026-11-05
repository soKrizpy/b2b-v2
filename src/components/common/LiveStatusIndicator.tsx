'use client';
// src/components/common/LiveStatusIndicator.tsx
// Live status indicator — CSS-only animation (no animejs).

interface LiveStatusIndicatorProps {
  isLive: boolean;
  liveLabel?: string;
  offlineLabel?: string;
  showLabel?: boolean;
  className?: string;
}

export function LiveStatusIndicator({
  isLive,
  liveLabel = 'LIVE SEKARANG',
  offlineLabel = 'TIDAK LIVE',
  showLabel = true,
  className = '',
}: LiveStatusIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wide border transition-all select-none ${
        isLive
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 shadow-sm shadow-emerald-500/20'
          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60'
      } ${className}`}
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center flex-shrink-0">
        {isLive && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isLive
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
              : 'bg-slate-400 dark:bg-slate-500'
          }`}
        />
      </span>

      {showLabel && (
        <span className="text-[11px] font-extrabold uppercase">
          {isLive ? liveLabel : offlineLabel}
        </span>
      )}
    </span>
  );
}
