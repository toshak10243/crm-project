import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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

interface Quotation {
  id: string;
  quote_number: string;
  public_token: string;
  lead_id?: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_city?: string;
  title: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  items: LineItem[];
  subtotal: number;
  tax_amount: number;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  valid_until?: string;
  terms?: string;
  notes?: string;
  sent_at?: string;
  accepted_at?: string;
  accepted_by_name?: string;
  accepted_notes?: string;
  converted_invoice_id?: string;
  converted_invoice_number?: string;
  created_at: string;
}

const DEFAULT_TERMS = `1. Validity: This quotation is valid until the date specified above.
2. Payment Terms: 50% advance upon confirmation, 50% on project delivery/milestone.
3. Taxes: GST @ 18% is applicable as per Government regulations.
4. Support: Includes 30 days of standard onboarding and technical support by DigiInk Solutions.`;

const QuotationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage] = useState(1);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [formTitle, setFormTitle] = useState('Enterprise CRM & Cloud Solutions Implementation');
  const [formClientName, setFormClientName] = useState('');
  const [formClientEmail, setFormClientEmail] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientAddress, setFormClientAddress] = useState('');
  const [formValidUntil, setFormValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [formItems, setFormItems] = useState<LineItem[]>([
    {
      name: 'DigiInk CRM Enterprise License (Annual)',
      description: 'Multi-tenant cloud CRM, unlimited leads, sales pipeline & analytics',
      hsn: '998314',
      qty: 1,
      rate: 35000,
      tax_pct: 18,
      amount: 41300,
    },
    {
      name: 'DigiMail & Bulk Automation Module',
      description: 'Gmail SMTP integration, HTML editor, campaign open rate tracking',
      hsn: '998314',
      qty: 1,
      rate: 15000,
      tax_pct: 18,
      amount: 17700,
    },
  ]);
  const [formDiscountType, setFormDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [formDiscountValue, setFormDiscountValue] = useState(0);
  const [formTerms, setFormTerms] = useState(DEFAULT_TERMS);
  const [formNotes, setFormNotes] = useState('Thank you for choosing DigiInk Solutions. We look forward to working together.');
  const [formStatus, setFormStatus] = useState('sent');

  // 1. Fetch Quotations List
  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['quotations-list', searchTerm, statusFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(currentPage));
      params.append('limit', '15');
      const res = await api.get(`/finance/quotations?${params.toString()}`);
      return res.data?.data;
    },
  });

  const quotations: Quotation[] = quotesData?.quotations || [];
  const metrics = quotesData?.metrics || {
    total_quotes: 0,
    total_value: 0,
    accepted_count: 0,
    pending_count: 0,
    converted_count: 0,
  };

  // 2. Fetch Leads for Dropdown Selection
  const { data: leadsData } = useQuery({
    queryKey: ['finance-leads-dropdown'],
    queryFn: async () => {
      const res = await api.get('/leads?limit=100');
      return res.data?.data?.leads || [];
    },
    staleTime: 60 * 1000,
  });

  const leadsList = leadsData || [];

  // When a lead is selected in modal, auto-fill client details
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leadsList.find((l: any) => l.id === leadId);
    if (lead) {
      setFormClientName(lead.name || '');
      setFormClientEmail(lead.email || '');
      setFormClientPhone(lead.phone || '');
      setFormClientAddress(lead.city ? `${lead.city}, India` : '');
    }
  };

  // Line item handlers
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
        name: 'Custom Service / Module',
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

  // Calculations
  const calculatedSubtotal = formItems.reduce((acc, item) => acc + (Number(item.qty) || 1) * (Number(item.rate) || 0), 0);
  const calculatedTax = formItems.reduce((acc, item) => {
    const sub = (Number(item.qty) || 1) * (Number(item.rate) || 0);
    return acc + (sub * (Number(item.tax_pct) || 0)) / 100;
  }, 0);
  const calculatedDiscount =
    formDiscountType === 'percentage'
      ? (calculatedSubtotal * (Number(formDiscountValue) || 0)) / 100
      : Number(formDiscountValue) || 0;
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedTax - calculatedDiscount);

  // Reset form
  const resetForm = () => {
    setSelectedLeadId('');
    setFormTitle('Enterprise CRM & Cloud Solutions Implementation');
    setFormClientName('');
    setFormClientEmail('');
    setFormClientPhone('');
    setFormClientAddress('');
    setFormItems([
      {
        name: 'DigiInk CRM Enterprise License (Annual)',
        description: 'Multi-tenant cloud CRM, unlimited leads, sales pipeline & analytics',
        hsn: '998314',
        qty: 1,
        rate: 35000,
        tax_pct: 18,
        amount: 41300,
      },
      {
        name: 'DigiMail & Bulk Automation Module',
        description: 'Gmail SMTP integration, HTML editor, campaign open rate tracking',
        hsn: '998314',
        qty: 1,
        rate: 15000,
        tax_pct: 18,
        amount: 17700,
      },
    ]);
    setFormDiscountType('fixed');
    setFormDiscountValue(0);
    setFormTerms(DEFAULT_TERMS);
    setFormNotes('Thank you for choosing DigiInk Solutions. We look forward to working together.');
    setFormStatus('sent');
    setEditingQuotationId(null);
  };

  // Create or Update Mutation
  const saveQuotationMutation = useMutation({
    mutationFn: async () => {
      if (!formTitle.trim() || !formClientName.trim()) {
        throw new Error('Title and Client Name are required');
      }
      const payload = {
        lead_id: selectedLeadId || undefined,
        title: formTitle.trim(),
        client_name: formClientName.trim(),
        client_email: formClientEmail.trim() || undefined,
        client_phone: formClientPhone.trim() || undefined,
        client_address: formClientAddress.trim() || undefined,
        valid_until: formValidUntil || undefined,
        items: formItems,
        discount_type: formDiscountType,
        discount_value: formDiscountValue,
        terms: formTerms,
        notes: formNotes,
        status: formStatus,
      };

      if (editingQuotationId) {
        const res = await api.patch(`/finance/quotations/${editingQuotationId}`, payload);
        return res.data;
      } else {
        const res = await api.post('/finance/quotations', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list'] });
      setShowCreateModal(false);
      resetForm();
      const quote = data?.data;
      Swal.fire({
        icon: 'success',
        title: editingQuotationId ? 'Quotation Updated!' : 'Quotation Created!',
        html: `
          <div style="font-size: 13px; color: #475569; text-align: left; padding: 6px;">
            <p><strong>Quote No:</strong> ${quote?.quote_number || 'Generated'}</p>
            <p><strong>Client:</strong> ${quote?.client_name || formClientName}</p>
            <p><strong>Total:</strong> ₹${Number(quote?.total_amount || calculatedTotal).toLocaleString('en-IN')}</p>
            <p style="margin-top: 10px; font-size: 12px; color: #003884;">You can now copy the public web link and share it directly with the client.</p>
          </div>
        `,
        confirmButtonText: 'Great, View Quotation',
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

  // Convert to Invoice Mutation
  const convertMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await api.post(`/finance/quotations/${quoteId}/convert`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list'] });
      const invoice = data?.data?.invoice;
      Swal.fire({
        icon: 'success',
        title: 'Converted to Invoice!',
        html: `
          <div style="font-size: 13px; color: #475569; text-align: left; padding: 6px;">
            <p><strong>Invoice Number:</strong> ${invoice?.invoice_number}</p>
            <p><strong>Client:</strong> ${invoice?.client_name}</p>
            <p><strong>Amount:</strong> ₹${Number(invoice?.total_amount).toLocaleString('en-IN')}</p>
          </div>
        `,
        confirmButtonText: 'Go to Invoices',
        confirmButtonColor: '#003884',
        showCancelButton: true,
        cancelButtonText: 'Stay on Quotations',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/invoices');
        }
      });
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Conversion Failed',
        text: err?.response?.data?.message || err.message,
        confirmButtonColor: '#003884',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/finance/quotations/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list'] });
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Quotation removed successfully',
        timer: 1500,
        showConfirmButton: false,
      });
    },
  });

  // Handle Edit
  const handleEdit = (q: Quotation) => {
    setEditingQuotationId(q.id);
    setSelectedLeadId(q.lead_id || '');
    setFormTitle(q.title);
    setFormClientName(q.client_name);
    setFormClientEmail(q.client_email || '');
    setFormClientPhone(q.client_phone || '');
    setFormClientAddress(q.client_address || '');
    setFormValidUntil(q.valid_until ? q.valid_until.split('T')[0] : '');
    setFormItems(q.items && q.items.length > 0 ? q.items : []);
    setFormDiscountType(q.discount_type || 'fixed');
    setFormDiscountValue(Number(q.discount_value) || 0);
    setFormTerms(q.terms || DEFAULT_TERMS);
    setFormNotes(q.notes || '');
    setFormStatus(q.status);
    setShowCreateModal(true);
  };

  // Copy share web link
  const handleCopyLink = (q: Quotation) => {
    const link = `${window.location.origin}/quote/${q.public_token}`;
    navigator.clipboard.writeText(link);
    Swal.fire({
      icon: 'success',
      title: 'Link Copied!',
      html: `
        <p style="font-size: 13px; color: #475569;">Shareable web link copied to clipboard:</p>
        <p style="font-size: 12px; font-family: monospace; background: #f1f5f9; padding: 8px; border-radius: 6px; word-break: break-all; margin-top: 8px;">${link}</p>
        <p style="font-size: 12px; color: #003884; margin-top: 10px;">The client can open this link on their mobile or PC and click <strong>Accept Quotation</strong>.</p>
      `,
      confirmButtonColor: '#003884',
    });
  };

  // WhatsApp share
  const handleShareWhatsApp = (q: Quotation) => {
    const link = `${window.location.origin}/quote/${q.public_token}`;
    const text = `Hello ${q.client_name},\n\nPlease find the official quotation from DigiInk Solutions for "${q.title}" (Quote: ${q.quote_number}, Total: ₹${Number(q.total_amount).toLocaleString('en-IN')}).\n\nYou can review details and approve/accept the quotation directly here:\n${link}\n\nThank you!\nDigiInk Solutions`;
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(q.client_phone || '')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Status Badge Component
  const renderStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ACCEPTED
          </span>
        );
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            INVOICED
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#003884] border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            SENT
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            DRAFT
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Quotations &amp; Proposals</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#003884] border border-blue-200 uppercase tracking-wide">
                    Live Estimates
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate professional quotations, share instant web links for client acceptance, and convert to invoices
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
              <span>Create New Quotation</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Quotations</p>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{metrics.total_quotes}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Created across clients</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pipeline Quotation Value</p>
            <h3 className="text-2xl font-black text-[#003884] mt-2">
              ₹{Number(metrics.total_value).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total proposed revenue</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Client Accepted</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-2">{metrics.accepted_count}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Approved &amp; ready to invoice</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Review</p>
            <h3 className="text-2xl font-black text-amber-600 mt-2">{metrics.pending_count}</h3>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Sent to clients via link</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quote #, client name, title..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['all', 'sent', 'accepted', 'converted', 'draft', 'rejected'].map((st) => (
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

        {/* Quotations Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Quote Number</th>
                  <th className="py-3 px-4">Client / Lead Details</th>
                  <th className="py-3 px-4">Proposal Title</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Valid Until</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No quotations found. Click <strong>"Create New Quotation"</strong> to get started.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#003884]">
                        {q.quote_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{q.client_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {q.client_phone || q.lead_phone || '-'} • {q.client_email || q.lead_email || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate" title={q.title}>
                        <div className="font-medium text-slate-800">{q.title}</div>
                        <div className="text-[10px] text-slate-400">{q.items?.length || 0} line item(s)</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{Number(q.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500">
                        {q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(q.status)}
                        {q.accepted_by_name && (
                          <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                            By {q.accepted_by_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Share Web Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(q)}
                            title="Copy Public Web Link"
                            className="p-1.5 text-slate-600 hover:text-[#003884] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </button>

                          {/* Share on WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(q)}
                            title="Share via WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.531 1.769.816 2.796.817 3.182 0 5.768-2.587 5.768-5.767 0-3.18-2.586-5.766-5.768-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.823 0-3.539-.493-5.023-1.353l-6.977 1.826 1.862-6.804c-.939-1.536-1.462-3.33-1.462-5.269 0-5.514 4.486-10 10-10s10 4.486 10 10z" />
                            </svg>
                          </button>

                          {/* View HTML Document */}
                          <button
                            type="button"
                            onClick={() => setViewingQuotation(q)}
                            title="View / Print Quotation"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Convert to Invoice */}
                          {q.status !== 'converted' ? (
                            <button
                              type="button"
                              onClick={() => convertMutation.mutate(q.id)}
                              title="Convert to Official Invoice"
                              className="px-2 py-1 text-[10px] font-bold text-white bg-[#003884] hover:bg-[#002860] rounded-md shadow-2xs transition cursor-pointer"
                            >
                              Convert to Invoice
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate('/invoices')}
                              title="View Generated Invoice"
                              className="px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-md transition cursor-pointer"
                            >
                              View Invoice
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleEdit(q)}
                            title="Edit Quotation"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete quotation ${q.quote_number}?`)) {
                                deleteMutation.mutate(q.id);
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
        {/* MODAL 1: CREATE / EDIT QUOTATION                         */}
        {/* ======================================================== */}
        {showCreateModal &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingQuotationId ? 'Edit Quotation' : 'Create New Quotation'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fill in client requirements and line items with automatic GST and total calculations
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

              {/* Step A: Client & Lead Selection */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Client / Lead Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Select from CRM Leads (Optional)</label>
                    <select
                      value={selectedLeadId}
                      onChange={(e) => handleSelectLead(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    >
                      <option value="">-- Choose Existing Lead --</option>
                      {leadsList.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.phone ? `(${l.phone})` : ''} {l.city ? `- ${l.city}` : ''}
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
                      placeholder="e.g. Suvjeet Sir / XYZ Logistics Pvt Ltd"
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
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Client City / Address</label>
                    <input
                      type="text"
                      value={formClientAddress}
                      onChange={(e) => setFormClientAddress(e.target.value)}
                      placeholder="e.g. Plot 10, Industrial Area, Jaipur, Rajasthan"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>
                </div>
              </div>

              {/* Step B: Proposal Title & Validity */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Proposal Specifications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Quotation Title *</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Enterprise CRM Software & Cloud Telephony Setup"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Valid Until Date</label>
                    <input
                      type="date"
                      value={formValidUntil}
                      onChange={(e) => setFormValidUntil(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                    />
                  </div>
                </div>
              </div>

              {/* Step C: Line Items Editor */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Items &amp; Services</h4>
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
                        <th className="p-2.5">Item / Description</th>
                        <th className="p-2.5 w-24">HSN/SAC</th>
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
                              className="w-full px-2 py-1 font-semibold text-xs border border-slate-200 rounded focus:outline-none focus:border-[#003884]"
                            />
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="Additional details / scope of work..."
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

                {/* Calculation Summary Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-end space-y-2 text-xs">
                  <div className="flex justify-between w-64 text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{calculatedSubtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center justify-between w-64 text-slate-600">
                    <div className="flex items-center gap-1">
                      <span>Discount:</span>
                      <select
                        value={formDiscountType}
                        onChange={(e) => setFormDiscountType(e.target.value as any)}
                        className="text-[10px] bg-white border border-slate-300 rounded px-1"
                      >
                        <option value="fixed">Fixed ₹</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-0.5 text-right bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div className="flex justify-between w-64 text-slate-600">
                    <span>Tax (GST):</span>
                    <span className="font-semibold">₹{calculatedTax.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between w-64 text-base font-black text-[#003884] pt-2 border-t border-slate-300">
                    <span>Grand Total:</span>
                    <span>₹{calculatedTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Step D: Terms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Terms &amp; Conditions</label>
                  <textarea
                    rows={4}
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes / Special Instructions</label>
                  <textarea
                    rows={4}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  />
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
                  disabled={saveQuotationMutation.isPending}
                  onClick={() => saveQuotationMutation.mutate()}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded-xl shadow-xs cursor-pointer"
                >
                  {saveQuotationMutation.isPending
                    ? 'Saving...'
                    : editingQuotationId
                    ? 'Update Quotation'
                    : 'Save & Generate Quotation'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ======================================================== */}
        {/* MODAL 2: PRINTABLE HTML QUOTATION PREVIEW                 */}
        {/* ======================================================== */}
        {viewingQuotation &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#003884] text-sm">{viewingQuotation.quote_number}</span>
                  {renderStatusBadge(viewingQuotation.status)}
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
                    onClick={() => setViewingQuotation(null)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Rendered Letterhead Document */}
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
                    <span className="text-2xl font-black uppercase text-slate-900 tracking-tight">QUOTATION</span>
                    <div className="text-xs font-mono font-bold text-[#003884] mt-1">{viewingQuotation.quote_number}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Date: {new Date(viewingQuotation.created_at).toLocaleDateString('en-IN')}
                    </div>
                    {viewingQuotation.valid_until && (
                      <div className="text-xs text-rose-600 font-semibold mt-0.5">
                        Valid Until: {new Date(viewingQuotation.valid_until).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bill To */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proposal Prepared For:</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{viewingQuotation.client_name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {viewingQuotation.client_phone && <span>Phone: {viewingQuotation.client_phone} • </span>}
                    {viewingQuotation.client_email && <span>Email: {viewingQuotation.client_email}</span>}
                  </div>
                  {viewingQuotation.client_address && (
                    <div className="text-xs text-slate-500 mt-0.5">{viewingQuotation.client_address}</div>
                  )}
                </div>

                {/* Proposal Title */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{viewingQuotation.title}</h3>
                </div>

                {/* Items Table */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#003884] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">HSN</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-center">GST</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {viewingQuotation.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-slate-500">{item.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.hsn || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-semibold">{item.qty}</td>
                        <td className="py-2.5 px-3 text-right">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">{item.tax_pct}%</td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{Number(viewingQuotation.subtotal).toLocaleString('en-IN')}</span>
                    </div>
                    {Number(viewingQuotation.discount_amount) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>- ₹{Number(viewingQuotation.discount_amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span className="font-semibold">₹{Number(viewingQuotation.tax_amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-[#003884] pt-2 border-t border-slate-300">
                      <span>Total Amount:</span>
                      <span>₹{Number(viewingQuotation.total_amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Acceptance Stamp if accepted */}
                {viewingQuotation.status === 'accepted' && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <div className="font-bold flex items-center gap-1.5 text-sm">
                      <span>✓</span> Officially Accepted by {viewingQuotation.accepted_by_name || viewingQuotation.client_name}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      Accepted on: {new Date(viewingQuotation.accepted_at || viewingQuotation.created_at).toLocaleString('en-IN')}
                      {viewingQuotation.accepted_notes && ` • Note: "${viewingQuotation.accepted_notes}"`}
                    </div>
                  </div>
                )}

                {/* Terms */}
                {viewingQuotation.terms && (
                  <div className="text-[11px] text-slate-600 pt-4 border-t border-slate-200 space-y-1">
                    <div className="font-bold text-slate-700">Terms &amp; Conditions:</div>
                    <div className="whitespace-pre-line leading-relaxed">{viewingQuotation.terms}</div>
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

export default QuotationsPage;
