import type { Verdict, RiskLevel } from '@/lib/types';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

const MAP: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  safe: { label: 'Safe', cls: 'bg-success-100 text-success-700 border-success-200', Icon: ShieldCheck },
  suspicious: { label: 'Suspicious', cls: 'bg-warning-100 text-warning-700 border-warning-200', Icon: ShieldAlert },
  fake: { label: 'Fake', cls: 'bg-danger-100 text-danger-700 border-danger-200', Icon: ShieldX },
};

export function VerdictBadge({ verdict, size = 'md' }: { verdict: Verdict; size?: 'sm' | 'md' | 'lg' }) {
  const { label, cls, Icon } = MAP[verdict];
  const sz = size === 'lg' ? 'px-4 py-2 text-base' : size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <span className={`chip border ${cls} ${sz}`}>
      <Icon size={size === 'lg' ? 18 : 14} />
      {label}
    </span>
  );
}

const RISK_CLS: Record<RiskLevel, string> = {
  Safe: 'bg-success-100 text-success-700',
  'Medium Risk': 'bg-warning-100 text-warning-700',
  'High Risk': 'bg-danger-100 text-danger-700',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`chip ${RISK_CLS[level]}`}>{level}</span>;
}
