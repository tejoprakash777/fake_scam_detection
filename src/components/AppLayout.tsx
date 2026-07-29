import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { NotificationHost, toast } from '@/components/Notifications';
import {
  LayoutDashboard, MessageSquareWarning, Landmark, Globe, ScanText,
  QrCode, History, Flag, LogOut, Menu, X, ShieldCheck, Bell, ChevronRight, HeartHandshake,
} from 'lucide-react';

const NAV = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & quick actions' },
  { to: '/app/scan-message', label: 'Scan Scam Message', icon: MessageSquareWarning, desc: 'NLP analysis of messages' },
  { to: '/app/verify-government', label: 'Verify Notification', icon: Landmark, desc: 'Check against govt records' },
  { to: '/app/check-website', label: 'Check Website', icon: Globe, desc: 'URL & phishing detection' },
  { to: '/app/scan-ocr', label: 'OCR Scanner', icon: ScanText, desc: 'Analyse ad images / PDFs' },
  { to: '/app/scan-qr', label: 'Scan QR Code', icon: QrCode, desc: 'Decode & verify QR codes' },
  { to: '/app/schemes', label: 'Govt Schemes', icon: HeartHandshake, desc: 'Browse genuine govt schemes' },
  { to: '/app/history', label: 'History', icon: History, desc: 'Past scans & results' },
  { to: '/app/report', label: 'Report Scam', icon: Flag, desc: 'Submit a scam report' },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    toast('info', 'Signed out.');
    navigate('/login');
  };

  const current = NAV.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-ink-200/70 bg-white">
        <SidebarContent current={current?.to} onSignOut={handleSignOut} email={user?.email ?? ''} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-white shadow-card flex flex-col animate-slide-in-right">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-ink-400 hover:text-ink-600 z-10">
              <X size={20} />
            </button>
            <SidebarContent current={current?.to} onSignOut={handleSignOut} email={user?.email ?? ''} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-ink-200/60">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button className="lg:hidden text-ink-600" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-ink-900 truncate">{current?.label ?? 'FraudGuard'}</h1>
              <p className="text-xs text-ink-400 truncate hidden sm:block">{current?.desc}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => toast('info', 'No new alerts. We will notify you when a fake recruitment is detected.')}
                className="relative w-10 h-10 rounded-xl bg-ink-100/80 hover:bg-ink-200 flex items-center justify-center text-ink-600 transition hover:-translate-y-0.5"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent-500" />
              </button>
              <div className="hidden sm:flex items-center gap-2 rounded-xl bg-ink-100/80 px-3 py-2">
                <div className="w-7 h-7 rounded-lg gradient-brand text-white flex items-center justify-center text-xs font-bold">
                  {(user?.email ?? 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-ink-700 font-medium max-w-[160px] truncate">{user?.email ?? ''}</span>
              </div>
              <button onClick={handleSignOut} className="w-10 h-10 rounded-xl bg-ink-100/80 hover:bg-danger-100 hover:text-danger-600 flex items-center justify-center text-ink-600 transition hover:-translate-y-0.5" aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <NotificationHost />
    </div>
  );
}

function SidebarContent({ current, onSignOut, email }: { current?: string; onSignOut: () => void; email: string }) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b border-ink-200/70 shrink-0">
        <div className="w-10 h-10 rounded-xl gradient-brand text-white flex items-center justify-center">
          <ShieldCheck size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-ink-900">FraudGuard</h2>
          <p className="text-[11px] text-ink-400 truncate">{email || 'AI Scam Detection'}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-ink-600 hover:bg-ink-100/70 hover:text-ink-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={isActive ? 'text-primary-600' : 'text-ink-400 group-hover:text-ink-600'} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-primary-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-ink-200/70 shrink-0">
        <button onClick={onSignOut} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-danger-50 hover:text-danger-600 transition">
          <LogOut size={18} className="text-ink-400" />
          Sign out
        </button>
      </div>
    </>
  );
}
