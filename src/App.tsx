// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { ToastProvider, useToast } from '@context/ToastContext';
import Security from '@lib/security';
import { C } from '@styles/tokens';
import { ToastStack } from '@components/ui';

// Lazy-load all pages for code splitting
const AuthPage        = lazy(() => import('@components/auth/AuthPage'));
const AppLayout       = lazy(() => import('@components/layout/AppLayout'));
const DashboardPage   = lazy(() => import('@components/features/dashboard/DashboardPage'));
const ConnectPage     = lazy(() => import('@components/features/connect/ConnectPage'));
const MessagesPage    = lazy(() => import('@components/features/messages/MessagesPage'));
const JobsPage        = lazy(() => import('@components/features/jobs/JobsPage'));
const ResourcesPage   = lazy(() => import('@components/features/resources/ResourcesPage'));
const CalculatorPage  = lazy(() => import('@components/features/calculator/CalculatorPage'));
const BlogPage        = lazy(() => import('@components/features/blog/BlogPage'));
const ProfilePage     = lazy(() => import('@components/features/profile/ProfilePage'));
const AdminPage       = lazy(() => import('@components/pages/AdminPage'));
const NotFoundPage    = lazy(() => import('@components/pages/NotFoundPage'));

// Apply Content Security Policy on load
Security.applyCSP();

// ── Protected route wrapper ───────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user)   return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user || !['admin','super_admin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// ── Loading spinner ───────────────────────────────────────────
function PageSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.charcoal }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px', color: 'white' }}>✦</div>
        <div style={{ color: 'white', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, marginBottom: 16 }}>New Horizon</div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.gold}30`, borderTopColor: C.gold, animation: 'spin .8s linear infinite', margin: '0 auto' }} />
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();
  const { toasts, dismiss } = useToast();

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
          <Route path="/resources"  element={<ResourcesPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/blog"       element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPage />} />

          {/* Authenticated — wrapped in AppLayout (sidebar + top bar) */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard"     element={<DashboardPage />} />
            <Route path="/connect"       element={<ConnectPage />} />
            <Route path="/messages"      element={<MessagesPage />} />
            <Route path="/messages/:id"  element={<MessagesPage />} />
            <Route path="/jobs"          element={<JobsPage />} />
            <Route path="/profile"       element={<ProfilePage />} />
          </Route>

          {/* Admin only */}
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

// ── Root app ──────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
