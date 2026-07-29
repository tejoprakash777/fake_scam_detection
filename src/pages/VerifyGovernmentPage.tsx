import { useEffect, useState } from 'react';
import { Landmark, Loader2, Search, ExternalLink } from 'lucide-react';
import { analyzeGovernmentApi, fetchReferenceData, saveScan, type GovRecord } from '@/lib/api';
import type { AnalysisResult } from '@/lib/types';
import { ResultPanel } from '@/components/ResultPanel';
import { PageHeader } from './ScanMessagePage';
import { toast } from '@/components/Notifications';

export function VerifyGovernmentPage() {
  const [organization, setOrganization] = useState('');
  const [notificationNumber, setNotificationNumber] = useState('');
  const [recruitmentTitle, setRecruitmentTitle] = useState('');
  const [records, setRecords] = useState<GovRecord[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchReferenceData().then((r) => setRecords(r.notifications)).catch(() => {});
  }, []);

  const run = async () => {
    if (!organization && !notificationNumber && !recruitmentTitle) {
      toast('warning', 'Enter at least one field to verify.');
      return;
    }
    setBusy(true);
    try {
      const r = await analyzeGovernmentApi({ organization, notificationNumber, recruitmentTitle }, records);
      setResult(r);
      setSaved(false);
      if (r.verdict === 'safe') toast('success', 'Notification found in official records.');
      else if (r.verdict === 'suspicious') toast('warning', 'Partial match. Verify on the official portal.');
      else toast('error', 'Not found in trusted government records.');
    } catch {
      toast('error', 'Verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveScan({
        scanType: 'government',
        inputSummary: `${organization} · ${notificationNumber} · ${recruitmentTitle}`,
        result,
      });
      setSaved(true);
      toast('success', 'Saved to history.');
    } catch { toast('error', 'Could not save.'); }
    finally { setSaving(false); }
  };

  const reset = () => { setResult(null); setSaved(false); };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Landmark}
        title="Verify Government Notification"
        desc="Enter the organisation, notification/advertisement number and recruitment title. We cross-check against SSC, UPSC, RRB, State PSC and other official .gov.in records."
      />

      {!result && (
        <>
          <div className="card p-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Organisation</label>
                <input value={organization} onChange={(e) => setOrganization(e.target.value)}
                  className="input-field" placeholder="e.g. SSC, UPSC, RRB" list="org-list" />
                <datalist id="org-list">
                  {Array.from(new Set(records.map((r) => r.organization))).map((o) => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Notification / Advt. No.</label>
                <input value={notificationNumber} onChange={(e) => setNotificationNumber(e.target.value)}
                  className="input-field" placeholder="e.g. CEN 05/2024" />
              </div>
              <div>
                <label className="label">Recruitment title</label>
                <input value={recruitmentTitle} onChange={(e) => setRecruitmentTitle(e.target.value)}
                  className="input-field" placeholder="e.g. Assistant Loco Pilot 2024" />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={run} disabled={busy} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin-slow" /> : <Search size={16} />}
                {busy ? 'Verifying…' : 'Verify notification'}
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-display text-base font-semibold text-ink-900 mb-1">Trusted records ({records.length})</h3>
            <p className="text-sm text-ink-500 mb-4">Reference database of genuine government recruitment notifications.</p>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ink-200">
                    <th className="py-2 px-2 font-semibold">Organisation</th>
                    <th className="py-2 px-2 font-semibold">Advt. No.</th>
                    <th className="py-2 px-2 font-semibold">Title</th>
                    <th className="py-2 px-2 font-semibold">Portal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {records.slice(0, 12).map((r, i) => (
                    <tr key={i} className="hover:bg-ink-50 transition">
                      <td className="py-2.5 px-2 font-medium text-ink-800">{r.organization}</td>
                      <td className="py-2.5 px-2 text-ink-600">{r.notification_number}</td>
                      <td className="py-2.5 px-2 text-ink-600">{r.recruitment_title}</td>
                      <td className="py-2.5 px-2">
                        <a href={r.official_url} target="_blank" rel="noreferrer"
                          className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs font-medium">
                          Visit <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > 12 && <p className="text-xs text-ink-400 mt-3 px-2">Showing 12 of {records.length} records.</p>}
            </div>
          </div>
        </>
      )}

      {result && (
        <ResultPanel
          result={result}
          onSave={onSave}
          saving={saving}
          saved={saved}
          onReset={reset}
        />
      )}
    </div>
  );
}
