import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquareWarning, Landmark, Globe, ScanText, QrCode, History,
  Flag, ShieldCheck, ArrowRight, TrendingUp, AlertTriangle, Activity,
  HeartHandshake, Bot, Clock, Zap, Radio, BadgeCheck, ExternalLink, Lightbulb,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLiveScans, useLiveReports } from '@/lib/useLiveData';
import { fetchReferenceData, type GovRecord } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { ScanHistoryRow, Verdict } from '@/lib/types';
import { DonutChart, BarChart } from '@/components/Charts';

const QUICK = [
  { to: '/app/scan-message', label: 'Scan Scam Message', icon: MessageSquareWarning, tint: 'bg-primary-50 text-primary-600', desc: 'Paste a WhatsApp / SMS / email message' },
  { to: '/app/verify-government', label: 'Verify Notification', icon: Landmark, tint: 'bg-accent-50 text-accent-600', desc: 'Check against official govt records' },
  { to: '/app/check-website', label: 'Check Website', icon: Globe, tint: 'bg-success-50 text-success-600', desc: 'Analyse a recruitment URL' },
  { to: '/app/scan-ocr', label: 'OCR Scanner', icon: ScanText, tint: 'bg-warning-50 text-warning-600', desc: 'Upload an ad image or PDF' },
  { to: '/app/scan-qr', label: 'Scan QR Code', icon: QrCode, tint: 'bg-primary-50 text-accent-600', desc: 'Decode & verify a QR code' },
  { to: '/app/schemes', label: 'Govt Schemes', icon: HeartHandshake, tint: 'bg-accent-50 text-primary-600', desc: 'Browse genuine government schemes' },
  { to: '/app/report', label: 'Report Scam', icon: Flag, tint: 'bg-danger-50 text-danger-600', desc: 'Submit a scam you encountered' },
];

interface DashboardStats {
  total: number;
  scamAlerts: number;
  safe: number;
  suspicious: number;
  highRiskWebsites: number;
  govNotifications: number;
  avgTrust: number;
}

function computeStats(scans: ScanHistoryRow[]): DashboardStats {
  const total = scans.length;
  const scamAlerts = scans.filter((s) => s.verdict === 'fake').length;
  const safe = scans.filter((s) => s.verdict === 'safe').length;
  const suspicious = scans.filter((s) => s.verdict === 'suspicious').length;
  const highRiskWebsites = scans.filter((s) => s.scan_type === 'website' && s.verdict === 'fake').length;
  const govNotifications = scans.filter((s) => s.scan_type === 'government').length;
  const avgTrust = total > 0 ? Math.round(scans.reduce((sum, s) => sum + s.trust_score, 0) / total) : 0;
  return { total, scamAlerts, safe, suspicious, highRiskWebsites, govNotifications, avgTrust };
}

function riskDistribution(scans: ScanHistoryRow[]) {
  const safe = scans.filter((s) => s.risk_level === 'Safe').length;
  const medium = scans.filter((s) => s.risk_level === 'Medium Risk').length;
  const high = scans.filter((s) => s.risk_level === 'High Risk').length;
  return [
    { label: 'Safe', value: safe, color: '#10b981' },
    { label: 'Medium Risk', value: medium, color: '#f59e0b' },
    { label: 'High Risk', value: high, color: '#ef4444' },
  ];
}

function trustByType(scans: ScanHistoryRow[]) {
  const types: { key: string; label: string; color: string }[] = [
    { key: 'message', label: 'Messages', color: '#0d9488' },
    { key: 'website', label: 'Websites', color: '#f97316' },
    { key: 'government', label: 'Govt Notifs', color: '#6366f1' },
    { key: 'ocr', label: 'OCR / Ads', color: '#8b5cf6' },
    { key: 'qr', label: 'QR Codes', color: '#06b6d4' },
  ];
  return types
    .map((t) => {
      const subset = scans.filter((s) => s.scan_type === t.key);
      const avg = subset.length > 0 ? Math.round(subset.reduce((sum, s) => sum + s.trust_score, 0) / subset.length) : 0;
      return { label: t.label, value: avg, color: t.color };
    })
    .filter((t) => t.value > 0);
}

