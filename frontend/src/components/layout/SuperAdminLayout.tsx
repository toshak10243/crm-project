import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileText,
  LogOut,
  ChevronLeft,
  Layers,
  ChevronRight,
  ClipboardList,
  Activity,
  Shield,
  Bell,
  Settings,
  Settings2,
  Menu,
  X,
} from 'lucide-react';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  pendingCount?: number;
}

const navItems = [
  { label: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Companies', path: '/super-admin/companies', icon: Building2 },
  { label: 'Payments', path: '/super-admin/payments', icon: CreditCard, badge: true },
  { label: 'Invoices', path: '/super-admin/invoices', icon: FileText },
  { label: 'Audit Logs', path: '/super-admin/audit-logs', icon: ClipboardList },
  { label: 'Security', path: '/super-admin/security', icon: Shield },
  { label: 'Background Jobs', path: '/super-admin/background-jobs', icon: Layers },
  { label: 'System Health', path: '/super-admin/system-health', icon: Activity },
  { label: 'Settings', path: '/super-admin/settings', icon: Settings2 },
];

const SuperAdminLayout = ({ children, pendingCount = 0 }: SuperAdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/super-admin/login'); };
  const currentPage = navItems.find((n) => n.path === location.pathname);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center border-b border-white/[0.06] ${collapsed ? 'justify-center px-4 py-5' : 'gap-3 px-5 py-5'}`}>
<div className={`flex-shrink-0 ${collapsed ? 'w-9 h-9' : 'w-10 h-10'}`}>
  <img
    src="/logo.png"
    alt="Logo"
    className="w-full h-full object-contain rounded-lg"
    onError={(e) => {
      e.currentTarget.style.display = 'none';
    }}
  />
</div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-white font-bold text-[15px] leading-tight tracking-tight">CRM System</h1>
            <p className="text-slate-400 text-[11px] font-medium tracking-wide mt-0.5">Super Admin</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        {!collapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Main Menu</p>}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all duration-150 relative group
                  ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                  ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/[0.07]'}`}>
                <item.icon className={`flex-shrink-0 ${collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && pendingCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && pendingCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0f172a]" />
                )}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                    {item.badge && pendingCount > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{pendingCount}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] space-y-0.5">
        <button onClick={() => navigate('/super-admin/change-password')}
          title={collapsed ? 'Change Password' : undefined}
          className={`w-full flex items-center rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all duration-150 group relative
            ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}>
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Change Password</span>}
          {collapsed && <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">Change Password</div>}
        </button>

        <div className={`flex items-center rounded-lg bg-white/[0.04] border border-white/[0.06] mt-2
          ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-3'}`}>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-blue-500/30">
            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold truncate leading-tight">{user?.name || 'Super Admin'}</p>
              <p className="text-slate-500 text-[11px] truncate mt-0.5">{user?.email || ''}</p>
            </div>
          )}
        </div>

        <button onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 group relative
            ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}>
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
          {collapsed && <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">Logout</div>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">
      {mobileOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-30 transition-all duration-300 ease-in-out bg-[#0f172a] ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-blue-300 transition-all z-50">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />}
        </button>
      </aside>

      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-[#0f172a] z-50 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'}`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-14">
          <div className="px-5 h-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{currentPage?.label || 'Super Admin'}</p>
                <p className="text-[11px] text-slate-400 hidden sm:block">CRM System Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {pendingCount > 0 && (
                <button onClick={() => navigate('/super-admin/payments')} className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  <Bell className="w-[18px] h-[18px]" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </button>
              )}
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <div className="flex items-center gap-2.5 pl-1">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-blue-100">
                  {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[13px] font-semibold text-slate-900 leading-tight">{user?.name || 'Super Admin'}</p>
                  <p className="text-[11px] text-slate-400">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>

        <footer className="px-6 py-3 border-t border-slate-200 bg-white">
          <p className="text-[11px] text-slate-400 text-center">
            CRM System &copy; {new Date().getFullYear()} &mdash; Super Admin Panel &mdash; All rights reserved
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SuperAdminLayout;