import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/Notifications';
import { ShieldCheck, Mail, Lock, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot';

export function AuthPage({ mode }: { mode: Mode }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) toast('error', error);
        else toast('success', 'Welcome back!');
      } else if (mode === 'register') {
        const { error } = await signUp(email, password);
        if (error) toast('error', error);
        else toast('success', 'Account created. You are signed in.');
      } else {
        const { error } = await resetPassword(email);
        if (error) toast('error', error);
        else { setDone(true); toast('success', 'Reset link sent to your email.'); }
      }
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset password';
  const subtitle = mode === 'login' ? 'Sign in to continue detecting scams.'
    : mode === 'register' ? 'Start verifying recruitment ads in seconds.'
    : 'Enter your email and we will send a reset link.';
  const cta = mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link';

  return (
    <div className="min-h-screen flex flex-col bg-ink-50 relative overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-primary-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-accent-200/25 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-success-100/20 blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px] animate-slide-up">
          {/* Brand */}
          <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-brand text-white flex items-center justify-center shadow-soft">
              <ShieldCheck size={22} />
            </div>
            <span className="font-display text-xl font-bold text-ink-900">FraudGuard</span>
          </Link>

          <div className="card p-7 sm:p-8">
            <h2 className="font-display text-[26px] font-bold text-ink-900 tracking-tight text-center">{title}</h2>
            <p className="text-sm text-ink-500 mt-2 mb-7 text-center">{subtitle}</p>

            {done ? (
              <div className="rounded-xl bg-success-50 border border-success-200 p-5 text-center">
                <div className="w-11 h-11 rounded-full bg-success-100 text-success-600 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 size={22} />
                </div>
                <p className="text-sm font-medium text-success-800">Reset link sent.</p>
                <p className="text-xs text-success-700/80 mt-1">Check your inbox and spam folder.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <Field icon={<Mail size={17} />} label="Email">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11" placeholder="you@example.com" />
                </Field>
                {mode !== 'forgot' && (
                  <Field icon={<Lock size={17} />} label="Password">
                    <input type={show ? 'text' : 'password'} required minLength={6} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-11 pr-11" placeholder="At least 6 characters" />
                    <button type="button" onClick={() => setShow((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </Field>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition">
                      Forgot password?
                    </Link>
                  </div>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full mt-1">
                  {busy ? <Loader2 size={17} className="animate-spin-slow" /> : null}
                  {cta}
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-ink-100 text-center text-sm text-ink-500">
              {mode === 'login' ? (
                <>No account yet? <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">Sign up</Link></>
              ) : mode === 'register' ? (
                <>Already registered? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link></>
              ) : (
                <>Remember it? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link></>
              )}
            </div>
          </div>

          <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-ink-400 hover:text-ink-600 transition">
            <ArrowLeft size={15} /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}