function trendingScams(scans: ScanHistoryRow[]): { label: string; count: number; verdict: Verdict }[] {
  const keywordHits = new Map<string, { count: number; verdict: Verdict }>();
  for (const s of scans) {
    if (s.verdict === 'safe') continue;
    const summary = s.input_summary.toLowerCase();
    const terms = [
      'registration fee', 'upi', 'whatsapp', 'guaranteed job', 'limited seats',
      'no exam', 'security deposit', 'govt job', 'army', 'railway', 'ssc', 'direct recruitment',
    ];
    for (const term of terms) {
      if (summary.includes(term)) {
        const existing = keywordHits.get(term) ?? { count: 0, verdict: s.verdict };
        existing.count += 1;
        keywordHits.set(term, existing);
      }
    }
  }
  return Array.from(keywordHits.entries())
    .map(([label, v]) => ({ label, count: v.count, verdict: v.verdict }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function aiRecommendations(stats: DashboardStats, scans: ScanHistoryRow[]): { icon: typeof Bot; text: string; tint: string }[] {
  const recs: { icon: typeof Bot; text: string; tint: string }[] = [];

  if (stats.scamAlerts > stats.safe && stats.total > 2) {
    recs.push({
      icon: AlertTriangle,
      text: `You've encountered more scams (${stats.scamAlerts}) than safe notifications. Be extra cautious of unsolicited job offers and always verify on the official .gov.in portal.`,
      tint: 'bg-danger-50 text-danger-600',
    });
  }

  const feeScams = scans.filter((s) => s.input_summary.toLowerCase().includes('fee') || s.input_summary.toLowerCase().includes('upi'));
  if (feeScams.length > 0) {
    recs.push({
      icon: Lightbulb,
      text: `${feeScams.length} of your scans mentioned fees or UPI payments. Genuine government recruitment never asks for payment via personal UPI — block and report these senders.`,
      tint: 'bg-warning-50 text-warning-600',
    });
  }

  if (stats.avgTrust > 0 && stats.avgTrust < 50) {
    recs.push({
      icon: ShieldCheck,
      text: `Your average trust score is ${stats.avgTrust}/100, meaning most notifications you've checked are risky. Use the Verify Notification tool before responding to any recruitment offer.`,
      tint: 'bg-primary-50 text-primary-600',
    });
  }

  if (stats.highRiskWebsites > 0) {
    recs.push({
      icon: Globe,
      text: `${stats.highRiskWebsites} high-risk website${stats.highRiskWebsites > 1 ? 's' : ''} detected. Avoid entering personal details on non-.gov.in domains posing as recruitment portals.`,
      tint: 'bg-danger-50 text-danger-600',
    });
  }

  if (recs.length === 0 && stats.total > 0) {
    recs.push({
      icon: BadgeCheck,
      text: 'Good news — your recent scans look mostly safe. Stay vigilant and keep verifying every recruitment notification on its official portal.',
      tint: 'bg-success-50 text-success-600',
    });
  }

  if (recs.length === 0) {
    recs.push({
      icon: Zap,
      text: 'Run your first scan to get personalised AI recommendations based on the threats you encounter.',
      tint: 'bg-primary-50 text-primary-600',
    });
  }

  return recs.slice(0, 4);
}

export function DashboardPage() {
  const { user } = useAuth();
  const { scans, loading } = useLiveScans();
  const { reports } = useLiveReports();
  const [verifiedSites, setVerifiedSites] = useState<GovRecord[]>([]);

  useEffect(() => {
    fetchReferenceData()
      .then((d) => setVerifiedSites(d.notifications.slice(0, 6)))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => computeStats(scans), [scans]);
  const donutData = useMemo(() => riskDistribution(scans), [scans]);
  const trustBars = useMemo(() => trustByType(scans), [scans]);
  const trending = useMemo(() => trendingScams(scans), [scans]);
  const recs = useMemo(() => aiRecommendations(stats, scans), [stats, scans]);
  const recent = scans.slice(0, 6);

  const firstName = (user?.email ?? '').split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Greeting + live indicator */}
      <div className="card p-6 sm:p-8 gradient-hero relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-ink-500 font-medium">{today}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-full">
              <Radio size={11} className="animate-pulse" /> Live
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 mt-1">
            {greeting}, {firstName}
          </h2>
          <p className="mt-2 text-ink-600">
            Run a scan to verify any recruitment notification, message, website or
            advertisement. Your dashboard updates automatically as new scans come in.
          </p>
          <Link to="/app/scan-message" className="btn-primary mt-5">
            <MessageSquareWarning size={16} /> Scan a message
          </Link>
        </div>
      </div>

      {/* Live stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total scans" value={stats.total} icon={Activity} tint="bg-primary-50 text-primary-600" loading={loading} />
        <StatCard label="Scam alerts" value={stats.scamAlerts} icon={AlertTriangle} tint="bg-danger-50 text-danger-600" loading={loading} />
        <StatCard label="Safe notifications" value={stats.safe} icon={ShieldCheck} tint="bg-success-50 text-success-600" loading={loading} />
        <StatCard label="High-risk websites" value={stats.highRiskWebsites} icon={Globe} tint="bg-warning-50 text-warning-600" loading={loading} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Suspicious" value={stats.suspicious} icon={TrendingUp} tint="text-warning-600" />
        <MiniStat label="Govt notifications" value={stats.govNotifications} icon={Landmark} tint="text-primary-600" />
        <MiniStat label="Avg trust score" value={stats.avgTrust > 0 ? `${stats.avgTrust}/100` : '—'} icon={BadgeCheck} tint="text-success-600" />
        <MiniStat label="Scam reports" value={reports.length} icon={Flag} tint="text-danger-600" />
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

      {/* Charts row: Risk distribution + Trust analytics */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-600" />
            <h3 className="font-display text-base font-semibold text-ink-900">Risk distribution</h3>
          </div>
          {loading ? (
            <div className="shimmer-bg h-40 rounded-xl animate-shimmer" />
          ) : stats.total === 0 ? (
            <EmptyChart text="No scans yet — run a scan to see your risk breakdown." />
          ) : (
            <DonutChart data={donutData} />
          )}
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-success-600" />
            <h3 className="font-display text-base font-semibold text-ink-900">Trust score analytics</h3>
          </div>
          {loading ? (
            <div className="shimmer-bg h-40 rounded-xl animate-shimmer" />
          ) : trustBars.length === 0 ? (
            <EmptyChart text="No scan data yet — trust scores by type will appear here." />
          ) : (
            <BarChart data={trustBars} maxValue={100} />
          )}
        </div>
      </div>

      {/* AI recommendations */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-accent-500" />
          <h3 className="font-display text-base font-semibold text-ink-900">AI recommendations</h3>
        </div>
        <div className="space-y-3">
          {recs.map((r, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-ink-50/70 p-4">
              <div className={`w-9 h-9 rounded-lg ${r.tint} flex items-center justify-center shrink-0`}>
                <r.icon size={17} />
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trending recruitment scams + Recent scan history */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-danger-500" />
            <h3 className="font-display text-base font-semibold text-ink-900">Trending recruitment scams</h3>
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="shimmer-bg h-12 rounded-xl animate-shimmer" />)}</div>
          ) : trending.length === 0 ? (
            <EmptyChart text="No scam patterns detected in your scans yet." />
          ) : (
            <div className="space-y-2">
              {trending.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-ink-100 last:border-0">
                  <span className="w-7 h-7 rounded-lg bg-danger-50 text-danger-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <p className="text-sm text-ink-700 flex-1 capitalize">{t.label}</p>
                  <span className="chip bg-danger-100 text-danger-700">{t.count} hit{t.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary-600" />
              <h3 className="font-display text-base font-semibold text-ink-900">Recent scan history</h3>
            </div>
            <Link to="/app/history" className="text-sm font-medium text-primary-600 hover:text-primary-700">See all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="shimmer-bg h-14 rounded-xl animate-shimmer" />)}</div>
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

      {/* Recently verified government websites */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BadgeCheck size={18} className="text-success-600" />
          <h3 className="font-display text-base font-semibold text-ink-900">Recently verified government notifications</h3>
        </div>
        {verifiedSites.length === 0 ? (
          <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="shimmer-bg h-12 rounded-xl animate-shimmer" />)}</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {verifiedSites.map((v) => (
              <div key={v.notification_number} className="flex items-center gap-3 rounded-xl border border-ink-200/70 p-3.5 hover:border-success-300 hover:bg-success-50/30 transition">
                <div className="w-9 h-9 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0">
                  <Landmark size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 truncate">{v.recruitment_title}</p>
                  <p className="text-xs text-ink-400">{v.organization} · {v.notification_number}</p>
                </div>
                <a href={v.official_url} target="_blank" rel="noreferrer" className="text-success-600 hover:text-success-700 shrink-0">
                  <ExternalLink size={16} />
                </a>
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
      <p className="font-display text-2xl font-bold text-ink-900 animate-count-up">{loading ? '—' : value}</p>
      <p className="text-sm text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tint }: { label: string; value: number | string; icon: typeof Activity; tint: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <Icon size={20} className={tint} />
      <div>
        <p className="font-display text-lg font-bold text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ink-100 flex items-center justify-center text-ink-400 mb-3">
        <Activity size={22} />
      </div>
      <p className="text-sm text-ink-400 max-w-xs">{text}</p>
    </div>
  );
}
