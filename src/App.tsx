import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NotificationHost } from '@/components/Notifications';
import { AppLayout } from '@/components/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ScanMessagePage } from '@/pages/ScanMessagePage';
import { VerifyGovernmentPage } from '@/pages/VerifyGovernmentPage';
import { CheckWebsitePage } from '@/pages/CheckWebsitePage';
import { ScanOcrPage } from '@/pages/ScanOcrPage';
import { ScanQrPage } from '@/pages/ScanQrPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ReportScamPage } from '@/pages/ReportScamPage';
import { ShieldCheck } from 'lucide-react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-brand text-white flex items-center justify-center animate-pulse-ring">
            <ShieldCheck size={24} />
          </div>
          <p className="text-sm text-ink-500">Loading FraudGuard…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><AuthPage mode="register" /></PublicOnly>} />
          <Route path="/forgot-password" element={<PublicOnly><AuthPage mode="forgot" /></PublicOnly>} />

          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="scan-message" element={<ScanMessagePage />} />
            <Route path="verify-government" element={<VerifyGovernmentPage />} />
            <Route path="check-website" element={<CheckWebsitePage />} />
            <Route path="scan-ocr" element={<ScanOcrPage />} />
            <Route path="scan-qr" element={<ScanQrPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="report" element={<ReportScamPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NotificationHost />
      </BrowserRouter>
    </AuthProvider>
  );
}
