import React, { useState } from 'react';
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

interface ScopeSection {
  id: string;
  title: string;
  content: string;
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
  client_gstin?: string;
  prepared_by?: string;
  place_of_supply?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  items: LineItem[];
  sections?: ScopeSection[];
  subtotal: number;
  tax_amount: number;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  gst_type?: 'cgst_sgst' | 'igst' | 'none';
  gst_rate?: number;
  payment_due_date?: string;
  payment_method?: string;
  quotation_date?: string;
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
3. Taxes: GST as applicable as per Government of India regulations.
4. Support: Includes standard onboarding and technical support by DigiInk Solutions.`;

const DEFAULT_PAYMENT_METHOD = 'Bank transfer (NEFT / RTGS / IMPS) / UPI';
const DEFAULT_NOTES = 'Thank you for choosing DigiInk Solutions for your marketing needs. We look forward to working with you.';

const getDefaultDueDateFormatted = () => {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const QuotationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Mode: 'list' (Table & metrics view) or 'form' (Dedicated full-screen form view matching user screenshots)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage] = useState(1);

  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  // ==========================================
  // FORM STATE MATCHING USER SCREENSHOTS
  // ==========================================
  const [formQuoteNumber, setFormQuoteNumber] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formPreparedBy, setFormPreparedBy] = useState('DigiInk Solutions');
  const [formQuotationDate, setFormQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formValidUntil, setFormValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [formPlaceOfSupply, setFormPlaceOfSupply] = useState('Rajasthan');
  const [formClientGstin, setFormClientGstin] = useState('');
  const [formClientAddress, setFormClientAddress] = useState('');
  const [formClientEmail, setFormClientEmail] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');

  // Scope of Work Sections
  const [formSections, setFormSections] = useState<ScopeSection[]>([]);

  // Line Items
  const [formItems, setFormItems] = useState<LineItem[]>([]);

  // Pricing & GST Matrix
  const [formDiscountType, setFormDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(0);
  const [formGstApplication, setFormGstApplication] = useState<'cgst_sgst' | 'igst' | 'none'>('cgst_sgst');
  const [formGstRate, setFormGstRate] = useState<number>(18);

  // Payment Details (Pre-filled as per reference)
  const [formPaymentDueDate, setFormPaymentDueDate] = useState(() => getDefaultDueDateFormatted());
  const [formPaymentMethod, setFormPaymentMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [formNotes, setFormNotes] = useState(DEFAULT_NOTES);
  const [formTerms, setFormTerms] = useState(DEFAULT_TERMS);

  // 1. Fetch Quotations List
  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['quotations-list', searchTerm, statusFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(currentPage));
      params.append('limit', '50');
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
      return res.data?.data?.records || res.data?.data?.leads || [];
    },
    staleTime: 60 * 1000,
  });

  const leadsList = leadsData || [];

  // When a lead is selected in form, auto-fill client details
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leadsList.find((l: any) => l.id === leadId);
    if (lead) {
      setFormClientName(lead.name || '');
      setFormClientEmail(lead.email || '');
      setFormClientPhone(lead.phone || '');
      setFormClientAddress(lead.address || (lead.city ? `${lead.city}, Rajasthan` : ''));
    }
  };

  // Copy from Previous Quotation Handler
  const handleCopyFromPrevious = (prevQuoteId: string) => {
    if (!prevQuoteId) return;
    const prev = quotations.find((q) => q.id === prevQuoteId);
    if (!prev) return;

    if (prev.sections && prev.sections.length > 0) {
      setFormSections(JSON.parse(JSON.stringify(prev.sections)));
    }
    if (prev.items && prev.items.length > 0) {
      setFormItems(JSON.parse(JSON.stringify(prev.items)));
    }
    setFormDiscountType(prev.discount_type || 'fixed');
    setFormDiscountValue(Number(prev.discount_value) || 0);
    setFormGstApplication(prev.gst_type || 'cgst_sgst');
    setFormGstRate(prev.gst_rate !== undefined ? Number(prev.gst_rate) : 18);
    setFormPlaceOfSupply(prev.place_of_supply || 'Rajasthan');
    setFormPreparedBy(prev.prepared_by || 'DigiInk Solutions');
    if (prev.payment_due_date) setFormPaymentDueDate(prev.payment_due_date);
    if (prev.payment_method) setFormPaymentMethod(prev.payment_method);
    if (prev.notes) setFormNotes(prev.notes);
    if (prev.terms) setFormTerms(prev.terms);
    if (prev.title) setFormTitle(prev.title);

    Swal.fire({
      icon: 'success',
      title: 'Quotation Data Copied',
      text: `Scope of Work & Pricing copied from ${prev.quote_number}! Client details remain blank for the new client.`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Add / Remove Scope Section
  const handleAddSection = () => {
    const newSection: ScopeSection = {
      id: `sec_${Date.now()}`,
      title: '',
      content: '',
    };
    setFormSections((prev) => [...prev, newSection]);
  };

  const handleUpdateSection = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...formSections];
    updated[index] = { ...updated[index], [field]: value };
    setFormSections(updated);
  };

  const handleRemoveSection = (index: number) => {
    setFormSections((prev) => prev.filter((_, i) => i !== index));
  };

  // Line Item Handlers
  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        name: '',
        description: '',
        qty: 1,
        rate: 0,
        tax_pct: formGstApplication === 'none' ? 0 : formGstRate,
        amount: 0,
      },
    ]);
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...formItems];
    const item = { ...updated[index], [field]: value };

    const qty = Number(item.qty) || 1;
    const rate = Number(item.rate) || 0;
    const taxPct = formGstApplication === 'none' ? 0 : Number(item.tax_pct) || 0;
    const baseAmount = qty * rate;
    const taxAmount = (baseAmount * taxPct) / 100;
    item.amount = Math.round((baseAmount + taxAmount) * 100) / 100;

    updated[index] = item;
    setFormItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Pricing calculations
  const calculateTotals = () => {
    let subtotal = 0;
    formItems.forEach((item) => {
      const q = Number(item.qty) || 1;
      const r = Number(item.rate) || 0;
      subtotal += q * r;
    });

    let discountAmount = 0;
    if (formDiscountType === 'percentage') {
      discountAmount = (subtotal * (Number(formDiscountValue) || 0)) / 100;
    } else {
      discountAmount = Number(formDiscountValue) || 0;
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const effectiveGstRate = formGstApplication === 'none' ? 0 : Number(formGstRate) || 0;
    const totalGstAmount = (taxableAmount * effectiveGstRate) / 100;

    const cgstAmount = formGstApplication === 'cgst_sgst' ? totalGstAmount / 2 : 0;
    const sgstAmount = formGstApplication === 'cgst_sgst' ? totalGstAmount / 2 : 0;
    const igstAmount = formGstApplication === 'igst' ? totalGstAmount : 0;

    const grandTotal = taxableAmount + totalGstAmount;

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      effectiveGstRate,
      totalGstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
    };
  };

  const totals = calculateTotals();

  // Reset form to blank new state
  const resetForm = () => {
    setEditingQuotationId(null);
    setSelectedLeadId('');
    const year = new Date().getFullYear();
    const nextNum = (quotesData?.metrics?.total_quotes || 0) + 1;
    setFormQuoteNumber(`DIGI-Q-${year}-${String(nextNum).padStart(4, '0')}`);
    setFormClientName('');
    setFormPreparedBy('DigiInk Solutions');
    setFormQuotationDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setFormValidUntil(d.toISOString().split('T')[0]);
    setFormPlaceOfSupply('Rajasthan');
    setFormClientGstin('');
    setFormClientAddress('');
    setFormClientEmail('');
    setFormClientPhone('');
    setFormTitle('');
    setFormSections([]);
    setFormItems([]);
    setFormDiscountType('fixed');
    setFormDiscountValue(0);
    setFormGstApplication('cgst_sgst');
    setFormGstRate(18);
    setFormPaymentDueDate(getDefaultDueDateFormatted());
    setFormPaymentMethod(DEFAULT_PAYMENT_METHOD);
    setFormNotes(DEFAULT_NOTES);
    setFormTerms(DEFAULT_TERMS);
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    resetForm();
    setViewMode('form');
  };

  // Open Form for Edit
  const handleEdit = (q: Quotation) => {
    setEditingQuotationId(q.id);
    setFormQuoteNumber(q.quote_number || '');
    setSelectedLeadId(q.lead_id || '');
    setFormTitle(q.title || '');
    setFormClientName(q.client_name || '');
    setFormClientEmail(q.client_email || '');
    setFormClientPhone(q.client_phone || '');
    setFormClientAddress(q.client_address || '');
    setFormClientGstin(q.client_gstin || '');
    setFormPreparedBy(q.prepared_by || 'DigiInk Solutions');
    setFormPlaceOfSupply(q.place_of_supply || 'Rajasthan');
    if (q.quotation_date) setFormQuotationDate(q.quotation_date.split('T')[0]);
    if (q.valid_until) setFormValidUntil(q.valid_until.split('T')[0]);
    setFormSections(q.sections && q.sections.length > 0 ? q.sections : []);
    setFormItems(q.items && q.items.length > 0 ? q.items : []);
    setFormDiscountType(q.discount_type || 'fixed');
    setFormDiscountValue(Number(q.discount_value) || 0);
    setFormGstApplication(q.gst_type || 'cgst_sgst');
    setFormGstRate(q.gst_rate !== undefined ? Number(q.gst_rate) : 18);
    setFormPaymentDueDate(q.payment_due_date || '');
    setFormPaymentMethod(q.payment_method || 'Bank Transfer / UPI');
    setFormNotes(q.notes || '');
    setFormTerms(q.terms || DEFAULT_TERMS);
    setViewMode('form');
  };

  // Create / Update Mutation
  const saveQuotationMutation = useMutation({
    mutationFn: async () => {
      if (!formClientName.trim()) {
        throw new Error('Please enter Client Name.');
      }
      if (formItems.length === 0) {
        throw new Error('Please add at least 1 line item.');
      }

      const payload = {
        quote_number: formQuoteNumber.trim(),
        lead_id: selectedLeadId || undefined,
        title: formTitle.trim() || 'Project Proposal & Quotation',
        client_name: formClientName.trim(),
        client_email: formClientEmail.trim() || undefined,
        client_phone: formClientPhone.trim() || undefined,
        client_address: formClientAddress.trim() || undefined,
        client_gstin: formClientGstin.trim() || undefined,
        prepared_by: formPreparedBy.trim() || 'DigiInk Solutions',
        place_of_supply: formPlaceOfSupply.trim() || 'Rajasthan',
        quotation_date: formQuotationDate,
        valid_until: formValidUntil,
        sections: formSections,
        items: formItems,
        discount_type: formDiscountType,
        discount_value: formDiscountValue,
        gst_type: formGstApplication,
        gst_rate: formGstRate,
        payment_due_date: formPaymentDueDate.trim() || undefined,
        payment_method: formPaymentMethod.trim() || undefined,
        notes: formNotes.trim() || undefined,
        terms: formTerms.trim() || undefined,
        status: 'sent',
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
      const saved = data?.data;
      Swal.fire({
        icon: 'success',
        title: editingQuotationId ? 'Quotation Updated!' : 'Quotation Saved & Generated!',
        html: `
          <div style="font-size: 13px; color: #475569; text-align: left; padding: 6px;">
            <p><strong>Quotation No:</strong> ${saved?.quote_number}</p>
            <p><strong>Client:</strong> ${saved?.client_name}</p>
            <p><strong>Total Value:</strong> ₹${Number(saved?.total_amount).toLocaleString('en-IN')}</p>
          </div>
        `,
        confirmButtonText: 'View Quotation Page',
        confirmButtonColor: '#003884',
        showCancelButton: true,
        cancelButtonText: 'Back to List',
      }).then((result) => {
        if (result.isConfirmed && saved?.id) {
          navigate(`/quotations/view/${saved.id}`);
        } else {
          setViewMode('list');
        }
      });
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Save',
        text: err?.response?.data?.message || err.message,
        confirmButtonColor: '#003884',
      });
    },
  });

  // Convert to Invoice Mutation
  const convertToInvoiceMutation = useMutation({
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

  // Share Web Link
  const handleCopyPublicLink = (q: Quotation) => {
    const link = `${window.location.origin}/quote/${q.public_token}`;
    navigator.clipboard.writeText(link);
    Swal.fire({
      icon: 'success',
      title: 'Proposal Link Copied!',
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
        {/* ======================================================== */}
        {/* VIEW 1: DEDICATED FULL-PAGE FORM (MATCHING USER SCREENSHOTS) */}
        {/* ======================================================== */}
        {viewMode === 'form' ? (
          <div className="space-y-6">
            {/* Top Navigation & Back Row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Quotations List</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveQuotationMutation.isPending}
                  onClick={() => saveQuotationMutation.mutate()}
                  className="px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition rounded-xl shadow-xs cursor-pointer"
                >
                  {saveQuotationMutation.isPending ? 'Saving...' : 'Save & Generate PDF'}
                </button>
              </div>
            </div>

            {/* TOP CARD: COPY FROM PREVIOUS QUOTATION (EXACT REPLICA OF IMAGE 1) */}
            <div className="bg-blue-50/70 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Copy from Previous Quotation</h4>
                  <p className="text-[11px] text-slate-500">
                    Select a previous quotation to auto-fill its Scope of Work &amp; Pricing. Client name remains blank for the new client.
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    handleCopyFromPrevious(e.target.value);
                    e.target.value = '';
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-[#003884] bg-white border border-blue-200 rounded-xl shadow-2xs hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="" disabled>
                    + Select Previous Quotation...
                  </option>
                  {quotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quote_number} • {q.client_name} (₹{Number(q.total_amount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION 1: QUOTATION DETAILS (EXACT 3-COLUMN GRID FROM IMAGE 1) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-1 h-3.5 bg-[#003884] rounded-full inline-block"></span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Quotation Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Quotation No */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Quotation No.
                  </label>
                  <input
                    type="text"
                    value={formQuoteNumber}
                    onChange={(e) => setFormQuoteNumber(e.target.value)}
                    placeholder="DIGI-Q-2026-0056"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                {/* Client Name with Lead Auto-fill helper */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Client Name *
                    </label>
                    {leadsList.length > 0 && (
                      <select
                        value={selectedLeadId}
                        onChange={(e) => handleSelectLead(e.target.value)}
                        className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
                      >
                        <option value="">(Or pick from Leads)</option>
                        {leadsList.map((l: any) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="e.g. Acme Pvt. Ltd."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                {/* Prepared By */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Prepared By
                  </label>
                  <input
                    type="text"
                    value={formPreparedBy}
                    onChange={(e) => setFormPreparedBy(e.target.value)}
                    placeholder="DigiInk Solutions"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                {/* Quotation Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Quotation Date *
                  </label>
                  <input
                    type="date"
                    value={formQuotationDate}
                    onChange={(e) => setFormQuotationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                {/* Valid Till */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Valid Till
                  </label>
                  <input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                {/* Place of Supply */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Place of Supply
                  </label>
                  <input
                    type="text"
                    value={formPlaceOfSupply}
                    onChange={(e) => setFormPlaceOfSupply(e.target.value)}
                    placeholder="Rajasthan"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                {/* Client GSTIN */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Client GSTIN (optional)
                  </label>
                  <input
                    type="text"
                    value={formClientGstin}
                    onChange={(e) => setFormClientGstin(e.target.value)}
                    placeholder="e.g. 08AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                {/* Client Address (Spans 2 columns) */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Client Address (optional)
                  </label>
                  <input
                    type="text"
                    value={formClientAddress}
                    onChange={(e) => setFormClientAddress(e.target.value)}
                    placeholder="Full client billing / site address..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>
              </div>

              {/* Extra row for Phone & Email (so WhatsApp/Email proposal works) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Client Phone (For WhatsApp Share)
                  </label>
                  <input
                    type="text"
                    value={formClientPhone}
                    onChange={(e) => setFormClientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={formClientEmail}
                    onChange={(e) => setFormClientEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: QUOTATION SECTIONS (SCOPE OF WORK) (FROM IMAGE 1) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-1 h-3.5 bg-[#003884] rounded-full inline-block"></span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Quotation Sections (Scope of Work)
                </h3>
              </div>

              {formSections.length === 0 ? (
                <div className="py-2 text-xs text-slate-400 italic">
                  No sections yet. Click &lsquo;Add Section&rsquo; to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {formSections.map((sec, idx) => (
                    <div
                      key={sec.id || idx}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => handleUpdateSection(idx, 'title', e.target.value)}
                          placeholder="Section Title (e.g. Scope of Work, Deliverables, Milestones, Technology Stack)..."
                          className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003884]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          Remove Section
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        value={sec.content}
                        onChange={(e) => handleUpdateSection(idx, 'content', e.target.value)}
                        placeholder="Detail the scope of work, technical specifications, deliverables, or project terms for this section..."
                        className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#003884] leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition cursor-pointer"
                >
                  + Add Section
                </button>
              </div>
            </div>

            {/* SECTION 3: BUDGET / PRICING & GST MATRIX (EXACT REPLICA OF IMAGE 1 & 2) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-1 h-3.5 bg-[#003884] rounded-full inline-block"></span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Budget / Pricing &amp; GST Matrix
                </h3>
              </div>

              {/* Items Table with Dark Navy Header matching Screenshot */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#0b1329] text-white font-extrabold tracking-wider text-[11px] uppercase">
                    <tr>
                      <th className="py-3 px-4">Service / Item Name</th>
                      <th className="py-3 px-4 w-24 text-center">Qty</th>
                      <th className="py-3 px-4 w-40 text-right">Amount (Rs.)</th>
                      <th className="py-3 px-4 w-20 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {formItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            placeholder="Service or Item Name"
                            className="w-full px-3 py-1.5 font-bold text-xs text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#003884]"
                          />
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            placeholder="Additional details / scope..."
                            className="w-full px-3 py-1 text-[11px] text-slate-500 border border-slate-100 rounded-lg mt-1 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-center font-medium text-xs border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate || ''}
                            onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                            placeholder="0"
                            className="w-full px-3 py-1.5 text-right font-mono font-bold text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#003884]"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 font-bold p-1 transition cursor-pointer"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Item</span>
                </button>
              </div>

              {/* Tax & Discount Controls + Summary Box */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-100 items-start text-xs">
                {/* Left Controls (8 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Discount Type
                      </label>
                      <select
                        value={formDiscountType}
                        onChange={(e) => setFormDiscountType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                      >
                        <option value="fixed">Fixed Amount (Rs.)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Discount Value
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formDiscountValue}
                        onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        GST Application
                      </label>
                      <select
                        value={formGstApplication}
                        onChange={(e) => setFormGstApplication(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                      >
                        <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                        <option value="igst">IGST (Inter-state)</option>
                        <option value="none">None / Zero-Rated / Exempt</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        GST Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={formGstApplication === 'none'}
                        value={formGstApplication === 'none' ? 0 : formGstRate}
                        onChange={(e) => setFormGstRate(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Summary Box (Exact look from Image 2) */}
                <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-2.5">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-900">
                      Rs. {totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount:</span>
                      <span className="font-mono">
                        - Rs. {totals.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Taxable Amount:</span>
                    <span className="font-mono text-slate-900">
                      Rs. {totals.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {formGstApplication === 'cgst_sgst' && (
                    <>
                      <div className="flex justify-between text-blue-800 font-medium">
                        <span>CGST ({totals.effectiveGstRate / 2}%):</span>
                        <span className="font-mono">
                          + Rs. {totals.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-blue-800 font-medium">
                        <span>SGST ({totals.effectiveGstRate / 2}%):</span>
                        <span className="font-mono">
                          + Rs. {totals.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}

                  {formGstApplication === 'igst' && (
                    <div className="flex justify-between text-blue-800 font-medium">
                      <span>IGST ({totals.effectiveGstRate}%):</span>
                      <span className="font-mono">
                        + Rs. {totals.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Grand Total (Tax Incl.):</span>
                    <span className="text-base text-[#003884] font-mono font-bold">
                      Rs. {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: PAYMENT DETAILS (EXACT MATCH FROM IMAGE 2) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-1 h-3.5 bg-[#003884] rounded-full inline-block"></span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Payment Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="text"
                    value={formPaymentDueDate}
                    onChange={(e) => setFormPaymentDueDate(e.target.value)}
                    placeholder="e.g. Every 10th of the Month"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    placeholder="e.g. Bank Transfer / UPI"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Thank you for choosing DigiInk Solutions for your marketing needs."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884] leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveQuotationMutation.isPending}
                onClick={() => saveQuotationMutation.mutate()}
                className="px-7 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition rounded-xl shadow-sm cursor-pointer"
              >
                {saveQuotationMutation.isPending ? 'Saving & Generating...' : 'Save & Generate PDF'}
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* VIEW 2: QUOTATIONS LISTING & METRICS TABLE               */
          /* ======================================================== */
          <div className="space-y-6">
            {/* Top Action Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Quotations &amp; Proposals</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate professional quotations, share instant web links for client acceptance, and convert to invoices
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded-xl shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Quotation</span>
                </button>
              </div>
            </div>

            {/* 4 Metrics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Quotes</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{metrics.total_quotes}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Created proposals</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Value</p>
                <h3 className="text-2xl font-black text-[#003884] mt-2">
                  ₹{Number(metrics.total_value).toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gross quotation pipeline</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Accepted by Client</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-2">{metrics.accepted_count}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Signed via public link</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Invoiced</p>
                <h3 className="text-2xl font-black text-purple-600 mt-2">{metrics.converted_count}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Converted to tax invoice</p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by quote #, client, title..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
                {['all', 'sent', 'accepted', 'converted', 'draft', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg capitalize cursor-pointer transition ${
                      statusFilter === st
                        ? 'bg-[#003884] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Quotations Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Quote No</th>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Project Title</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">Loading quotations...</td>
                      </tr>
                    ) : quotations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No quotations found. Click &lsquo;Create Quotation&rsquo; to start.
                        </td>
                      </tr>
                    ) : (
                      quotations.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-[#003884]">
                            {q.quote_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{q.client_name}</div>
                            {q.client_phone && <div className="text-[11px] text-slate-400 font-mono">{q.client_phone}</div>}
                          </td>
                          <td className="py-3 px-4 font-medium max-w-xs truncate">{q.title}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(q.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">{renderStatusBadge(q.status)}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(q.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Quotation Page */}
                              <button
                                type="button"
                                onClick={() => navigate(`/quotations/view/${q.id}`)}
                                title="View Quotation Page"
                                className="p-1.5 text-slate-600 hover:text-[#003884] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Copy Public Link */}
                              <button
                                type="button"
                                onClick={() => handleCopyPublicLink(q)}
                                title="Copy Client Acceptance Link"
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                              </button>

                              {/* WhatsApp Share */}
                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp(q)}
                                title="Share via WhatsApp"
                                className="p-1.5 text-slate-600 hover:text-[#25D366] hover:bg-green-50 rounded-lg transition cursor-pointer"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12.031 2a9.967 9.967 0 00-8.528 15.176L2 22l4.981-1.472A9.963 9.963 0 0012.031 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.286c-1.579 0-3.08-.432-4.385-1.246l-.315-.196-3.238.956.974-3.158-.21-.334a8.251 8.251 0 01-1.267-4.308c0-4.57 3.717-8.286 8.441-8.286 4.653 0 8.44 3.716 8.44 8.286 0 4.57-3.787 8.286-8.235 8.286z" />
                                </svg>
                              </button>

                              {/* Convert to Invoice */}
                              {q.status !== 'converted' ? (
                                <button
                                  type="button"
                                  onClick={() => convertToInvoiceMutation.mutate(q.id)}
                                  title="Convert to Tax Invoice"
                                  className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition cursor-pointer"
                                >
                                  Invoice
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  Invoiced
                                </span>
                              )}

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleEdit(q)}
                                title="Edit Quotation"
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete quotation ${q.quote_number}?`)) {
                                    deleteMutation.mutate(q.id);
                                  }
                                }}
                                title="Delete Quotation"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
          </div>
        )}
      </div>
    </CrmLayout>
  );
};

export default QuotationsPage;
