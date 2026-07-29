import { useEffect, useState } from 'react';
import { Flag, Loader2, Send, CheckCircle2, Globe, MessageSquare, Landmark, ScanText, FileWarning } from 'lucide-react';
import { submitReport, fetchReports } from '@/lib/api';
import { toast } from '@/components/Notifications';

type ReportType = 'website' | 'notification' | 'message' | 'advertisement' | 'other';

const TYPES: { value: ReportType; label: string; icon: typeof Globe }[] = [
  { value: 'website', label: 'Fake website', icon: Globe },
  { value: 'notification', label: 'Fake notification', icon: Landmark },
  { value: 'message', label: 'Fake message', icon: MessageSquare },
  { value: 'advertisement', label: 'Fake advertisement', icon: ScanText },
  { value: 'other', label: 'Other', icon: FileWarning },
];

export function ReportScamPage() {
  const [type, setType] = useState<ReportType>('website');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reports, setReports] = useState<{ id: string; report_type: string; subject: string; status: string; created_at: string }[]>([]);

  const loadReports = async () => {
    try { setReports(await fetchReports()); } catch { /* ignore */ }
  };
  useEffect(() => { loadReports(); }, []);

  const submit = async () => {
    if (!subject.trim() || !details.trim()) { toast('warning', 'Please add a subject and details.'); return; }
    setBusy(true);
    try {
      await submitReport({ report_type: type, subject, details, evidence_url: evidenceUrl || undefined, contact: contact || undefined });
      toast('success', 'Report submitted. Thank you for helping keep others safe.');
      setSubmitted(true);
      setSubject(''); setDetails(''); setEvidenceUrl(''); setContact('');
      loadReports();
    } catch { toast('error', 'Could not submit report. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-brand text-white flex items-center justify-center shrink-0">
          <Flag size={22} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Report a Scam</h1>
          <p className="mt-1 text-ink-600">Help the community by reporting fake recruitment websites, notifications, messages or advertisements.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 card p-6">
          {submitted ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-success-100 text-success-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 size={28} />
              </div>
              <p className="font-display text-lg font-semibold text-ink-900">Report submitted</p>
              <p className="text-sm text-ink-500 mt-1 mb-5">Thank you for contributing to a safer community.</p>
              <button onClick={() => setSubmitted(false)} className="btn-primary">
                <Flag size={15} /> Report another
              </button>
            </div>
          ) : (
            <>
              <label className="label">What are you reporting?</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
                {TYPES.map((t) => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition text-left ${
                      type === t.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                    }`}>
                    <t.icon size={16} /> {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Subject</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="input-field" placeholder="Brief title e.g. Fake SSC CGL 2024 site asking for fee" />
                </div>
                <div>
                  <label className="label">Details</label>
                  <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5}
                    className="input-field resize-y" placeholder="Describe what happened, what they asked for, how they contacted you…" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Evidence URL (optional)</label>
                    <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)}
                      className="input-field" placeholder="https://… or screenshot link" />
                  </div>
                  <div>
                    <label className="label">Scammer contact (optional)</label>
                    <input value={contact} onChange={(e) => setContact(e.target.value)}
                      className="input-field" placeholder="Phone / email / UPI" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button onClick={submit} disabled={busy} className="btn-primary">
                  {busy ? <Loader2 size={16} className="animate-spin-slow" /> : <Send size={16} />}
                  {busy ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Your reports */}
        <div className="card p-6">
          <h3 className="font-display text-base font-semibold text-ink-900 mb-1">Your reports</h3>
          <p className="text-sm text-ink-500 mb-4">Reports you have submitted.</p>
          {reports.length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">No reports yet.</p>
          ) : (
            <div className="space-y-2.5">
              {reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-ink-200 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="chip bg-ink-100 text-ink-600 capitalize">{r.report_type}</span>
                    <span className={`chip capitalize ${
                      r.status === 'pending' ? 'bg-warning-100 text-warning-700'
                      : r.status === 'verified' ? 'bg-primary-100 text-primary-700'
                      : 'bg-success-100 text-success-700'
                    }`}>{r.status}</span>
                  </div>
                  <p className="text-sm font-medium text-ink-800 truncate">{r.subject}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
