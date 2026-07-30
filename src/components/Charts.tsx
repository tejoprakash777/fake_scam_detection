/* Lightweight dependency-free SVG charts for the dashboard.
   Pure presentational components — no chart library needed. */

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 160, thickness = 22 }: { data: DonutSlice[]; size?: number; thickness?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circ;
            const slice = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
              />
            );
            offset += dash;
            return slice;
          })}
        </g>
        <text
          x="50%" y="46%"
          textAnchor="middle"
          className="fill-ink-900"
          style={{ fontSize: size * 0.22, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          {total}
        </text>
        <text
          x="50%" y="60%"
          textAnchor="middle"
          className="fill-ink-400"
          style={{ fontSize: size * 0.09, fontWeight: 500 }}
        >
          total
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-ink-600 flex-1">{d.label}</span>
            <span className="font-display font-semibold text-ink-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BarItem {
  label: string;
  value: number;
  color: string;
}

export function BarChart({ data, maxValue }: { data: BarItem[]; maxValue?: number }) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-ink-500">{d.label}</span>
            <span className="font-semibold text-ink-800">{d.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
