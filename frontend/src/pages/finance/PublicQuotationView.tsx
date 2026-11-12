import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Swal from 'sweetalert2';
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

interface QuotationSection {
  title: string;
  content: string;
}

interface QuotationData {
  id: string;
  quote_number: string;
  public_token: string;
  title: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  place_of_supply?: string;
  client_gstin?: string;
  prepared_by?: string;
  gst_type?: 'cgst_sgst' | 'igst' | 'none';
  gst_rate?: number;
  payment_due_date?: string;
  payment_method?: string;
  quotation_date?: string;
  sections?: QuotationSection[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  items: LineItem[];
  subtotal: number;
  tax_amount: number;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  valid_until?: string;
  terms?: string;
  notes?: string;
  created_at: string;
  accepted_at?: string;
  accepted_by_name?: string;
  accepted_notes?: string;
  rejection_reason?: string;
  converted_invoice_id?: string;
}

interface CompanyInfo {
  companyName?: string;
  brandName?: string;
  email?: string;
  phone?: string;
  website?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  logoUrl?: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
}

export const PublicQuotationView: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [acceptSignatory, setAcceptSignatory] = useState('');
  const [acceptRemarks, setAcceptRemarks] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch Public Quotation Details
  const { data, isLoading, isError, refetch } = useQuery<{
    quotation: QuotationData;
    company: CompanyInfo;
  }>({
    queryKey: ['public-quotation', token],
    queryFn: async () => {
      const res = await api.get(`/finance/quotations/public/${token}`);
      return res.data?.data;
    },
    enabled: !!token,
    staleTime: 10 * 1000,
  });

  const quote = data?.quotation;
  const company = data?.company || {};

  // Auto-fill signatory name when quote is loaded
  React.useEffect(() => {
    if (quote?.client_name && !acceptSignatory) {
      setAcceptSignatory(quote.client_name);
    }
  }, [quote?.client_name]);

  // Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!acceptSignatory.trim()) {
        throw new Error('Please enter the name of the authorized signatory.');
      }
      const res = await api.post(`/finance/quotations/public/${token}/accept`, {
        client_name: acceptSignatory.trim(),
        remarks: acceptRemarks.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      Swal.fire({
        icon: 'success',
        title: 'Quotation Accepted!',
        text: 'Thank you! Your acceptance has been officially recorded. Our team will proceed with the project execution immediately.',
        confirmButtonColor: '#003884',
      });
      refetch();
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Acceptance Failed',
        text: err?.response?.data?.message || err?.message || 'Something went wrong',
        confirmButtonColor: '#003884',
      });
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/finance/quotations/public/${token}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      setShowRejectModal(false);
      Swal.fire({
        icon: 'info',
        title: 'Feedback Submitted',
        text: 'Your feedback has been delivered to the DigiInk Solutions sales team.',
        confirmButtonColor: '#003884',
      });
      refetch();
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || err?.message || 'Failed to submit feedback',
        confirmButtonColor: '#003884',
      });
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-[#003884] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-800">Loading Quotation...</h3>
          <p className="text-xs text-slate-500 mt-1">Retrieving official proposal from DigiInk Solutions</p>
        </div>
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Quotation Not Found</h2>
          <p className="text-xs text-slate-500 mt-2">
            This quotation link may have expired or is invalid. Please contact DigiInk Solutions at{' '}
            <strong className="text-slate-700">+91 9024154995</strong> or email{' '}
            <strong className="text-slate-700">hostingdigiink@gmail.com</strong>.
          </p>
          <div className="mt-6">
            <a
              href="https://www.digiinksolutions.com"
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-[#003884] text-white text-xs font-semibold rounded-lg hover:bg-[#002860]"
            >
              Visit DigiInk Solutions
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isAccepted = quote.status === 'accepted' || quote.status === 'converted';
  const isRejected = quote.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased py-6 px-3 sm:px-6 print:p-0 print:bg-white">
      {/* Floating Top Bar (Hidden during print) */}
      <div className="max-w-4xl mx-auto mb-4 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-[#003884] flex items-center justify-center font-black text-sm">
            D
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {company.companyName || 'DigiInk Solutions'}
            </div>
            <div className="text-[11px] text-slate-500">Official Client Proposal Portal</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print / Save PDF</span>
          </button>

          <a
            href="tel:+919024154995"
            className="px-3.5 py-1.5 text-xs font-semibold text-[#003884] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition hidden sm:inline-block"
          >
            Call Support: +91 9024154995
          </a>
        </div>
      </div>

      {/* Main Quotation Document Container */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
        {/* Header / Letterhead */}
        <div className="p-6 sm:p-8 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            {/* Company Info */}
            <div className="space-y-1 max-w-md">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#003884] tracking-tight">
                  {company.companyName || 'DigiInk Solutions'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {company.addressLine1 || '318 3rd and 4th, Metro Station New Aatish Market'}
                <br />
                {company.addressLine2 || 'Devi Nagar, Mansarovar, Jaipur, Rajasthan 302020'}
              </p>
              <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
                <div>
                  <strong>GSTIN:</strong> {company.gstin || '08AGHPP4568R1ZD'}
                </div>
                <div>
                  <strong>Phone:</strong> {company.phone || '+91 9024154995'} |{' '}
                  <strong>Email:</strong> {company.email || 'hostingdigiink@gmail.com'}
                </div>
                <div>
                  <strong>Website:</strong>{' '}
                  <a
                    href={company.website || 'https://www.digiinksolutions.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#003884] hover:underline"
                  >
                    {company.website || 'https://www.digiinksolutions.com'}
                  </a>
                </div>
              </div>
            </div>

            {/* Quotation Metadata Card */}
            <div className="sm:text-right w-full sm:w-auto bg-white sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-none border-slate-200">
              <div className="inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-[#003884] text-white mb-2">
                Official Quotation
              </div>
              <div className="text-lg font-extrabold text-slate-900 font-mono">
                {quote.quote_number}
              </div>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <div>
                  Date:{' '}
                  <strong className="text-slate-800">
                    {new Date(quote.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                {quote.valid_until && (
                  <div>
                    Valid Until:{' '}
                    <strong className="text-slate-800">
                      {new Date(quote.valid_until).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-3">
                {isAccepted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>ACCEPTED &amp; APPROVED</span>
                  </span>
                ) : isRejected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <span>REJECTED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#003884] border border-blue-300">
                    <span>AWAITING CLIENT ACCEPTANCE</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Client & Scope Section */}
        <div className="p-6 sm:p-8 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Prepared For
            </span>
            <div className="mt-1 text-base font-bold text-slate-900">{quote.client_name}</div>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              {quote.client_address && <div>Address: {quote.client_address}</div>}
              {quote.place_of_supply && <div>Place of Supply: {quote.place_of_supply}</div>}
              {quote.client_gstin && <div>GSTIN: {quote.client_gstin}</div>}
              {quote.client_phone && <div>Phone: {quote.client_phone}</div>}
              {quote.client_email && <div>Email: {quote.client_email}</div>}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Prepared By &amp; Proposal Subject
            </span>
            <div className="mt-1 text-sm font-bold text-slate-900">{quote.prepared_by || 'DigiInk Solutions'}</div>
            <div className="text-xs text-[#003884] font-semibold mt-1">{quote.title}</div>
            {quote.notes && (
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{quote.notes}</p>
            )}
          </div>
        </div>

        {/* Scope of Work Sections */}
        {quote.sections && quote.sections.length > 0 && (
          <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#003884] rounded-full inline-block"></span>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Scope of Work &amp; Project Deliverables
              </h3>
            </div>
            <div className="space-y-3">
              {quote.sections.map((sec, sIdx) => (
                <div key={sIdx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-[#003884] font-bold text-[11px] flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                      {sec.title}
                    </h4>
                  </div>
                  <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed pl-7">
                    {sec.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <div className="p-6 sm:p-8">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Item &amp; Description</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {quote.items && quote.items.length > 0 ? (
                  quote.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">{item.qty}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        ₹{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {item.tax_pct}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No line items specified
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Financial Breakdown */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="w-full sm:max-w-md space-y-3">
              {(quote.payment_due_date || quote.payment_method) && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                    Payment Terms
                  </span>
                  {quote.payment_due_date && (
                    <div className="text-slate-700">
                      <strong className="text-slate-900">Payment Due:</strong> {quote.payment_due_date}
                    </div>
                  )}
                  {quote.payment_method && (
                    <div className="text-slate-700">
                      <strong className="text-slate-900">Payment Method:</strong> {quote.payment_method}
                    </div>
                  )}
                </div>
              )}

              {quote.terms && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Terms &amp; Conditions
                  </span>
                  <div className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                    {quote.terms}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₹{Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {Number(quote.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Applied:</span>
                  <span className="font-mono font-semibold">
                    -₹{Number(quote.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {quote.gst_type === 'igst' ? (
                <div className="flex justify-between text-slate-600">
                  <span>IGST ({quote.gst_rate || 18}%):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{Number(quote.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : quote.gst_type === 'none' ? (
                <div className="flex justify-between text-slate-500 italic">
                  <span>GST:</span>
                  <span>Exempt / Zero-rated</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST ({(Number(quote.gst_rate || 18) / 2).toFixed(1)}%):</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₹{(Number(quote.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST ({(Number(quote.gst_rate || 18) / 2).toFixed(1)}%):</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₹{(Number(quote.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Total Proposal Value:</span>
                <span className="text-base text-[#003884] font-mono">
                  ₹{Number(quote.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Acceptance Action Box (Interactive) */}
        <div className="p-6 sm:p-8 border-t border-slate-200 bg-linear-to-b from-white to-slate-50">
          {isAccepted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-xl font-black shadow-sm">
                ✓
              </div>
              <h3 className="text-base font-bold text-emerald-900">
                Quotation Formally Accepted &amp; Approved
              </h3>
              <p className="text-xs text-emerald-700 max-w-lg mx-auto">
                Accepted by <strong className="font-semibold">{quote.accepted_by_name || quote.client_name}</strong>
                {quote.accepted_at && (
                  <>
                    {' '}
                    on{' '}
                    <strong className="font-semibold">
                      {new Date(quote.accepted_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>
                  </>
                )}
                .
              </p>
              {quote.accepted_notes && (
                <div className="mt-2 text-xs italic text-emerald-800 bg-white/70 py-1.5 px-3 rounded-lg border border-emerald-200 inline-block">
                  &ldquo;{quote.accepted_notes}&rdquo;
                </div>
              )}
            </div>
          ) : isRejected ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-300 text-center space-y-2">
              <h3 className="text-base font-bold text-rose-900">Quotation Declined</h3>
              {quote.rejection_reason && (
                <p className="text-xs text-rose-700">Reason: {quote.rejection_reason}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 print:hidden">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Electronic Acceptance &amp; Project Approval
                </h3>
                <p className="text-xs text-slate-500">
                  Please review the terms and pricing above. To accept this proposal and authorize DigiInk
                  Solutions to initiate work, fill out your name below and click Accept.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name of Authorized Signatory *
                  </label>
                  <input
                    type="text"
                    value={acceptSignatory}
                    onChange={(e) => setAcceptSignatory(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PO Reference / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={acceptRemarks}
                    onChange={(e) => setAcceptRemarks(e.target.value)}
                    placeholder="e.g. Approved as discussed. PO-2026-99"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="text-xs text-slate-500 hover:text-rose-600 transition underline cursor-pointer"
                >
                  Request revision or decline quotation
                </button>

                <button
                  type="button"
                  disabled={acceptMutation.isPending || !acceptSignatory.trim()}
                  onClick={() => acceptMutation.mutate()}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                    acceptMutation.isPending || !acceptSignatory.trim()
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    {acceptMutation.isPending ? 'Recording Acceptance...' : '✓ Accept & Approve Quotation'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Document Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-[11px] text-slate-500">
          <div>This is a computer-generated quotation issued by {company.companyName || 'DigiInk Solutions'}.</div>
          <div className="mt-0.5">
            For any queries or billing support, please email {company.email || 'hostingdigiink@gmail.com'} or call {company.phone || '+91 9024154995'}.
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Decline or Request Revision</h3>
            <p className="text-xs text-slate-500">
              Please share what changes or considerations are needed so our team can update the quotation for you.
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason or requested adjustments..."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#003884]"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                {rejectMutation.isPending ? 'Submitting...' : 'Submit Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicQuotationView;
