import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';

export const CrmLayout: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Fetch Company About info (for Sidebar logo & dynamic company name)
  const { data: aboutData } = useQuery({
    queryKey: ['settings-about-company'],
    queryFn: async () => {
      const res = await api.get('/settings/about-company');
      return res.data?.data;
    },
    staleTime: 60 * 1000,
  });

  const companyLogo = aboutData?.logoUrl || '';
  const companyTitle = aboutData?.brandName || aboutData?.companyName || '';

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    CRM: true,
    IVR: false,
    Master: false,
    'Admin User': false,
    'WA Daddy': false,
  });

  // Automatically keep submenus open based on active route
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    setOpenDropdowns((prev) => ({
      ...prev,
      CRM: p.includes('/crm/') || prev.CRM,
      IVR: p.includes('/ivr/') || prev.IVR,
      Master: p.includes('/master/') || p.includes('/change-password') || prev.Master,
      'Admin User': p.includes('/admin-user') || prev['Admin User'],
      'WA Daddy': p.includes('/wa-daddy/') || prev['WA Daddy'],
    }));
  }, [location.pathname]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic Route Breadcrumb & Title Helper
  const getPageInfo = () => {
    const p = location.pathname.toLowerCase();
    if (p.includes('branch')) return { breadcrumb: 'Branch', title: 'Branch' };
    if (p.includes('form-field') || p.includes('formfield')) return { breadcrumb: 'FormFields', title: 'FormFields' };
    if (p.includes('view-lead') || p.includes('viewlead')) return { breadcrumb: 'Lead', title: 'View Lead' };
    if (p.includes('add-lead') || p.includes('addlead')) return { breadcrumb: 'Lead', title: 'Add Lead' };
    if (p.includes('all-followup') || p.includes('allfollowup')) return { breadcrumb: 'Allfollowup', title: 'Allfollowup' };
    if (p.includes('today-followup') || p.endsWith('/followup') || p.includes('followup')) return { breadcrumb: 'Followup', title: 'Followup' };
    if (p.includes('birthday')) return { breadcrumb: 'Birthdays', title: 'Birthdays' };
    if (p.includes('all-leads') || p.includes('/lead')) return { breadcrumb: 'Lead', title: 'Lead' };
    if (p.includes('incoming')) return { breadcrumb: 'Incoming', title: 'Incoming' };
    if (p.includes('outgoing')) return { breadcrumb: 'Outgoing', title: 'Outgoing' };
    if (p.includes('masters') || p.includes('admin-users/master')) return { breadcrumb: 'Masters', title: 'Masters' };
    if (p.includes('admin-user') || p.includes('adminuser')) return { breadcrumb: 'AdminUser', title: 'AdminUser' };
    if (p.includes('setting')) return { breadcrumb: 'Setting', title: 'Setting' };
    if (p.includes('work-report')) return { breadcrumb: 'Work Report', title: 'Work Report' };
    if (p.includes('change-password') || p.includes('changepassword')) return { breadcrumb: 'ChangePassword', title: 'ChangePassword' };
    return { breadcrumb: 'MasterDashboard', title: 'MasterDashboard' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 antialiased font-sans overflow-hidden">
      {/* Sidebar - Fixed Left */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-slate-200 select-none shadow-sm">
        {/* Brand / Logo Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3 overflow-hidden">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt="Logo"
              className="h-10 max-w-[50px] object-contain flex-shrink-0"
            />
          ) : null}
          <div className="flex flex-col min-w-0">
            {companyTitle ? (
              <>
                <span className="text-base font-bold tracking-tight text-[#003884] truncate leading-tight">
                  {companyTitle}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">CRM</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold tracking-tight text-[#003884] leading-tight">
                  Lead Management
                </span>
                <span className="text-[10px] text-slate-400 font-medium">CRM</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 text-sm scrollbar-thin">
          {/* Master Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold transition-all ${isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Master Dashboard</span>
          </NavLink>

          {/* CRM Section */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleDropdown('CRM')}
              className="w-full flex items-center justify-between px-3.5 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-semibold transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>CRM</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdowns['CRM'] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdowns['CRM'] && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                <NavLink
                  to="/crm/add-lead"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Add Lead
                </NavLink>
                <NavLink
                  to="/crm/all-leads"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  All Lead
                </NavLink>
                <NavLink
                  to="/crm/today-followup"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Today Followup
                </NavLink>
                <NavLink
                  to="/crm/all-followup"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  All Followup
                </NavLink>
                <NavLink
                  to="/crm/today-birthday"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Today Birthday
                </NavLink>
              </div>
            )}
          </div>

          {/* IVR Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleDropdown('IVR')}
              className="w-full flex items-center justify-between px-3.5 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-semibold transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>IVR</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdowns['IVR'] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdowns['IVR'] && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                <NavLink
                  to="/ivr/incoming"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Incoming Call
                </NavLink>
                <NavLink
                  to="/ivr/outgoing"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Outgoing Call
                </NavLink>
              </div>
            )}
          </div>

          {/* Master Section (Admin Only) */}
          {isAdmin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleDropdown('Master')}
                className="w-full flex items-center justify-between px-3.5 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-semibold transition-all"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Master</span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdowns['Master'] ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdowns['Master'] && (
                <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                  <NavLink
                    to="/master/branch"
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`
                    }
                  >
                    Branch
                  </NavLink>
                  <NavLink
                    to="/master/form-fields"
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`
                    }
                  >
                    Form Fields
                  </NavLink>
                  <NavLink
                    to="/change-password"
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`
                    }
                  >
                    Change Password
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Admin User Section (Admin Only) */}
          {isAdmin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleDropdown('Admin User')}
                className="w-full flex items-center justify-between px-3.5 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-semibold transition-all"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Admin User</span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdowns['Admin User'] ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdowns['Admin User'] && (
                <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                  <NavLink
                    to="/admin-users"
                    end
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`
                    }
                  >
                    Admin User
                  </NavLink>
                  <NavLink
                    to="/admin-users/master"
                    end
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`
                    }
                  >
                    Master
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Setting */}
          {isAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold transition-all ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Setting</span>
            </NavLink>
          )}

          {/* WA Daddy */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleDropdown('WA Daddy')}
              className="w-full flex items-center justify-between px-3.5 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-semibold transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 flex-shrink-0 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 2a9.967 9.967 0 00-8.528 15.176L2 22l4.981-1.472A9.963 9.963 0 0012.031 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.286c-1.579 0-3.08-.432-4.385-1.246l-.315-.196-3.238.956.974-3.158-.21-.334a8.251 8.251 0 01-1.267-4.308c0-4.57 3.717-8.286 8.441-8.286 4.653 0 8.44 3.716 8.44 8.286 0 4.57-3.787 8.286-8.235 8.286z" />
                </svg>
                <span>WA Daddy</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdowns['WA Daddy'] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdowns['WA Daddy'] && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                <NavLink
                  to="/wa-daddy/contacts"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Contacts
                </NavLink>
                <NavLink
                  to="/wa-daddy/campaigns"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Campaigns
                </NavLink>
                <NavLink
                  to="/wa-daddy/templates"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Templates
                </NavLink>
                <NavLink
                  to="/wa-daddy/chat"
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  Chat
                </NavLink>
              </div>
            )}
          </div>

          {/* Work Report */}
          {isAdmin && (
            <NavLink
              to="/work-report"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold transition-all ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Work Report</span>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc]">
        {/* Top Navbar / Header with Fullscreen Button */}
        <header className="h-16 flex-shrink-0 bg-transparent px-8 flex items-center justify-between">
          {/* Breadcrumbs matching current route */}
          <div className="flex flex-col">
            <div className="text-xs text-slate-500 font-medium">
              Pages <span className="mx-1">/</span>{' '}
              <span className="text-slate-700 font-semibold">{pageInfo.breadcrumb}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">
              {pageInfo.title}
            </h1>
          </div>

          {/* Right Action Icons & Profile Dropdown */}
          <div className="flex items-center gap-3 relative" ref={profileRef}>
            {/* Fullscreen Toggle Button (Placed before lock button) */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0m-5 0l0 5M15 9l5-5m0 0l-5 0m5 0l0 5M9 15l-5 5m0 0l5 0m-5 0l0-5M15 15l5 5m0 0l-5 0m5 0l0-5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* Lock / Security Button */}
            <button
              title="Security Center"
              onClick={() => navigate('/change-password')}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>

            {/* Profile Avatar / Initials Button */}
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 hover:bg-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center transition-colors select-none"
            >
              {user?.name
                ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                : 'SC'}
            </button>

            {/* Profile Popup Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-3 px-4 z-50 text-xs text-slate-700 space-y-3">
                <div className="border-b border-slate-100 pb-2.5">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>Hey, {user?.name || 'CRM'}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] truncate mt-0.5">
                    {user?.email || 'admin@apex.com'}
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/change-password');
                    }}
                    className="w-full text-left py-1.5 text-slate-700 hover:text-blue-600 font-medium transition-colors"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left py-1.5 text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto px-8 pb-8 pt-2">
          {children}
        </main>
      </div>
    </div>
  );
};
