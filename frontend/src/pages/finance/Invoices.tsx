import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface LineItem {
  name: string;
  description?: string;
  hsn?: string;
  qty: number;
  rate: number;
  tax_pct: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  public_token: string;
  lead_id?: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_city?: string;
  quotation_id?: string;
  quote_number?: string;
  title: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue' | 'cancelled';
  items: LineItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date?: string;
  payment_mode?: string;
  transaction_id?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
}

const InvoicesPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage] = useState(1);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);

  // Record Payment Form
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState('upi');
  const [payTxnId, setPayTxnId] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Create Invoice Form State
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [formTitle, setFormTitle] = useState('Enterprise CRM Software Services Invoice');
  const [formClientName, setFormClientName] = useState('');
  const [formClientEmail, setFormClientEmail] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientAddress, setFormClientAddress] = useState('');
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [formItems, setFormItems] = useState<LineItem[]>([
    {
      name: 'DigiInk CRM Subscription & Cloud Hosting',
      description: 'Annual multi-user CRM software setup and database management',
      hsn: '998314',
      qty: 1,
      rate: 25000,
      tax_pct: 18,
      amount: 29500,
    },
  ]);
  const [formDiscountAmount, setFormDiscountAmount] = useState(0);
  const [formPaidAmount, setFormPaidAmount] = useState(0);
  const [formPaymentMode, setFormPaymentMode] = useState('upi');
  const [formTxnId, setFormTxnId] = useState('');
  const [formNotes, setFormNotes] = useState('Payment is due within 15 days of issue date.');

  // 1. Fetch Invoices List
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices-list', searchTerm, statusFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(currentPage));
      params.append('limit', '15');
      const res = await api.get(`/finance/invoices?${params.toString()}`);
      return res.data?.data;
    },
  });

  const invoices: Invoice[] = invoicesData?.invoices || [];
  const metrics = invoicesData?.metrics || {
    total_invoices: 0,
    total_billed: 0,
    total_paid: 0,
    total_due: 0,
    paid_count: 0,
    unpaid_count: 0,
    partial_count: 0,
    overdue_count: 0,
  };

  // 2. Fetch Leads for Dropdown
  const { data: leadsData } = useQuery({
    queryKey: ['finance-leads-dropdown-inv'],
    queryFn: async () => {
      const res = await api.get('/leads?limit=100');
      return res.data?.data?.records || res.data?.data?.leads || [];
    },
    staleTime: 60 * 1000,
  });

  const leadsList = leadsData || [];

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leadsList.find((l: any) => l.id === leadId);
    if (lead) {
      setFormClientName(lead.name || '');
      setFormClientEmail(lead.email || '');
      setFormClientPhone(lead.phone || '');
      setFormClientAddress(lead.address || (lead.city ? `${lead.city}, India` : ''));
    }
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...formItems];
    const item = { ...updated[index], [field]: value };
    const sub = (Number(item.qty) || 1) * (Number(item.rate) || 0);
    const tax = (sub * (Number(item.tax_pct) || 0)) / 100;
    item.amount = Math.round((sub + tax) * 100) / 100;
    updated[index] = item;
    setFormItems(updated);
  };

  const handleAddItem = () => {
    setFormItems([
      ...formItems,
      {
        name: 'Service / Software Module',
        description: '',
        hsn: '998314',
        qty: 1,
        rate: 5000,
        tax_pct: 18,
        amount: 5900,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const calculatedSubtotal = formItems.reduce((acc, item) => acc + (Number(item.qty) || 1) * (Number(item.rate) || 0), 0);
  const calculatedTax = formItems.reduce((acc, item) => {
    const sub = (Number(item.qty) || 1) * (Number(item.rate) || 0);
    return acc + (sub * (Number(item.tax_pct) || 0)) / 100;
  }, 0);
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedTax - Number(formDiscountAmount || 0));

  // Reset Create Form
  const resetForm = () => {
    setSelectedLeadId('');
    setFormTitle('Enterprise CRM Software Services Invoice');
    setFormClientName('');
    setFormClientEmail('');
    setFormClientPhone('');
    setFormClientAddress('');
    setFormItems([
      {
        name: 'DigiInk CRM Subscription & Cloud Hosting',
        description: 'Annual multi-user CRM software setup and database management',
        hsn: '998314',
        qty: 1,
        rate: 25000,
        tax_pct: 18,
        amount: 29500,
      },
    ]);
    setFormDiscountAmount(0);
    setFormPaidAmount(0);
    setFormPaymentMode('upi');
    setFormTxnId('');
    setFormNotes('Payment is due within 15 days of issue date.');
  };

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!formTitle.trim() || !formClientName.trim()) {
        throw new Error('Title and Client Name are required');
      }
      const res = await api.post('/finance/invoices', {
        lead_id: selectedLeadId || undefined,
        title: formTitle.trim(),
        client_name: formClientName.trim(),
        client_email: formClientEmail.trim() || undefined,
        client_phone: formClientPhone.trim() || undefined,
        client_address: formClientAddress.trim() || undefined,
        due_date: formDueDate || undefined,
        items: formItems,
        discount_amount: Number(formDiscountAmount) || 0,
        paid_amount: Number(formPaidAmount) || 0,
        payment_mode: formPaymentMode,
        transaction_id: formTxnId || undefined,
        notes: formNotes,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      setShowCreateModal(false);
      resetForm();
      const inv = data?.data;
      Swal.fire({
        icon: 'success',
        title: 'Invoice Generated!',
        html: `
          <div style="font-size: 13px; color: #475569; text-align: left; padding: 6px;">
            <p><strong>Invoice No:</strong> ${inv?.invoice_number}</p>
            <p><strong>Client:</strong> ${inv?.client_name}</p>
            <p><strong>Total:</strong> ₹${Number(inv?.total_amount).toLocaleString('en-IN')}</p>
            <p><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: bold;">${inv?.status}</span></p>
          </div>
        `,
        confirmButtonColor: '#003884',
      });
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || err.message,
        confirmButtonColor: '#003884',
      });
    },
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentModalInvoice || payAmount <= 0) {
        throw new Error('Please enter a valid payment amount');
      }
      const res = await api.patch(`/finance/invoices/${paymentModalInvoice.id}/payment`, {
        amount: Number(payAmount),
        payment_mode: payMode,
        transaction_id: payTxnId || undefined,
        notes: payNotes || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      setPaymentModalInvoice(null);
      Swal.fire({
        icon: 'success',
        title: 'Payment Recorded!',
        text: 'The invoice status and amounts have been updated successfully.',
        confirmButtonColor: '#003884',
      });
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || err.message,
        confirmButtonColor: '#003884',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/finance/invoices/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Invoice removed successfully',
        timer: 1500,
        showConfirmButton: false,
      });
    },
  });

  // Copy share web link
  const handleCopyLink = (inv: Invoice) => {
    const link = `${window.location.origin}/invoice/${inv.public_token}`;
    navigator.clipboard.writeText(link);
    Swal.fire({
      icon: 'success',
      title: 'Invoice Link Copied!',
      html: `
        <p style="font-size: 13px; color: #475569;">Public web link for client view & payment:</p>
        <p style="font-size: 12px; font-family: monospace; background: #f1f5f9; padding: 8px; border-radius: 6px; word-break: break-all; margin-top: 8px;">${link}</p>
      `,
      confirmButtonColor: '#003884',
    });
  };

  // Status Badge Component
  const renderStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            PAID
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            PARTIAL
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            OVERDUE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            UNPAID
          </span>
        );
    }
  };

  return (
    <CrmLayout>
      <div className="space-y-6 max-w-7xl pb-20 font-sans">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#003884] text-white flex items-center justify-center font-black shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Invoices &amp; Billing</h1>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage GST tax invoices, track payment status, record transactions, and share instant printable client links
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded-xl shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Invoice</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Invoices</p>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{metrics.total_invoices}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Billed to clients</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Billed</p>
            <h3 className="text-2xl font-black text-[#003884] mt-2">
              ₹{Number(metrics.total_billed).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gross revenue</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Received</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-2">
              ₹{Number(metrics.total_paid).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{metrics.paid_count} invoices paid in full</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outstanding Due</p>
            <h3 className="text-2xl font-black text-rose-600 mt-2">
              ₹{Number(metrics.total_due).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">Unpaid / pending collections</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice #, client name, title..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['all', 'paid', 'unpaid', 'partial', 'overdue'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer capitalize ${
                  statusFilter === st
                    ? 'bg-[#003884] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice Number</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Invoice Description</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid / Due</th>
                  <th className="py-3 px-4 text-center">Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No invoices found. Convert an approved quotation or click <strong>"Create New Invoice"</strong>.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#003884]">
                        <div>{inv.invoice_number}</div>
                        {inv.quote_number && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            From {inv.quote_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{inv.client_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {inv.client_phone || inv.lead_phone || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate" title={inv.title}>
                        <div className="font-medium text-slate-800">{inv.title}</div>
                        <div className="text-[10px] text-slate-400">{inv.items?.length || 0} line item(s)</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-semibold text-emerald-600">
                          ₹{Number(inv.paid_amount).toLocaleString('en-IN')}
                        </div>
                        {Number(inv.due_amount) > 0 && (
                          <div className="text-[10px] text-rose-500 font-medium">
                            Due: ₹{Number(inv.due_amount).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(inv.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Copy Public Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv)}
                            title="Copy Public Web Link"
                            className="p-1.5 text-slate-600 hover:text-[#003884] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </button>

                          {/* View HTML Invoice */}
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            title="View / Print Tax Invoice"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Record Payment */}
                          {inv.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentModalInvoice(inv);
                                setPayAmount(Number(inv.due_amount));
                                setPayMode('upi');
                                setPayTxnId('');
                                setPayNotes('');
                              }}
                              title="Record Client Payment"
                              className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-2xs transition cursor-pointer"
                            >
                              Add Payment
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete invoice ${inv.invoice_number}?`)) {
                                deleteMutation.mutate(inv.id);
                              }
                            }}
                            title="Delete"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODAL 1: CREATE INVOICE                                  */}
        {/* ======================================================== */}
        {showCreateModal &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Create Official Tax Invoice</h3>
                  <p className="text-xs text-slate-500">
                    Generate GST invoice with DigiInk Solutions branding, payment terms, and client details
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Client Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Client Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Select from Leads (Optional)</label>
                    <select
                      value={selectedLeadId}
                      onChange={(e) => handleSelectLead(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    >
                      <option value="">-- Choose Existing Lead --</option>
                      {leadsList.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.phone ? `(${l.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Client / Company Name *</label>
                    <input
                      type="text"
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      placeholder="e.g. Suvjeet Sir / XYZ Logistics"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Client Email</label>
                    <input
                      type="email"
                      value={formClientEmail}
                      onChange={(e) => setFormClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Client Phone</label>
                    <input
                      type="text"
                      value={formClientPhone}
                      onChange={(e) => setFormClientPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Billing Address</label>
                    <input
                      type="text"
                      value={formClientAddress}
                      onChange={(e) => setFormClientAddress(e.target.value)}
                      placeholder="Plot No, Street, City, State, PIN"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Specifics */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Invoice Particulars</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Title *</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Enterprise CRM Software Annual Subscription"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Line Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 text-xs font-semibold text-[#003884] bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                      <tr>
                        <th className="p-2.5">Item / Service</th>
                        <th className="p-2.5 w-24">HSN</th>
                        <th className="p-2.5 w-16 text-center">Qty</th>
                        <th className="p-2.5 w-28 text-right">Rate (₹)</th>
                        <th className="p-2.5 w-24 text-center">GST %</th>
                        <th className="p-2.5 w-28 text-right">Total (₹)</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              placeholder="Item Name"
                              className="w-full px-2 py-1 font-semibold text-xs border border-slate-200 rounded focus:outline-none"
                            />
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="Service details..."
                              className="w-full px-2 py-0.5 text-[11px] text-slate-500 border border-slate-100 rounded mt-1 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.hsn || ''}
                              onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                              placeholder="998314"
                              className="w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded text-center focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-center focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.tax_pct}
                              onChange={(e) => handleItemChange(idx, 'tax_pct', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-center focus:outline-none"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-black text-slate-800">
                            ₹{Number(item.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 text-sm font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-end space-y-2 text-xs">
                  <div className="flex justify-between w-64 text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{calculatedSubtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center justify-between w-64 text-slate-600">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={formDiscountAmount}
                      onChange={(e) => setFormDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-0.5 text-right bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div className="flex justify-between w-64 text-slate-600">
                    <span>GST (Tax):</span>
                    <span className="font-semibold">₹{calculatedTax.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between w-64 text-base font-black text-[#003884] pt-2 border-t border-slate-300">
                    <span>Grand Total:</span>
                    <span>₹{calculatedTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Initial Payment Status */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">4. Payment Received (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Advance / Paid Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formPaidAmount}
                      onChange={(e) => setFormPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                    <select
                      value={formPaymentMode}
                      onChange={(e) => setFormPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                    >
                      <option value="upi">UPI / QR Code</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Credit / Debit Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Ref / UTR No.</label>
                    <input
                      type="text"
                      value={formTxnId}
                      onChange={(e) => setFormTxnId(e.target.value)}
                      placeholder="e.g. UPI/1234567890"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createInvoiceMutation.isPending}
                  onClick={() => createInvoiceMutation.mutate()}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded-xl shadow-xs cursor-pointer"
                >
                  {createInvoiceMutation.isPending ? 'Generating...' : 'Save & Issue Tax Invoice'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ======================================================== */}
        {/* MODAL 2: RECORD PAYMENT                                  */}
        {/* ======================================================== */}
        {paymentModalInvoice &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Payment</h3>
                  <p className="text-xs text-slate-500">Invoice: {paymentModalInvoice.invoice_number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Invoice Amount:</span>
                  <span className="font-bold text-slate-900">₹{Number(paymentModalInvoice.total_amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Already Paid:</span>
                  <span className="font-semibold text-emerald-600">₹{Number(paymentModalInvoice.paid_amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                  <span>Remaining Balance:</span>
                  <span className="text-rose-600">₹{Number(paymentModalInvoice.due_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Amount Received (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    max={Number(paymentModalInvoice.due_amount)}
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-[#003884]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Mode *</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#003884]"
                  >
                    <option value="upi">UPI / QR Code</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Ref / UTR / Cheque No.</label>
                  <input
                    type="text"
                    value={payTxnId}
                    onChange={(e) => setPayTxnId(e.target.value)}
                    placeholder="e.g. UTR123456789"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={recordPaymentMutation.isPending}
                  onClick={() => recordPaymentMutation.mutate()}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {recordPaymentMutation.isPending ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ======================================================== */}
        {/* MODAL 3: PRINTABLE TAX INVOICE PREVIEW                    */}
        {/* ======================================================== */}
        {viewingInvoice &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#003884] text-sm">{viewingInvoice.invoice_number}</span>
                  {renderStatusBadge(viewingInvoice.status)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#003884] rounded-lg cursor-pointer"
                  >
                    Print / Save PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingInvoice(null)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Rendered Tax Invoice Document */}
              <div className="border border-slate-200 rounded-xl p-8 space-y-6 bg-white text-slate-800">
                {/* Header */}
                <div className="flex justify-between items-start pb-6 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-black text-[#003884]">DigiInk Solutions</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      318 3rd and 4th, Metro Station New Aatish Market, Devi Nagar, Mansarovar, Jaipur, Rajasthan 302020
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <strong>GSTIN:</strong> 08AGHPP4568R1ZD • <strong>Phone:</strong> +91 9024154995
                    </p>
                    <p className="text-xs text-slate-500">
                      <strong>Email:</strong> support@digiinksolutions.com • <strong>Web:</strong> www.digiinksolutions.com
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black uppercase text-slate-900 tracking-tight">TAX INVOICE</span>
                    <div className="text-xs font-mono font-bold text-[#003884] mt-1">{viewingInvoice.invoice_number}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Date: {new Date(viewingInvoice.created_at).toLocaleDateString('en-IN')}
                    </div>
                    {viewingInvoice.due_date && (
                      <div className="text-xs text-rose-600 font-semibold mt-0.5">
                        Due Date: {new Date(viewingInvoice.due_date).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bill To */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billed To:</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{viewingInvoice.client_name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {viewingInvoice.client_phone && <span>Phone: {viewingInvoice.client_phone} • </span>}
                    {viewingInvoice.client_email && <span>Email: {viewingInvoice.client_email}</span>}
                  </div>
                  {viewingInvoice.client_address && (
                    <div className="text-xs text-slate-500 mt-0.5">{viewingInvoice.client_address}</div>
                  )}
                </div>

                {/* Items */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#003884] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">HSN</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-center">GST</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {viewingInvoice.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.hsn || '-'}</td>
                        <td className="py-2.5 px-3 text-center">{item.qty}</td>
                        <td className="py-2.5 px-3 text-right">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">{item.tax_pct}%</td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Calculations & Bank Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* DigiInk Bank Details */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-[#003884]">Bank Transfer Details:</div>
                    <div>Bank: <strong>HDFC Bank</strong></div>
                    <div>A/C Name: <strong>DigiInk Solutions Pvt Ltd</strong></div>
                    <div>A/C Number: <strong>50200012345678</strong></div>
                    <div>IFSC: <strong>HDFC0001234</strong></div>
                    <div>UPI ID: <strong>digiink@hdfcbank</strong></div>
                  </div>

                  {/* Totals Box */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{Number(viewingInvoice.subtotal).toLocaleString('en-IN')}</span>
                    </div>
                    {Number(viewingInvoice.discount_amount) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>- ₹{Number(viewingInvoice.discount_amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax (GST 18%):</span>
                      <span className="font-semibold">₹{Number(viewingInvoice.tax_amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-[#003884] pt-2 border-t border-slate-300">
                      <span>Total Amount:</span>
                      <span>₹{Number(viewingInvoice.total_amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Paid Amount:</span>
                      <span>₹{Number(viewingInvoice.paid_amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-slate-200">
                      <span>Balance Due:</span>
                      <span>₹{Number(viewingInvoice.due_amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Paid Stamp */}
                {viewingInvoice.status === 'paid' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center text-emerald-800 font-black text-sm tracking-widest uppercase">
                    ✓ PAID IN FULL • THANK YOU FOR YOUR BUSINESS
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </CrmLayout>
  );
};

export default InvoicesPage;
