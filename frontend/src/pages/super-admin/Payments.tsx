import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  CreditCard, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, AlertCircle,
  IndianRupee, History, Clock,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

const SuperAdminPayments = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [verifyModal, setVerifyModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ plan: '1year', amount: '', notes: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-payments', page],
    queryFn: async () => {
      const res = await api.get(`/super-admin/payments/pending?page=${page}&limit=15`);
      return res.data;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['super-admin-payment-history', historyPage],
    queryFn: async () => {
      const res = await api.get(`/super-admin/payment-history?page=${historyPage}&limit=15`);
      return res.data;
    },
    enabled: activeTab === 'history',
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/super-admin/companies/${selectedPayment.company_id}/verify-payment`, {
        paymentRequestId: selectedPayment.id,
        plan: verifyForm.plan,
        amount: Number(verifyForm.amount),
        notes: verifyForm.notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard'] });
      setVerifyModal(false);
      setSelectedPayment(null);
      setVerifyForm({ plan: '1year', amount: '', notes: '' });
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to verify payment');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/super-admin/payments/${selectedPayment.id}/reject`, {
        reason: rejectReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-payments'] });
      setRejectModal(false);
      setSelectedPayment(null);
      setRejectReason('');
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to reject payment');
    },
  });

  const payments = data?.data || [];
  const meta = data?.meta || {};
  const pendingCount = meta.total || 0;

  const historyPayments = historyData?.data || [];
  const historyMeta = historyData?.meta || {};

  const planOptions = [
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' },
  ];

  return (
    <SuperAdminLayout pendingCount={pendingCount}>

      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payments</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage and review all payment requests</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-5 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'pending'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending
          {pendingCount > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
              activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* ====== HISTORY TAB ====== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : historyPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <History className="w-7 h-7 text-slate-300" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">No payment history yet</p>
                      <p className="text-slate-300 text-xs mt-1">Verified and rejected payments will appear here</p>
                    </td>
                  </tr>
                ) : historyPayments.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                          {(payment.company_name || payment.name)?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{payment.company_name || payment.name}</p>
                          <p className="text-xs text-slate-400">{payment.admin_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {payment.plan || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-0.5">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-semibold text-slate-900">
                          {Number(payment.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs capitalize">
                      {payment.payment_mode?.replace('_', ' ') || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-mono text-slate-500">{payment.reference_no || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        payment.status === 'verified'
                          ? 'bg-green-50 text-green-700'
                          : payment.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          payment.status === 'verified' ? 'bg-green-500' :
                          payment.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {historyMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">Page {historyPage} of {historyMeta.totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setHistoryPage(historyPage - 1)} disabled={historyPage === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setHistoryPage(historyPage + 1)} disabled={historyPage === historyMeta.totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== PENDING TAB ====== */}
      {activeTab === 'pending' && <>

      {/* Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingCount} payment{pendingCount !== 1 ? 's' : ''} pending
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Review and verify payments to activate client subscriptions.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Plan</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested Plan</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-7 h-7 text-green-400" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">All payments verified</p>
                    <p className="text-slate-300 text-xs mt-1">No pending payments at the moment</p>
                  </td>
                </tr>
              ) : payments.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                        {payment.company_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{payment.company_name}</p>
                        <p className="text-xs text-slate-400">{payment.admin_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      payment.current_plan === 'trial' ? 'bg-purple-50 text-purple-700' :
                      payment.current_plan === 'active' ? 'bg-green-50 text-green-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {payment.current_plan || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {payment.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-0.5">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-900">
                        {Number(payment.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs capitalize">
                    {payment.payment_mode?.replace('_', ' ') || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-mono text-slate-500">{payment.reference_no || '—'}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {formatDate(payment.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setVerifyForm({ plan: payment.plan || '1year', amount: String(payment.amount || ''), notes: '' });
                          setActionError('');
                          setVerifyModal(true);
                        }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setRejectReason('');
                          setActionError('');
                          setRejectModal(true);
                        }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">Page {page} of {meta.totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(page + 1)} disabled={page === meta.totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {verifyModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verify Payment</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedPayment.company_name}</p>
              </div>
              <button onClick={() => setVerifyModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Subscription Plan *</label>
                <select
                  value={verifyForm.plan}
                  onChange={(e) => setVerifyForm({ ...verifyForm, plan: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {planOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Amount (Rs.) *</label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    placeholder="Enter verified amount"
                    value={verifyForm.amount}
                    onChange={(e) => setVerifyForm({ ...verifyForm, amount: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                <textarea
                  placeholder="Internal notes..."
                  value={verifyForm.notes}
                  onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">
                  Subscription will be activated and a confirmation email sent to the admin.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setVerifyModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending || !verifyForm.amount}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {verifyMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                  : <><CheckCircle2 className="w-4 h-4" /> Verify & Activate</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Payment</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedPayment.company_name}</p>
              </div>
              <button onClick={() => setRejectModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Rejection Reason *</label>
                <textarea
                  placeholder="Explain the reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  The admin will be notified about the rejection with the reason provided.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setRejectModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {rejectMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Rejecting...</>
                  : <><XCircle className="w-4 h-4" /> Reject Payment</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
      </> }

    </SuperAdminLayout>
  );
};

export default SuperAdminPayments;