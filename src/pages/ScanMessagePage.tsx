import { useState } from 'react';
import { MessageSquareWarning, Loader2, Sparkles } from 'lucide-react';
import { analyzeMessageApi, saveScan } from '@/lib/api';
import type { AnalysisResult } from '@/lib/types';
import { ResultPanel } from '@/components/ResultPanel';
import { toast } from '@/components/Notifications';

const SAMPLES = [
  `URGENT!! Government of India job opening in Indian Railway. 100% guaranteed selection. No exam, no interview!! Pay registration fee Rs. 500 to UPI id railway-job@paytm and send your documents on WhatsApp 9876543210. Limited seats! Last date today. Dont miss this chance!!`,
  `Staff Selection Commission has released the Combined Graduate Level Examination 2024 notification. Candidates can apply online at ssc.nic.in till 24 July 2024. No fee for female/SC/ST candidates.`,
  `Congratulations! You are selected for direct recruitment in ONGC as Assistant Engineer. Send Rs 1000 security deposit to account 1234567890 via GooglePay to confirm your joining letter. Hurry only few seats left!!`,
];

export function ScanMessagePage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const run = async () => {
    if (text.trim().length < 5) { toast('warning', 'Enter a longer message to analyse.'); return; }
    setBusy(true);
    try {
      const r = await analyzeMessageApi(text);
      setResult(r);
      setSaved(false);
      if (r.verdict === 'fake') toast('error', 'High scam probability detected. Do not pay or share details.');
      else if (r.verdict === 'suspicious') toast('warning', 'Some red flags found. Verify before acting.');
      else toast('success', 'No major red flags. Looks legitimate.');
    } catch {
      toast('error', 'Analysis failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveScan({ scanType: 'message', inputSummary: text, result });
      setSaved(true);
      toast('success', 'Saved to history.');
    } catch {
      toast('error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setResult(null); setText(''); setSaved(false); };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={MessageSquareWarning}
        title="Scan Scam Message"
        desc="Paste a WhatsApp, SMS, email, Telegram or social media recruitment message. The AI engine analyses keywords, urgency, payment requests, entities and grammar."
      />

      {!result && (
        <div className="card p-6">
          <label className="label">Recruitment message</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="input-field resize-y font-mono text-[13px] leading-relaxed"
            placeholder="Paste the full message here…"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-ink-400">
            <span>{text.length} characters</span>
            {text && <button onClick={() => setText('')} className="hover:text-ink-600">Clear</button>}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button onClick={run} disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin-slow" /> : <Sparkles size={16} />}
              {busy ? 'Analysing…' : 'Analyse message'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-ink-200">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2.5">Try a sample</p>
            <div className="grid sm:grid-cols-3 gap-2.5">
              {SAMPLES.map((s, i) => (
                <button key={i} onClick={() => setText(s)}
                  className="text-left text-xs text-ink-600 rounded-xl border border-ink-200 p-3 hover:border-primary-300 hover:bg-primary-50 transition line-clamp-3">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && (
        <ResultPanel
          result={result}
          entities={result.entities}
          onSave={onSave}
          saving={saving}
          saved={saved}
          onReset={reset}
        />
      )}
    </div>
  );
}

export function PageHeader({ icon: Icon, title, desc }: { icon: typeof MessageSquareWarning; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl gradient-brand text-white flex items-center justify-center shrink-0 shadow-soft">
        <Icon size={22} />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 tracking-tight">{title}</h1>
        <p className="mt-1 text-ink-600 max-w-2xl leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
