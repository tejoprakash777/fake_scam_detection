import type { AnalysisResult } from '@/lib/types';
import { VerdictBadge, RiskBadge } from './VerdictBadge';
import { ScoreGauge } from './ScoreGauge';
import { ReasonList } from './ReasonCard';
import { Lightbulb, Save, RotateCcw } from 'lucide-react';

interface Props {
  result: AnalysisResult;
  onReset?: () => void;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  entities?: { type: string; value: string }[];
}

export function ResultPanel({ result, onReset, onSave, saving, saved, entities }: Props) {
  const accent =
    result.verdict === 'safe' ? 'from-success-500 to-success-600'
    : result.verdict === 'suspicious' ? 'from-warning-500 to-warning-600'
    : 'from-danger-500 to-danger-600';

  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <VerdictBadge verdict={result.verdict} size="lg" />
          <RiskBadge level={result.riskLevel} />
        </div>
        <div className="flex items-center gap-2">
          {onSave && (
            <button onClick={onSave} disabled={saving || saved} className="btn-ghost text-sm px-3.5 py-2">
              {saving ? 'Saving…' : saved ? 'Saved' : <><Save size={15} /> Save to history</>}
            </button>
          )}
          {onReset && (
            <button onClick={onReset} className="btn-outline text-sm px-3.5 py-2">
              <RotateCcw size={15} /> New scan
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-center">
        <div className="flex justify-center">
          <ScoreGauge value={Math.round(result.trustScore)} label="Trust Score" variant="trust" />
        </div>
        <div className="flex justify-center md:border-x md:border-ink-200">
          <ScoreGauge value={Math.round(result.scamProbability)} label="Scam Probability" variant="scam" />
        </div>
        <div className="space-y-3">
          <div className={`rounded-xl bg-gradient-to-br ${accent} text-white p-4`}>
            <p className="text-xs uppercase tracking-wide text-white/80">Recommendation</p>
            <p className="text-sm font-medium mt-1 leading-snug">{result.recommendation}</p>
          </div>
          {entities && entities.length > 0 && (
            <div className="rounded-xl bg-ink-50 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-400 mb-2">Entities detected</p>
              <div className="flex flex-wrap gap-1.5">
                {entities.slice(0, 8).map((e, i) => (
                  <span key={i} className="chip bg-white border border-ink-200 text-ink-700">
                    <span className="text-ink-400">{e.type}:</span> {e.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-ink-200">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={18} className="text-accent-500" />
          <h3 className="font-display text-base font-semibold text-ink-900">Analysis breakdown</h3>
        </div>
        <ReasonList reasons={result.reasons} />
      </div>
    </div>
  );
}
