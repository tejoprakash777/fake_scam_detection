import { useEffect, useState } from 'react';
import { History as HistoryIcon, Trash2, Loader2, ShieldCheck, ShieldAlert, ShieldX, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchHistory, deleteScan, clearHistory } from '@/lib/api';
import type { Verdict, ScanType } from '@/lib/types';
import { toast } from '@/components/Notifications';

interface Row {
  id: string;
  scan_type: ScanType;
  input_summary: string;
  verdict: Verdict;
  risk_level: string;
  scam_probability: number;
  trust_score: number;
  reasons: { label: string; detail: string; severity: string }[];
  recommendation: string;
  created_at: string;
}

const VERDICT_STYLE: Record<Verdict, { cls: string; Icon: typeof ShieldCheck }> = {
  safe: { cls: 'text-success-700 bg-success-100', Icon: ShieldCheck },
  suspicious: { cls: 'text-warning-700 bg-warning-100', Icon: ShieldAlert },
  fake: { cls: 'text-danger-700 bg-danger-100', Icon: ShieldX },
};

const TYPE_LABEL: Record<ScanType, string> = {
  message: 'Scam Message',
  government: 'Gov Notification',
  website: 'Website',
  ocr: 'OCR Ad',
  qr: 'QR Code',
};

export function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Verdict>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await fetchHistory()); }
    catch { toast('error', 'Could not load history.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (id: string) => {
    try { await deleteScan(id); setRows((r) => r.filter((x) => x.id !== id)); toast('info', 'Scan deleted.'); }
    catch { toast('error', 'Could not delete.'); }
  };

  const onClear = async () => {
    try { await clearHistory(); setRows([]); toast('info', 'History cleared.'); }
    catch { toast('error', 'Could not clear history.'); }
  };

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.verdict === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-brand text-white flex items-center justify-center shrink-0">
          <HistoryIcon size={22} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-ink-900">Scan History</h1>
          <p className="mt-1 text-ink-600">All your past scans, with full results. Tap a row to see the breakdown.</p>
        </div>
        {rows.length > 0 && (
          <button onClick={onClear} className="btn-ghost text-sm px-3.5 py-2 text-danger-600 hover:bg-danger-50">
            <Trash2 size={15} /> Clear all
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-ink-500 inline-flex items-center gap-1.5"><Filter size={14} /> Filter:</span>
        {(['all','safe','suspicious','fake'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`chip border transition capitalize ${
              filter === f ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
            }`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2,3].map((i) => <div key={i} className="shimmer-bg h-20 rounded-xl animate-shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-ink-100 mx-auto flex items-center justify-center text-ink-400 mb-3">
            <HistoryIcon size={26} />
          </div>
          <p className="text-ink-700 font-medium">{rows.length === 0 ? 'No scans yet' : 'No scans match this filter'}</p>
          <p className="text-sm text-ink-400 mt-1">{rows.length === 0 ? 'Run your first scan to start building history.' : 'Try a different filter.'}</p>
          {rows.length === 0 && <Link to="/app/scan-message" className="btn-primary mt-5 inline-flex">Scan a message</Link>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const { cls, Icon } = VERDICT_STYLE[r.verdict];
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="card overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-ink-50/50 transition">
                  <div className={`w-10 h-10 rounded-xl ${cls} flex items-center justify-center shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{r.input_summary || TYPE_LABEL[r.scan_type]}</p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {TYPE_LABEL[r.scan_type]} · {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-ink-900">{r.trust_score}<span className="text-ink-400 text-xs">/100</span></p>
                    <p className={`text-xs font-semibold ${r.verdict === 'fake' ? 'text-danger-600' : r.verdict === 'suspicious' ? 'text-warning-600' : 'text-success-600'}`}>
                      {r.scam_probability}% scam
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                    className="w-8 h-8 rounded-lg text-ink-400 hover:text-danger-600 hover:bg-danger-50 flex items-center justify-center transition shrink-0">
                    <Trash2 size={15} />
                  </button>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-ink-100 animate-slide-up">
                    <p className="text-sm text-ink-600 mt-3 mb-3">{r.recommendation}</p>
                    <div className="grid gap-2">
                      {r.reasons.map((re, i) => (
                        <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                          re.severity === 'danger' ? 'bg-danger-50 text-danger-700'
                          : re.severity === 'warning' ? 'bg-warning-50 text-warning-700'
                          : re.severity === 'success' ? 'bg-success-50 text-success-700'
                          : 'bg-primary-50 text-primary-700'
                        }`}>
                          <span className="font-semibold">{re.label}:</span>
                          <span className="text-ink-600">{re.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
