import { Navigate, Route, Routes } from 'react-router-dom';
import type { UserPublic } from '@uber-clone/shared';
import { ToastHost } from '../components/Toast';
import { useAuth } from '../lib/auth';
import { LoginPage } from '../features/auth/LoginPage';
import { OnboardingScreen } from '../features/auth/OnboardingScreen';
import { RiderApp } from '../features/rider/RiderApp';
import { DriverApp } from '../features/driver/DriverApp';
import { AdminApp } from '../features/admin/AdminApp';

function homeFor(user: UserPublic | null): string {
  if (!user) return '/login';
  if (user.role === 'ADMIN') return '/agency-owner';
  if (user.role === 'DRIVER') return '/driver';
  return '/rider';
}

// If visiting from admin.* subdomain, redirect straight to the agency-owner portal
if (
  typeof window !== 'undefined' &&
  window.location.hostname.startsWith('admin.') &&
  !window.location.pathname.startsWith('/agency-owner')
) {
  window.location.replace('/agency-owner');
}

export function App() {
  const { user, loading, needsOnboarding } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span className="font-display text-2xl font-bold text-kesar">RideShare PK</span>
        <div className="skeleton h-1.5 w-32" />
      </div>
    );
  }

  // First-time Clerk user without a role yet.
  if (needsOnboarding && !user) {
    return (
      <>
        <ToastHost />
        <OnboardingScreen />
      </>
    );
  }

  return (
    <>
      <ToastHost />
      <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={homeFor(user)} /> : <LoginPage />}
      />
      <Route
        path="/rider/*"
        element={user?.role === 'RIDER' ? <RiderApp /> : <Navigate to="/login" />}
      />
      <Route
        path="/driver/*"
        element={user?.role === 'DRIVER' ? <DriverApp /> : <Navigate to="/login" />}
      />
      <Route
        path="/agency-owner/*"
        element={user?.role === 'ADMIN' ? <AdminApp /> : <Navigate to="/login" />}
      />
        <Route path="*" element={<Navigate to={homeFor(user)} />} />
      </Routes>
    </>
  );
}
