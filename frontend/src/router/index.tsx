import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

// Super Admin pages
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

// CRM Pages
import MasterDashboard from '../pages/dashboard/Dashboard';
import AddLeadPage from '../pages/leads/AddLead';
import AllLeadsPage from '../pages/leads/AllLeads';
import ViewLeadPage from '../pages/leads/ViewLead';
import FollowupsPage from '../pages/leads/Followups';
import TodayBirthdayPage from '../pages/leads/TodayBirthday';
import BranchPage from '../pages/masters/Branch';
import FormFieldsPage from '../pages/masters/FormFields';
import AdminUsersPage from '../pages/users/AdminUsers';
import MasterAdminsPage from '../pages/users/MasterAdmins';
import SettingsPage from '../pages/settings/Settings';
import WorkReportPage from '../pages/reports/WorkReport';
import IvrPage from '../pages/finance/IvrPage';
import WaDaddyPage from '../pages/finance/WaDaddyPage';
import DigiMailPage from '../pages/digimail/DigiMail';
import QuotationsPage from '../pages/finance/Quotations';
import ViewQuotationPage from '../pages/finance/ViewQuotation';
import InvoicesPage from '../pages/finance/Invoices';
import PublicQuotationView from '../pages/finance/PublicQuotationView';
import PublicInvoiceView from '../pages/finance/PublicInvoiceView';

