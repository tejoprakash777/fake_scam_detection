import type { AnalysisReason } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

const STYLE: Record<AnalysisReason['severity'], { cls: string; Icon: typeof Info }> = {
  success: { cls: 'border-success-200 bg-success-50', Icon: CheckCircle2 },
  info: { cls: 'border-primary-200 bg-primary-50', Icon: Info },
  warning: { cls: 'border-warning-200 bg-warning-50', Icon: AlertTriangle },
  danger: { cls: 'border-danger-200 bg-danger-50', Icon: XCircle },
};
const ICON_CLS: Record<AnalysisReason['severity'], string> = {
  success: 'text-success-600',
  info: 'text-primary-600',
  warning: 'text-warning-600',
  danger: 'text-danger-600',
};

export function ReasonCard({ reason }: { reason: AnalysisReason }) {
  const { cls, Icon } = STYLE[reason.severity];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${cls} animate-slide-up`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_CLS[reason.severity]}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-800">{reason.label}</p>
        <p className="text-sm text-ink-600 mt-0.5 leading-snug">{reason.detail}</p>
      </div>
    </div>
  );
}

export function ReasonList({ reasons }: { reasons: AnalysisReason[] }) {
  if (!reasons.length) return null;
  return (
    <div className="grid gap-2.5">
      {reasons.map((r, i) => (
        <div key={i} style={{ animationDelay: `${i * 60}ms` }}>
          <ReasonCard reason={r} />
        </div>
      ))}
    </div>
  );
}
