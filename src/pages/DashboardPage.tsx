import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquareWarning, Landmark, Globe, ScanText, QrCode, History,
  Flag, ShieldCheck, ArrowRight, TrendingUp, AlertTriangle, Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchHistory } from '@/lib/api';
import type { Verdict } from '@/lib/types';

const QUICK = [
  { to: '/app/scan-message', label: 'Scan Scam Message', icon: MessageSquareWarning, tint: 'bg-primary-50 text-primary-600', desc: 'Paste a WhatsApp / SMS / email message' },
  { to: '/app/verify-government', label: 'Verify Notification', icon: Landmark, tint: 'bg-accent-50 text-accent-600', desc: 'Check against official govt records' },
  { to: '/app/check-website', label: 'Check Website', icon: Globe, tint: 'bg-success-50 text-success-600', desc: 'Analyse a recruitment URL' },
  { to: '/app/scan-ocr', label: 'OCR Scanner', icon: ScanText, tint: 'bg-warning-50 text-warning-600', desc: 'Upload an ad image or PDF' },
  { to: '/app/scan-qr', label: 'Scan QR Code', icon: QrCode, tint: 'bg-primary-50 text-accent-600', desc: 'Decode & verify a QR code' },
  { to: '/app/report', label: 'Report Scam', icon: Flag, tint: 'bg-danger-50 text-danger-600', desc: 'Submit a scam you encountered' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, fake: 0, suspicious: 0, safe: 0 });
  const [recent, setRecent] = useState<{ id: string; scan_type: string; input_summary: string; verdict: Verdict; scam_probability: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchHistory();
        setRecent(rows.slice(0, 5).map((r) => ({ id: r.id, scan_type: r.scan_type, input_summary: r.input_summary, verdict: r.verdict, scam_probability: r.scam_probability, created_at: r.created_at })));
        setStats({
          total: rows.length,
          fake: rows.filter((r) => r.verdict === 'fake').length,
          suspicious: rows.filter((r) => r.verdict === 'suspicious').length,
          safe: rows.filter((r) => r.verdict === 'safe').length,
        });
      } catch { /* ignore — empty dashboard is fine */ }
      finally { setLoading(false); }
    })();
  }, []);

  const firstName = (user?.email ?? '').split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Greeting */}
      <div className="card p-6 sm:p-8 gradient-hero relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm text-ink-500 font-medium">{today}</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 mt-1">
            {greeting}, {firstName}
          </h2>
          <p className="mt-2 text-ink-600">
            Run a scan to verify any recruitment notification, message, website or
            advertisement. Every result comes with a trust score and clear reasons.
          </p>
          <Link to="/app/scan-message" className="btn-primary mt-5">
            <MessageSquareWarning size={16} /> Scan a message
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total scans" value={stats.total} icon={Activity} tint="bg-primary-50 text-primary-600" loading={loading} />
        <StatCard label="Fake detected" value={stats.fake} icon={AlertTriangle} tint="bg-danger-50 text-danger-600" loading={loading} />
        <StatCard label="Suspicious" value={stats.suspicious} icon={TrendingUp} tint="bg-warning-50 text-warning-600" loading={loading} />
        <StatCard label="Verified safe" value={stats.safe} icon={ShieldCheck} tint="bg-success-50 text-success-600" loading={loading} />
      </div>

      {/* Quick actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink-900">Quick actions</h3>
          <Link to="/app/history" className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
            View history <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK.map((q) => (
            <Link key={q.to} to={q.to} className="card p-5 hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200 group">
              <div className={`w-11 h-11 rounded-xl ${q.tint} flex items-center justify-center mb-3 group-hover:scale-110 transition`}>
                <q.icon size={20} />
              </div>
              <p className="font-display text-base font-semibold text-ink-900">{q.label}</p>
              <p className="text-sm text-ink-500 mt-1">{q.desc}</p>
              <div className="mt-3 text-xs font-medium text-primary-600 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                Open <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink-900">Recent scans</h3>
          <Link to="/app/history" className="text-sm font-medium text-primary-600 hover:text-primary-700">See all</Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[0,1,2].map((i) => <div key={i} className="shimmer-bg h-14 rounded-xl animate-shimmer" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-ink-100 mx-auto flex items-center justify-center text-ink-400 mb-3">
              <History size={26} />
            </div>
            <p className="text-ink-600 font-medium">No scans yet</p>
            <p className="text-sm text-ink-400 mt-1">Run your first scan to see results here.</p>
            <Link to="/app/scan-message" className="btn-primary mt-4 inline-flex">Scan a message</Link>
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  r.verdict === 'fake' ? 'bg-danger-500' : r.verdict === 'suspicious' ? 'bg-warning-500' : 'bg-success-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 truncate">{r.input_summary || r.scan_type}</p>
          <p className="text-xs text-ink-400 capitalize">{r.scan_type} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className={`chip ${
                  r.verdict === 'fake' ? 'bg-danger-100 text-danger-700'
                  : r.verdict === 'suspicious' ? 'bg-warning-100 text-warning-700'
                  : 'bg-success-100 text-success-700'
                }`}>
                  {r.scam_probability}% scam
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint, loading }: { label: string; value: number; icon: typeof Activity; tint: string; loading: boolean }) {
  return (
    <div className="card p-5 hover:shadow-soft transition-all duration-200 hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-xl ${tint} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className="font-display text-2xl font-bold text-ink-900">{loading ? '—' : value}</p>
      <p className="text-sm text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}