// Super Admin Route Guard
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSuperAdmin, accessToken } = useAuthStore();
  if (!accessToken || !isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Private Route Guard -- CRM users (Admin / Agent)
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
  // SINGLE UNIFIED LOGIN
  // =============================================
  {
    path: '/login',
    element: <PublicRoute><Login /></PublicRoute>,
  },
  {
    path: '/super-admin/login',
    element: <Navigate to="/login" replace />,
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
  {
    path: '/master/changePassword',
    element: <PrivateRoute><ChangePassword /></PrivateRoute>,
  },

  // =============================================
  // SUPER ADMIN ROUTES
  // =============================================
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
  // ACTUAL CRM ROUTES (MASTER ADMIN & SALES)
  // =============================================
  {
    path: '/dashboard',
    element: <PrivateRoute><MasterDashboard /></PrivateRoute>,
  },
  {
    path: '/master/masterDashboard',
    element: <PrivateRoute><MasterDashboard /></PrivateRoute>,
  },
  // Add Lead Routes (both URLs supported)
  {
    path: '/crm/add-lead',
    element: <PrivateRoute><AddLeadPage /></PrivateRoute>,
  },
  {
    path: '/master/addLead',
    element: <PrivateRoute><AddLeadPage /></PrivateRoute>,
  },
  // All Leads (supports both /master/lead and /crm/all-leads)
  {
    path: '/master/lead',
    element: <PrivateRoute><AllLeadsPage /></PrivateRoute>,
  },
  {
    path: '/crm/all-leads',
    element: <PrivateRoute><AllLeadsPage /></PrivateRoute>,
  },
  // View Lead Details Page (supports both /master/viewLead/:id and /crm/view-lead/:id)
  {
    path: '/master/viewLead/:id',
    element: <PrivateRoute><ViewLeadPage /></PrivateRoute>,
  },
  {
    path: '/crm/view-lead/:id',
    element: <PrivateRoute><ViewLeadPage /></PrivateRoute>,
  },
  {
    path: '/crm/today-followup',
    element: <PrivateRoute><FollowupsPage todayOnly={true} /></PrivateRoute>,
  },
  {
    path: '/master/followup',
    element: <PrivateRoute><FollowupsPage todayOnly={true} /></PrivateRoute>,
  },
  {
    path: '/crm/all-followup',
    element: <PrivateRoute><FollowupsPage todayOnly={false} /></PrivateRoute>,
  },
  {
    path: '/master/allfollowup',
    element: <PrivateRoute><FollowupsPage todayOnly={false} /></PrivateRoute>,
  },
  {
    path: '/crm/today-birthday',
    element: <PrivateRoute><TodayBirthdayPage /></PrivateRoute>,
  },
  {
    path: '/master/birthday',
    element: <PrivateRoute><TodayBirthdayPage /></PrivateRoute>,
  },
  {
    path: '/master/today-birthday',
    element: <PrivateRoute><TodayBirthdayPage /></PrivateRoute>,
  },
  // IVR dropdown (both /ivr/... and /master/ivr/... supported)
  {
    path: '/ivr/incoming',
    element: <PrivateRoute><IvrPage type="incoming" /></PrivateRoute>,
  },
  {
    path: '/master/ivr/incoming',
    element: <PrivateRoute><IvrPage type="incoming" /></PrivateRoute>,
  },
  {
    path: '/ivr/outgoing',
    element: <PrivateRoute><IvrPage type="outgoing" /></PrivateRoute>,
  },
  {
    path: '/master/ivr/outgoing',
    element: <PrivateRoute><IvrPage type="outgoing" /></PrivateRoute>,
  },
  // Master dropdown (Admin only)
  {
    path: '/master/branch',
    element: <PrivateRoute><BranchPage /></PrivateRoute>,
  },
  {
    path: '/master/form-fields',
    element: <PrivateRoute><FormFieldsPage /></PrivateRoute>,
  },
  {
    path: '/master/formFields',
    element: <PrivateRoute><FormFieldsPage /></PrivateRoute>,
  },
  // Admin User dropdown (Admin only)
  {
    path: '/admin-users',
    element: <PrivateRoute><AdminUsersPage /></PrivateRoute>,
  },
  {
    path: '/master/adminUser',
    element: <PrivateRoute><AdminUsersPage /></PrivateRoute>,
  },
  {
    path: '/admin-users/master',
    element: <PrivateRoute><MasterAdminsPage /></PrivateRoute>,
  },
  {
    path: '/master/masters',
    element: <PrivateRoute><MasterAdminsPage /></PrivateRoute>,
  },
  // Settings
  {
    path: '/settings',
    element: <PrivateRoute><SettingsPage /></PrivateRoute>,
  },
  // WA Daddy dropdown
  {
    path: '/wa-daddy/contacts',
    element: <PrivateRoute><WaDaddyPage view="contacts" /></PrivateRoute>,
  },
  {
    path: '/wa-daddy/campaigns',
    element: <PrivateRoute><WaDaddyPage view="campaigns" /></PrivateRoute>,
  },
  {
    path: '/wa-daddy/templates',
    element: <PrivateRoute><WaDaddyPage view="templates" /></PrivateRoute>,
  },
  {
    path: '/wa-daddy/chat',
    element: <PrivateRoute><WaDaddyPage view="chat" /></PrivateRoute>,
  },
  // DigiMail (Bulk Email & Campaign Hub)
  {
    path: '/digimail',
    element: <PrivateRoute><DigiMailPage /></PrivateRoute>,
  },
  // Work Report
  {
    path: '/work-report',
    element: <PrivateRoute><WorkReportPage /></PrivateRoute>,
  },
  // Quotations & Invoices (Protected CRM Routes)
  {
    path: '/quotations',
    element: <PrivateRoute><QuotationsPage /></PrivateRoute>,
  },
  {
    path: '/quotations/view/:id',
    element: <PrivateRoute><ViewQuotationPage /></PrivateRoute>,
  },
  {
    path: '/invoices',
    element: <PrivateRoute><InvoicesPage /></PrivateRoute>,
  },
  // Public Client Quotation & Invoice Views (No auth required)
  {
    path: '/quote/:token',
    element: <PublicQuotationView />,
  },
  {
    path: '/invoice/:token',
    element: <PublicInvoiceView />,
  },

  // Fallback
  { path: '*', element: <Navigate to="/login" replace /> },
]);
