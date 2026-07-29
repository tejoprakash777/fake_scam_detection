import { useEffect, useState } from 'react';

interface Props {
  value: number;
  label: string;
  /** color stops: 0-33 green, 34-65 amber, 66-100 red */
  variant?: 'trust' | 'scam';
  size?: number;
}

export function ScoreGauge({ value, label, variant = 'trust', size = 140 }: Props) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const dur = 800;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const pct = display / 100;
  const dash = circumference * pct;

  const color =
    variant === 'trust'
      ? display >= 66 ? '#10b981' : display >= 34 ? '#f59e0b' : '#ef4444'
      : display >= 65 ? '#ef4444' : display >= 35 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={10} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10}
            strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-ink-900">{display}</span>
          <span className="text-xs font-medium text-ink-400">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-ink-600">{label}</span>
    </div>
  );
}
