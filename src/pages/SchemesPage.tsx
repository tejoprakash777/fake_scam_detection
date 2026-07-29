import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase, HeartHandshake, GraduationCap, Landmark, Sprout,
  Search, ExternalLink, Loader2, BadgeCheck, ShieldAlert, Info,
} from 'lucide-react';
import { fetchSchemes } from '@/lib/api';
import type { GovSchemeRow } from '@/lib/types';
import { PageHeader } from './ScanMessagePage';
import { toast } from '@/components/Notifications';

const CATEGORIES = [
  { key: 'All', label: 'All schemes', icon: Info },
  { key: 'Employment', label: 'Employment', icon: Briefcase },
  { key: 'Welfare', label: 'Welfare', icon: HeartHandshake },
  { key: 'Skill', label: 'Skill', icon: GraduationCap },
  { key: 'Finance', label: 'Finance', icon: Landmark },
  { key: 'Agriculture', label: 'Agriculture', icon: Sprout },
] as const;

const CAT_TINT: Record<string, string> = {
  Employment: 'bg-primary-50 text-primary-600',
  Welfare: 'bg-accent-50 text-accent-600',
  Skill: 'bg-warning-50 text-warning-600',
  Finance: 'bg-success-50 text-success-600',
  Agriculture: 'bg-primary-50 text-accent-600',
};

export function SchemesPage() {
  const [schemes, setSchemes] = useState<GovSchemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('All');

  useEffect(() => {
    fetchSchemes()
      .then(setSchemes)
      .catch(() => toast('error', 'Could not load scheme directory.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schemes.filter((s) => {
      if (activeCat !== 'All' && s.category !== activeCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q) ||
        s.benefits.toLowerCase().includes(q) ||
        s.eligibility.toLowerCase().includes(q)
      );
    });
  }, [schemes, query, activeCat]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={HeartHandshake}
        title="Government Schemes Directory"
        desc="Browse genuine Indian government welfare, employment, skill, finance and agriculture schemes. Verify any offer you receive against this list — real schemes never ask for registration fees."
      />

      {/* Awareness banner */}
      <div className="card p-5 border-l-4 border-l-warning-400 bg-warning-50/50">
        <div className="flex items-start gap-3">
          <ShieldAlert size={22} className="text-warning-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-display text-sm font-semibold text-ink-900">How scammers misuse these schemes</p>
            <p className="text-sm text-ink-600 mt-1 leading-relaxed">
              Fraudsters send messages offering benefits under PM-KISAN, MUDRA, PMKVY and similar schemes,
              then demand a "registration fee", "processing charge" or your bank/UPI details. Every scheme
              listed below is <span className="font-semibold">100% free to apply</span> — always use the
              official portal link shown here.
            </p>
          </div>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="card p-5">
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-11"
            placeholder="Search by scheme name, ministry or benefit…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = activeCat === c.key;
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'bg-ink-100/80 text-ink-600 hover:bg-ink-200'
                }`}
              >
                <Icon size={15} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="card p-6 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="shimmer-bg h-40 rounded-xl animate-shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-ink-100 mx-auto flex items-center justify-center text-ink-400 mb-3">
            <Search size={26} />
          </div>
          <p className="text-ink-600 font-medium">No schemes found</p>
          <p className="text-sm text-ink-400 mt-1">Try a different search term or category.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-500 px-1">
            Showing {filtered.length} scheme{filtered.length > 1 ? 's' : ''}
            {activeCat !== 'All' ? ` in ${activeCat}` : ''}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((s) => (
              <SchemeCard key={s.id} scheme={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SchemeCard({ scheme }: { scheme: GovSchemeRow }) {
  const [expanded, setExpanded] = useState(false);
  const tint = CAT_TINT[scheme.category] ?? 'bg-ink-100 text-ink-600';
  const Icon =
    scheme.category === 'Employment' ? Briefcase
    : scheme.category === 'Welfare' ? HeartHandshake
    : scheme.category === 'Skill' ? GraduationCap
    : scheme.category === 'Finance' ? Landmark
    : Sprout;

  return (
    <div className="card p-5 hover:shadow-soft transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl ${tint} flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-ink-900 leading-tight">{scheme.name}</h3>
          <p className="text-xs text-ink-400 mt-0.5">{scheme.ministry}</p>
        </div>
        {scheme.verified && (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-success-600 bg-success-50 px-2 py-1 rounded-lg">
            <BadgeCheck size={13} /> Verified
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`chip ${tint} text-xs`}>{scheme.category}</span>
        {scheme.is_free && (
          <span className="chip bg-success-100 text-success-700 text-xs">100% Free</span>
        )}
      </div>

      <div className="space-y-2.5 flex-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Benefits</p>
          <p className="text-sm text-ink-600 leading-relaxed">{scheme.benefits}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Eligibility</p>
          <p className={`text-sm text-ink-600 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {scheme.eligibility}
          </p>
          {scheme.eligibility.length > 120 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 mt-1"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-ink-100">
        <a
          href={scheme.official_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1.5"
        >
          Visit official portal <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
