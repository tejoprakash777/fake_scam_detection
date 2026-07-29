import { useEffect, useState } from 'react';
import { Globe, Loader2, Sparkles, ShieldCheck, ShieldAlert } from 'lucide-react';
import { analyzeWebsiteApi, fetchReferenceData, saveScan } from '@/lib/api';
import type { AnalysisResult } from '@/lib/types';
import { ResultPanel } from '@/components/ResultPanel';
import { PageHeader } from './ScanMessagePage';
import { toast } from '@/components/Notifications';

const SAMPLES = [
  'https://ssc.nic.in',
  'https://govt-jobapply-india.net/apply-now',
  'http://sarkari-naukri-alert.xyz/freejobalert',
  'https://upsc.gov.in/examinations',
];

export function CheckWebsitePage() {
  const [url, setUrl] = useState('');
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchReferenceData().then((r) => setBlacklist(r.blacklist)).catch(() => {}); }, []);

  const run = async () => {
    if (url.trim().length < 4) { toast('warning', 'Enter a URL to analyse.'); return; }
    setBusy(true);
    try {
      const r = await analyzeWebsiteApi(url, blacklist);
      setResult(r);
      setSaved(false);
      if (r.verdict === 'safe') toast('success', 'This site appears legitimate.');
      else if (r.verdict === 'suspicious') toast('warning', 'Some red flags found.');
      else toast('error', 'High-risk website. Do not share personal details.');
    } catch { toast('error', 'Analysis failed.'); }
    finally { setBusy(false); }
  };

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveScan({ scanType: 'website', inputSummary: url, result });
      setSaved(true);
      toast('success', 'Saved to history.');
    } catch { toast('error', 'Could not save.'); }
    finally { setSaving(false); }
  };

  const reset = () => { setResult(null); setUrl(''); setSaved(false); };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Globe}
        title="Check Recruitment Website"
        desc="Paste a recruitment website URL. We analyse HTTPS, domain age signals, phishing keywords, blacklist status and whether it is an official .gov.in domain."
      />

      {!result && (
        <div className="card p-6">
          <label className="label">Website URL</label>
          <div className="relative">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              className="input-field pl-10" placeholder="https://example-recruitment-site.com"
              onKeyDown={(e) => e.key === 'Enter' && run()} />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={run} disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin-slow" /> : <Sparkles size={16} />}
              {busy ? 'Analysing…' : 'Analyse website'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-ink-200">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2.5">Try a sample URL</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {SAMPLES.map((s) => (
                <button key={s} onClick={() => setUrl(s)}
                  className="text-left text-xs font-mono text-ink-600 rounded-xl border border-ink-200 p-3 hover:border-primary-300 hover:bg-primary-50 transition flex items-center gap-2">
                  {/gov\.in|nic\.in/.test(s) ? <ShieldCheck size={14} className="text-success-500" /> : <ShieldAlert size={14} className="text-danger-500" />}
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
