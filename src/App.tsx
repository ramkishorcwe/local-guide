import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import { useAdminAuth } from './hooks/useAdminAuth';
const GuestApp = lazy(() => import('./pages/GuestApp'));
const TripView = lazy(() => import('./pages/TripView'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
function Loading() { return <div className="mx-auto max-w-5xl space-y-5 p-8" role="status" aria-label="Loading Local Guide"><div className="skeleton h-12 w-1/3" /><div className="skeleton h-96" /></div>; }
function Admin() {
  const { user, loading } = useAdminAuth();
  if (loading) return <Loading />;
  if (!user) return <AdminLogin onSuccess={() => undefined} />;
  return <AdminDashboard onLogout={() => undefined} />;
}
export default function App() {
  return <ErrorBoundary><MotionConfig reducedMotion="user"><BrowserRouter><Suspense fallback={<Loading />}>
    <Routes><Route path="/" element={<GuestApp />} /><Route path="/admin" element={<Admin />} /><Route path="/trip/:code" element={<TripView />} />
      <Route path="*" element={<main className="p-10 text-center"><h1 className="mb-5 text-2xl">This path hasn’t been explored yet.</h1><Link to="/" className="text-gold">Back to Local Guide</Link></main>} />
    </Routes>
  </Suspense></BrowserRouter></MotionConfig></ErrorBoundary>;
}
