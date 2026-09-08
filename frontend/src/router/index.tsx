import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

// Super Admin pages
import SuperAdminLogin from '../pages/super-admin/Login';
import SuperAdminForgotPassword from '../pages/super-admin/ForgotPassword';
import SuperAdminChangePassword from '../pages/super-admin/ChangePassword';
import SuperAdminDashboard from '../pages/super-admin/Dashboard';
import SuperAdminCompanies from '../pages/super-admin/Companies';
import SuperAdminCompanyDetail from '../pages/super-admin/CompanyDetail';
import SuperAdminPayments from '../pages/super-admin/Payments';
import SuperAdminSettings from '../pages/super-admin/Settings';
import SuperAdminInvoices from '../pages/super-admin/Invoices';
import SuperAdminAuditLogs from '../pages/super-admin/AuditLogs';
import SuperAdminBackgroundJobs from '../pages/super-admin/BackgroundJobs';
import SuperAdminSystemHealth from '../pages/super-admin/SystemHealth';
import SuperAdminSecurityCenter from '../pages/super-admin/SecurityCenter';
// Client Auth pages
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import ChangePassword from '../pages/auth/ChangePassword';

// Client Dashboard
import Dashboard from '../pages/dashboard/Dashboard';

// Loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Loading...</p>
    </div>
  </div>
);

// Super Admin Route Guard
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSuperAdmin, accessToken } = useAuthStore();
  if (!accessToken || !isSuperAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }
  return <>{children}</>;
};

// Private Route Guard -- normal users
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { accessToken, isSuperAdmin } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/super-admin/dashboard" replace />;
  return <>{children}</>;
};

// Public Route -- logged in hai to redirect
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { accessToken, isSuperAdmin } = useAuthStore();
  if (accessToken) {
    return isSuperAdmin
      ? <Navigate to="/super-admin/dashboard" replace />
      : <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Default redirect
  { path: '/', element: <Navigate to="/login" replace /> },

  // =============================================
  // SUPER ADMIN ROUTES
  // =============================================
  {
    path: '/super-admin/login',
    element: <PublicRoute><SuperAdminLogin /></PublicRoute>,
  },
  {
    path: '/super-admin/forgot-password',
    element: <PublicRoute><SuperAdminForgotPassword /></PublicRoute>,
  },
  {
    path: '/super-admin/change-password',
    element: <SuperAdminRoute><SuperAdminChangePassword /></SuperAdminRoute>,
  },
  {
    path: '/super-admin/dashboard',
    element: <SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>,
  },
  {
    path: '/super-admin/companies',
    element: <SuperAdminRoute><SuperAdminCompanies /></SuperAdminRoute>,
  },
  { path: '/super-admin/security', element: <SuperAdminRoute><SuperAdminSecurityCenter /></SuperAdminRoute> },
  {
    path: '/super-admin/companies/:id',
    element: <SuperAdminRoute><SuperAdminCompanyDetail /></SuperAdminRoute>,
  },
  { path: '/super-admin/audit-logs', element: <SuperAdminRoute><SuperAdminAuditLogs /></SuperAdminRoute> },
  {
  path: '/super-admin/invoices',
  element: <SuperAdminRoute><SuperAdminInvoices /></SuperAdminRoute>,
},
{ path: '/super-admin/background-jobs', element: <SuperAdminRoute><SuperAdminBackgroundJobs /></SuperAdminRoute> },
{ path: '/super-admin/system-health', element: <SuperAdminRoute><SuperAdminSystemHealth /></SuperAdminRoute> },
  { path: '/super-admin/settings', element: <SuperAdminRoute><SuperAdminSettings /></SuperAdminRoute> },
  {
    path: '/super-admin/payments',
    element: <SuperAdminRoute><SuperAdminPayments /></SuperAdminRoute>,
  },


  // =============================================
  // CLIENT AUTH ROUTES
  // =============================================
  {
    path: '/login',
    element: <PublicRoute><Login /></PublicRoute>,
  },
  {
    path: '/forgot-password',
    element: <PublicRoute><ForgotPassword /></PublicRoute>,
  },
  {
    path: '/reset-password',
    element: <PublicRoute><ResetPassword /></PublicRoute>,
  },
  {
    path: '/change-password',
    element: <PrivateRoute><ChangePassword /></PrivateRoute>,
  },

  // =============================================
  // CLIENT DASHBOARD
  // =============================================
  {
    path: '/dashboard',
    element: <PrivateRoute><Dashboard /></PrivateRoute>,
  },

  // 404 -- login pe redirect
  { path: '*', element: <Navigate to="/login" replace /> },
]);