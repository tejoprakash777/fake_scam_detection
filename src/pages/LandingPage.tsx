import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  ShieldCheck, MessageSquareWarning, Landmark, Globe, ScanText, QrCode,
  ArrowRight, CheckCircle2, Sparkles, BarChart3,
} from 'lucide-react';

const FEATURES = [
  { icon: MessageSquareWarning, title: 'Scam Message Detection', desc: 'Paste WhatsApp/SMS/email recruitment messages. AI flags scam keywords, urgency, fees & fake promises.' },
  { icon: Landmark, title: 'Government Verification', desc: 'Verify notifications against SSC, UPSC, RRB, State PSC and other official .gov.in records.' },
  { icon: Globe, title: 'Website Scam Detection', desc: 'Analyse URLs for HTTPS, domain age, phishing keywords, blacklist status and govt domain trust.' },
  { icon: ScanText, title: 'OCR Advertisement Scanner', desc: 'Upload posters, screenshots or PDFs. OCR extracts text and runs the same scam analysis.' },
  { icon: QrCode, title: 'QR Code Scanner', desc: 'Scan QR codes from recruitment ads — decoded text is analysed as a URL or message instantly.' },
  { icon: BarChart3, title: 'AI Trust Score Engine', desc: 'Every scan returns a 0–100 trust score, scam probability, risk level and clear recommendation.' },
];

const STEPS = [
  { n: '01', title: 'Paste or upload', desc: 'Share a message, URL, notification details, ad image or QR code.' },
  { n: '02', title: 'AI analyses', desc: 'NLP + heuristics + reference data cross-check produce a trust score.' },
  { n: '03', title: 'Act with confidence', desc: 'Get a clear verdict — Safe, Suspicious or Fake — and next steps.' },
];

export function LandingPage() {
  const { user } = useAuth();
  const cta = user ? '/app/dashboard' : '/register';

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-ink-200/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-brand text-white flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">FraudGuard</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-600">
            <a href="#features" className="hover:text-ink-900 transition">Features</a>
            <a href="#how" className="hover:text-ink-900 transition">How it works</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link to="/login" className="text-sm font-semibold text-ink-600 hover:text-ink-900 transition px-3 py-2">Sign in</Link>
            <Link to={cta} className="btn-primary text-sm">
              Get started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-20 pb-24 lg:pt-28 lg:pb-32 relative overflow-hidden">
        <div className="absolute top-10 -right-20 w-96 h-96 rounded-full bg-primary-100/40 blur-3xl -z-10" />
        <div className="absolute top-40 -left-20 w-80 h-80 rounded-full bg-accent-100/30 blur-3xl -z-10" />

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div className="animate-slide-up">
            <span className="chip bg-primary-100 text-primary-700 border border-primary-200 mb-6">
              <Sparkles size={14} /> AI · NLP · OCR · ML
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold text-ink-900 leading-[1.07] tracking-tight">
              Detect <span className="text-gradient">fake government job</span> recruitment scams instantly.
            </h1>
            <p className="mt-6 text-lg text-ink-600 leading-relaxed max-w-xl">
              FraudGuard analyses recruitment notifications, messages, websites and
              advertisements using AI — comparing them against trusted government
              sources to give you a clear trust score.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={cta} className="btn-primary text-base px-7 py-3.5">
                Start scanning <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn-outline text-base px-7 py-3.5">Explore features</a>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={16} className="text-success-500" /> No setup required</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={16} className="text-success-500" /> 22+ verified portals</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={16} className="text-success-500" /> Instant results</span>
            </div>
          </div>

          {/* Hero card */}
          <div className="animate-scale-in">
            <div className="card p-6 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-ink-400 font-medium uppercase tracking-wide">Analysis Result</p>
                  <p className="font-display text-lg font-bold text-ink-900">Recruitment message</p>
                </div>
                <span className="chip bg-danger-100 text-danger-700"><ShieldCheck size={14} /> Fake</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl bg-ink-50 p-4 text-center">
                  <p className="font-display text-3xl font-bold text-danger-600">82%</p>
                  <p className="text-xs text-ink-500 mt-0.5">Scam probability</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4 text-center">
                  <p className="font-display text-3xl font-bold text-ink-700">18<span className="text-base text-ink-400">/100</span></p>
                  <p className="text-xs text-ink-500 mt-0.5">Trust score</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  ['Registration fee requested', 'danger'],
                  ['UPI handle detected', 'danger'],
                  ['Urgency / pressure tactics', 'warning'],
                ].map(([t, c]) => (
                  <div key={t} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                    c === 'danger' ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-warning-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c === 'danger' ? 'bg-danger-500' : 'bg-warning-500'}`} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white border-y border-ink-200/70">
        <div className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-900">Everything you need to spot a scam</h2>
            <p className="mt-4 text-ink-600 text-lg">Six powerful detection tools in one place, all powered by the same AI trust-score engine.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-ink-200/70 bg-white p-6 hover:border-primary-200 hover:shadow-glow transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-600 leading-relaxed">{f.desc}</p>
              </div>
              ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-900">How it works</h2>
          <p className="mt-4 text-ink-600 text-lg">Three steps from a suspicious message to a confident decision.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n} className="relative">
              <div className="font-display text-5xl font-bold text-primary-200">{s.n}</div>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-ink-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pb-24">
        <div className="rounded-4xl gradient-brand text-white p-12 lg:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Protect yourself from recruitment fraud</h2>
            <p className="mt-3 text-white/80 text-lg max-w-xl mx-auto">Create a free account and run your first scan in seconds.</p>
            <Link to={cta} className="mt-8 inline-flex items-center gap-2 bg-white text-primary-700 font-semibold rounded-xl px-7 py-3.5 hover:bg-white/90 hover:-translate-y-0.5 transition-all duration-200">
              Get started free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200/70 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary-600" />
            <span className="font-semibold text-ink-700">FraudGuard</span>
            <span>· B.Tech Project</span>
          </div>
          <p>AI-Powered Fake Government Job Recruitment Scam Detection</p>
        </div>
      </footer>
    </div>
  );
}
