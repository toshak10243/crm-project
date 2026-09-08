import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  Building2, CreditCard, CheckCircle2, Clock,
  AlertTriangle, ChevronRight, Activity,
  TrendingUp, TrendingDown, Minus, IndianRupee,
  BarChart3, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { formatDate, getDaysRemaining } from '../../lib/utils';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/super-admin/dashboard');
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  const { data: companiesData } = useQuery({
    queryKey: ['super-admin-companies-recent'],
    queryFn: async () => {
      const res = await api.get('/super-admin/companies?limit=6');
      return res.data;
    },
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['super-admin-payments-pending'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=5');
      return res.data;
    },
  });

  const { data: expiringData } = useQuery({
    queryKey: ['super-admin-expiring'],
    queryFn: async () => {
      const res = await api.get('/super-admin/expiring');
      return res.data.data;
    },
  });

  const { data: healthData } = useQuery({
    queryKey: ['super-admin-health'],
    queryFn: async () => {
      const res = await api.get('/super-admin/health');
      return res.data.data;
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ['super-admin-revenue'],
    queryFn: async () => {
      const res = await api.get('/super-admin/revenue-analytics');
      return res.data.data;
    },
  });

  const stats = statsData || {};
  const companies = companiesData?.data || [];
  const payments = paymentsData?.data || [];
  const pendingCount = paymentsData?.meta?.total || 0;
  const expiring = expiringData || [];
  const health = healthData || { healthy: 0, lowActivity: 0, inactive: 0 };
  const revenue = revenueData || { thisMonth: 0, lastMonth: 0, growth: 0, totalRevenue: 0, monthly: [], byPlan: [] };

  const statCards = [
    {
      label: 'Total Companies',
      value: stats.total_companies ?? '—',
      sub: `+${stats.new_this_month || 0} this month`,
      icon: Building2,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      border: 'border-l-blue-500',
    },
    {
      label: 'Active Trials',
      value: stats.active_trials ?? '—',
      sub: `${stats.trials_ending_in_2days || 0} ending soon`,
      icon: Clock,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      border: 'border-l-purple-500',
    },
    {
      label: 'Subscriptions',
      value: stats.active_subscriptions ?? '—',
      sub: `${stats.subscriptions_expiring_soon || 0} expiring soon`,
      icon: CheckCircle2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      border: 'border-l-green-500',
    },
    {
      label: 'Pending Payments',
      value: stats.pending_payments ?? '—',
      sub: 'Needs verification',
      icon: CreditCard,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      border: 'border-l-amber-500',
      onClick: () => navigate('/super-admin/payments'),
    },
  ];

  const getPlanBadge = (plan: string) => {
    const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      trial:     { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Trial' },
      active:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Active' },
      expired:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Expired' },
      suspended: { bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400',  label: 'Suspended' },
    };
    return map[plan] || map.suspended;
  };

  // Bar chart max value
  const maxRevenue = Math.max(...(revenue.monthly || []).map((m: any) => m.revenue), 1);

  const planColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500',
  ];

  return (
    <SuperAdminLayout pendingCount={pendingCount}>

      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Platform overview and key metrics</p>
      </div>

      {/* Alert Banner */}
      {(stats.pending_payments > 0 || stats.trials_ending_in_2days > 0 || stats.subscriptions_expiring_soon > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Attention Required</p>
            <ul className="mt-1 space-y-0.5">
              {stats.pending_payments > 0 && (
                <li className="text-sm text-amber-700 flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  {stats.pending_payments} payment{stats.pending_payments > 1 ? 's' : ''} pending verification
                  <button onClick={() => navigate('/super-admin/payments')} className="underline font-medium">Review</button>
                </li>
              )}
              {stats.trials_ending_in_2days > 0 && (
                <li className="text-sm text-amber-700 flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  {stats.trials_ending_in_2days} trial{stats.trials_ending_in_2days > 1 ? 's' : ''} ending in 2 days
                </li>
              )}
              {stats.subscriptions_expiring_soon > 0 && (
                <li className="text-sm text-amber-700 flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  {stats.subscriptions_expiring_soon} subscription{stats.subscriptions_expiring_soon > 1 ? 's' : ''} expiring soon
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-7">
        {statCards.map((card) => (
          <div key={card.label} onClick={card.onClick}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${card.border} p-5 shadow-sm ${card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              {card.onClick && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-0.5">
              {statsLoading ? <span className="w-10 h-7 bg-slate-100 rounded animate-pulse inline-block" /> : card.value}
            </p>
            <p className="text-sm font-medium text-slate-600">{card.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Expired', value: stats.expired || 0, color: 'text-red-500' },
          { label: 'Suspended', value: stats.suspended || 0, color: 'text-slate-400' },
          { label: 'New This Month', value: stats.new_this_month || 0, color: 'text-blue-600' },
          { label: 'Total Active', value: (stats.active_trials || 0) + (stats.active_subscriptions || 0), color: 'text-green-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Company Health */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Company Health</h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {[
            { label: 'Healthy', value: health.healthy, desc: 'Active in last 7 days', color: 'text-green-600', bg: 'bg-green-50', icon: TrendingUp, iconColor: 'text-green-600', iconBg: 'bg-green-100' },
            { label: 'Low Activity', value: health.lowActivity, desc: 'Last seen 8–30 days', color: 'text-amber-600', bg: 'bg-amber-50', icon: Minus, iconColor: 'text-amber-600', iconBg: 'bg-amber-100' },
            { label: 'Inactive', value: health.inactive, desc: 'No activity 30+ days', color: 'text-red-600', bg: 'bg-red-50', icon: TrendingDown, iconColor: 'text-red-600', iconBg: 'bg-red-100' },
          ].map((item) => (
            <div key={item.label} className={`p-6 text-center ${item.bg}`}>
              <div className={`w-12 h-12 ${item.iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== REVENUE ANALYTICS ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

        {/* Revenue Cards */}
        <div className="space-y-4">
          {/* This Month */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="w-4 h-4 text-green-600" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month</p>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-0.5 text-2xl font-bold text-slate-900">
                <IndianRupee className="w-5 h-5" />
                {revenue.thisMonth.toLocaleString('en-IN')}
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${revenue.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {revenue.growth >= 0
                  ? <ArrowUpRight className="w-4 h-4" />
                  : <ArrowDownRight className="w-4 h-4" />
                }
                {Math.abs(revenue.growth)}%
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">vs last month: ₹{revenue.lastMonth.toLocaleString('en-IN')}</p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            </div>
            <div className="flex items-center gap-0.5 text-2xl font-bold text-slate-900">
              <IndianRupee className="w-5 h-5" />
              {revenue.totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-400 mt-1">All time collected</p>
          </div>

          {/* Revenue by Plan */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Revenue by Plan</p>
            {revenue.byPlan.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {revenue.byPlan.map((plan: any, i: number) => (
                  <div key={plan.plan}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{plan.plan}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">{plan.percentage}%</p>
                        <p className="text-xs font-semibold text-slate-900">₹{plan.revenue.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${planColors[i % planColors.length]}`}
                        style={{ width: `${plan.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Monthly Revenue</h3>
            <span className="text-xs text-slate-400 ml-auto">Last 12 months</span>
          </div>

          {revenue.monthly.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No revenue data yet</p>
                <p className="text-xs text-slate-300 mt-0.5">Revenue will appear after first invoice</p>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {revenue.monthly.map((m: any, i: number) => {
                const height = Math.max((m.revenue / maxRevenue) * 100, 2);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <p className="font-semibold">{m.month}</p>
                      <p>₹{m.revenue.toLocaleString('en-IN')}</p>
                      <p className="text-slate-300">{m.invoices} invoice{m.invoices !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Bar */}
                    <div className="w-full flex items-end" style={{ height: '160px' }}>
                      <div
                        className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all duration-300 cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    {/* Label */}
                    <p className="text-xs text-slate-400 truncate w-full text-center" style={{ fontSize: '9px' }}>
                      {m.month.split(' ')[0]}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

        {/* Recent Companies */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Companies</h3>
            </div>
            <button onClick={() => navigate('/super-admin/companies')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {companies.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Building2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No companies yet</p>
                <button onClick={() => navigate('/super-admin/companies')} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Create first company
                </button>
              </div>
            ) : companies.map((company: any) => {
              const badge = getPlanBadge(company.plan);
              const expiryDate = company.plan === 'trial' ? company.trial_ends_at : company.subscription_ends_at;
              const daysLeft = expiryDate ? getDaysRemaining(expiryDate) : null;
              return (
                <div key={company.id} onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 text-xs flex-shrink-0">
                      {company.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{company.name}</p>
                      <p className="text-xs text-slate-400">{company.admin_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />{badge.label}
                      </span>
                      {daysLeft !== null && (
                        <p className={`text-xs mt-0.5 ${daysLeft <= 2 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Pending Payments</h3>
              {pendingCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
            </div>
            <button onClick={() => navigate('/super-admin/payments')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {payments.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No pending payments</p>
                <p className="text-xs text-slate-300 mt-0.5">All caught up!</p>
              </div>
            ) : payments.map((payment: any) => (
              <div key={payment.id} onClick={() => navigate('/super-admin/payments')}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{payment.company_name}</p>
                    <p className="text-xs text-slate-400">{formatDate(payment.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">Rs. {Number(payment.amount || 0).toLocaleString('en-IN')}</p>
                  <span className="text-xs font-medium text-amber-600">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expiring Soon */}
      {expiring.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">Expiring Soon</h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{expiring.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expiring.map((company: any) => (
                  <tr key={company.id} onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 text-xs flex-shrink-0">
                          {company.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{company.name}</p>
                          <p className="text-xs text-slate-400">{company.admin_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${company.plan === 'trial' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                        {company.plan === 'trial' ? 'Trial' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{formatDate(company.expiry_date)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`font-bold text-sm ${company.days_remaining <= 3 ? 'text-red-600' : company.days_remaining <= 7 ? 'text-amber-600' : company.days_remaining <= 15 ? 'text-amber-500' : 'text-slate-600'}`}>
                        {company.days_remaining} day{company.days_remaining !== 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;