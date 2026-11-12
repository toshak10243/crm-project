import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

interface ScopeSection {
  title: string;
  content: string;
  goal?: string;
}

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
  place_of_supply?: string;
  client_gstin?: string;
  prepared_by?: string;
  gst_type?: 'cgst_sgst' | 'igst' | 'none';
  gst_rate?: number;
  payment_due_date?: string;
  payment_method?: string;
  quotation_date?: string;
  valid_until?: string;
  sections?: ScopeSection[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  items: LineItem[];
  subtotal: number;
  tax_amount: number;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  terms?: string;
  notes?: string;
  sent_at?: string;
  accepted_at?: string;
  accepted_by_name?: string;
  accepted_notes?: string;
  converted_invoice_id?: string;
  created_at: string;
}

export const ViewQuotationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeTemplate, setActiveTemplate] = useState<'tpl1' | 'tpl2'>('tpl1');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live Clock for Top Bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      setCurrentTime(`${datePart} ${timePart}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Quotation Data
  const { data: quote, isLoading, isError } = useQuery<Quotation>({
    queryKey: ['quotation-detail', id],
    queryFn: async () => {
      const res = await api.get(`/finance/quotations/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!quote?.public_token) return;
    const url = `${window.location.origin}/quote/${quote.public_token}`;
    navigator.clipboard.writeText(url);
    Swal.fire({
      icon: 'success',
      title: 'Link Copied!',
      text: 'Public client quotation link has been copied to your clipboard.',
      timer: 2000,
      showConfirmButton: false,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-[#003884] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-800">Loading Quotation...</h3>
          <p className="text-xs text-slate-500 mt-1">Retrieving quotation specifications and scope</p>
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
            The quotation you requested could not be retrieved or has been removed.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/quotations')}
              className="px-4 py-2 bg-[#003884] text-white text-xs font-semibold rounded-lg hover:bg-[#002860]"
            >
              Back to Quotations List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Format Dates
  const issueDateFormatted = new Date(quote.quotation_date || quote.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const validTillFormatted = quote.valid_until
    ? new Date(quote.valid_until).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Open';

  // Fallback Scope Sections if none added
  const sectionsToRender: ScopeSection[] = (quote.sections && quote.sections.length > 0)
    ? quote.sections
    : (quote.items && quote.items.length > 0)
    ? quote.items.map((it) => ({
        title: it.name,
        content: it.description || 'Full scope implementation, testing, onboarding and deployment.',
        goal: 'Convert visitors into Direct Booking & Growth',
      }))
    : [
        {
          title: quote.title || 'Digital Solution Implementation',
          content: '1. Requirement gathering & architecture\n2. Design, UI/UX & Responsive Development\n3. Integration, Quality Assurance & Deployment\n4. Onboarding, Training & Technical Support',
          goal: 'Business Transformation & Client Success',
        },
      ];

  const gstRate = quote.gst_rate !== undefined ? Number(quote.gst_rate) : 18;
  const isIgst = quote.gst_type === 'igst';
  const isGstExempt = quote.gst_type === 'none';

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased">
      {/* ======================================================== */}
      {/* TOP NAVBAR (MATCHING SCREENSHOT 1 & 2)                  */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs print:hidden">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003884] flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-blue-100">
            D
          </div>
          <div>
            <div className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Digiink Solutions LLP</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Quotation &amp; Invoice Management System
            </div>
          </div>
        </div>

        {/* Right: Date, Welcome User, Avatar */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-semibold text-slate-500 font-mono">
              {currentTime}
            </div>
            <div className="text-xs font-bold text-slate-900">
              Welcome, {user?.name || 'Aditya Sethi'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium capitalize">
              {user?.role || 'Administrator'}
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-[#0b1329] text-white font-black text-sm flex items-center justify-center shadow-xs">
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER                                           */}
      {/* ======================================================== */}
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 print:p-0 print:max-w-none">
        {/* The White Card Container */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:rounded-none print:p-0">
          
          {/* TOP CARD HEADER WITH ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100 print:hidden">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                DOCUMENT REFERENCE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                Quotation #{quote.quote_number}
              </h1>
            </div>

            {/* ACTION BUTTON CLUSTER (MATCHING SCREENSHOT 1 EXACTLY) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* PDF Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5b4bc4] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>PDF</span>
              </button>

              {/* Template 1 Toggle Button */}
              <button
                type="button"
                onClick={() => setActiveTemplate('tpl1')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  activeTemplate === 'tpl1'
                    ? 'bg-blue-50 text-[#003884] border-[#003884] ring-2 ring-blue-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Tpl 1
              </button>

              {/* Template 2 Toggle Button */}
              <button
                type="button"
                onClick={() => setActiveTemplate('tpl2')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  activeTemplate === 'tpl2'
                    ? 'bg-blue-50 text-[#003884] border-[#003884] ring-2 ring-blue-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Tpl 2
              </button>

              {/* Copy Client Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition cursor-pointer hidden md:flex items-center gap-1.5"
                title="Copy Client Public URL"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Link</span>
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => navigate('/quotations')}
                className="px-4 py-2 bg-[#475569] hover:bg-[#334155] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TEMPLATE 1: EXACT MATCH TO USER'S SCREENSHOT 1 & 2       */}
          {/* ======================================================== */}
          {activeTemplate === 'tpl1' && (
            <div className="space-y-8 animate-fadeIn">
              {/* METADATA PILL BAR (EXACT MATCH SCREENSHOT 1) */}
              <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-5 gap-4 items-center text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Client</span>
                  <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                    {quote.client_name}
                  </strong>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Issued</span>
                  <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                    {issueDateFormatted}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Valid Till</span>
                  <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                    {validTillFormatted}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Status</span>
                  <div className="mt-0.5">
                    <span className="inline-block px-3 py-0.5 text-[11px] font-bold rounded-full bg-[#dcfce7] text-[#15803d]">
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Place of Supply</span>
                  <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                    {quote.place_of_supply || 'Rajasthan'}
                  </span>
                </div>
              </div>

              {/* SCOPE OF WORK (EXACT MATCH SCREENSHOT 1) */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Scope of Work
                </h3>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4 w-1/4">Section Title</th>
                        <th className="py-3 px-4 w-1/2">Services Description</th>
                        <th className="py-3 px-4 w-1/4">Strategic Goals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sectionsToRender.map((sec, idx) => (
                        <tr key={idx} className="align-top hover:bg-slate-50/50">
                          {/* Column 1: Section Title */}
                          <td className="py-4 px-4 font-bold text-slate-900">
                            {sec.title}
                          </td>

                          {/* Column 2: Services Description */}
                          <td className="py-4 px-4 text-slate-700 leading-relaxed">
                            <div className="space-y-1">
                              {sec.content.split('\n').filter((l) => l.trim()).map((line, lIdx) => (
                                <div key={lIdx} className="text-xs text-slate-700">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Column 3: Strategic Goals */}
                          <td className="py-4 px-4 text-slate-600 font-medium leading-relaxed">
                            {sec.goal || 'Convert visitors into Direct Booking & Growth'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FINANCIAL BREAKDOWN (EXACT MATCH SCREENSHOT 2) */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                  {/* Left Side: Payment terms & notes */}
                  <div className="w-full sm:max-w-md space-y-3 text-xs">
                    {(quote.payment_due_date || quote.payment_method) && (
                      <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Payment Particulars
                        </span>
                        {quote.payment_due_date && (
                          <div className="text-slate-700">
                            <strong>Payment Due:</strong> {quote.payment_due_date}
                          </div>
                        )}
                        {quote.payment_method && (
                          <div className="text-slate-700">
                            <strong>Payment Method:</strong> {quote.payment_method}
                          </div>
                        )}
                      </div>
                    )}

                    {quote.notes && (
                      <div className="text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-slate-100">
                        &ldquo;{quote.notes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Right Side: Financial Breakdown Box */}
                  <div className="w-full sm:w-96 space-y-3">
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight sm:text-right">
                      Financial Breakdown
                    </h3>

                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                      {/* Table of items */}
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-4">Service Description</th>
                            <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {quote.items && quote.items.length > 0 ? (
                            quote.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 font-medium text-slate-900">
                                  {it.name}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-semibold">
                                  ₹ {Number(it.rate * (it.qty || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="py-2.5 px-4 font-medium text-slate-900">
                                {quote.title || 'Service Delivery'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold">
                                ₹ {Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}

                          {/* Subtotal */}
                          <tr className="bg-slate-50/60 font-bold text-slate-700">
                            <td className="py-2 px-4">Subtotal</td>
                            <td className="py-2 px-4 text-right font-mono">
                              ₹ {Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>

                          {/* Discount if any */}
                          {Number(quote.discount_amount || 0) > 0 && (
                            <tr className="text-emerald-700 font-medium">
                              <td className="py-1.5 px-4">Discount</td>
                              <td className="py-1.5 px-4 text-right font-mono">
                                - ₹ {Number(quote.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}

                          {/* Tax Breakdown */}
                          {!isGstExempt && (
                            <>
                              {isIgst ? (
                                <tr className="text-slate-600">
                                  <td className="py-1.5 px-4">IGST ({gstRate}%)</td>
                                  <td className="py-1.5 px-4 text-right font-mono">
                                    + ₹ {Number(quote.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ) : (
                                <>
                                  <tr className="text-slate-600">
                                    <td className="py-1.5 px-4">CGST ({(gstRate / 2).toFixed(1)}%)</td>
                                    <td className="py-1.5 px-4 text-right font-mono">
                                      + ₹ {(Number(quote.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                  <tr className="text-slate-600">
                                    <td className="py-1.5 px-4">SGST ({(gstRate / 2).toFixed(1)}%)</td>
                                    <td className="py-1.5 px-4 text-right font-mono">
                                      + ₹ {(Number(quote.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </>
                              )}
                            </>
                          )}
                        </tbody>
                      </table>

                      {/* DARK NAVY GRAND TOTAL BAR (EXACT REPLICA SCREENSHOT 2) */}
                      <div className="bg-[#0b1329] text-white p-3.5 px-4 flex justify-between items-center font-bold text-xs">
                        <span className="tracking-wider uppercase font-black">GRAND TOTAL</span>
                        <span className="text-sm font-mono font-extrabold tracking-wide">
                          ₹ {Number(quote.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TERMS & SIGNATURE FOOTER */}
              {quote.terms && (
                <div className="pt-6 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Terms &amp; Conditions
                  </span>
                  <div className="text-xs text-slate-500 whitespace-pre-line leading-relaxed bg-[#f8fafc] p-4 rounded-xl border border-slate-100">
                    {quote.terms}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TEMPLATE 2: EXECUTIVE CORPORATE PROPOSAL & LETTERHEAD     */}
          {/* ======================================================== */}
          {activeTemplate === 'tpl2' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Corporate Letterhead Banner */}
              <div className="p-6 sm:p-8 rounded-2xl bg-linear-to-r from-[#003884] via-[#084b9e] to-[#002860] text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-lg bg-white text-[#003884] font-black flex items-center justify-center text-sm shadow-xs">
                      D
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      DigiInk Solutions
                    </h2>
                  </div>
                  <p className="text-xs text-blue-100 max-w-md font-normal leading-relaxed">
                    318 3rd and 4th, Metro Station New Aatish Market, Devi Nagar, Mansarovar, Jaipur, Rajasthan 302020
                  </p>
                  <p className="text-[11px] text-blue-200 mt-1">
                    GSTIN: <strong>08AGHPP4568R1ZD</strong> • Phone: +91 9024154995 • Web: www.digiinksolutions.com
                  </p>
                </div>

                <div className="sm:text-right bg-white/10 backdrop-blur p-4 rounded-xl border border-white/20 w-full sm:w-auto">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
                    PROJECT PROPOSAL
                  </span>
                  <div className="text-xl font-black font-mono mt-0.5">{quote.quote_number}</div>
                  <div className="text-xs text-blue-100 mt-1">
                    Date: <strong>{issueDateFormatted}</strong>
                  </div>
                  <div className="text-xs text-blue-100">
                    Valid Till: <strong>{validTillFormatted}</strong>
                  </div>
                </div>
              </div>

              {/* Two Column Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prepared For Box */}
                <div className="p-5 rounded-2xl bg-[#f8fafc] border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                    PROPOSAL PREPARED FOR
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{quote.client_name}</h3>
                  {quote.client_address && (
                    <p className="text-xs text-slate-600">{quote.client_address}</p>
                  )}
                  {quote.place_of_supply && (
                    <p className="text-xs text-slate-600">
                      <strong>Place of Supply:</strong> {quote.place_of_supply}
                    </p>
                  )}
                  {quote.client_gstin && (
                    <p className="text-xs text-slate-600">
                      <strong>Client GSTIN:</strong> {quote.client_gstin}
                    </p>
                  )}
                  {quote.client_phone && (
                    <p className="text-xs text-slate-600">
                      <strong>Phone:</strong> {quote.client_phone}
                    </p>
                  )}
                </div>

                {/* Proposal Overview Box */}
                <div className="p-5 rounded-2xl bg-[#f8fafc] border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                    PROPOSAL OVERVIEW
                  </span>
                  <h4 className="text-sm font-bold text-[#003884]">{quote.title}</h4>
                  <p className="text-xs text-slate-600">
                    <strong>Prepared By:</strong> {quote.prepared_by || 'DigiInk Solutions'}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Payment Method:</strong> {quote.payment_method || 'Bank Transfer / UPI'}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Payment Due Date:</strong> {quote.payment_due_date || 'Within 15 days of invoice'}
                  </p>
                </div>
              </div>

              {/* Scope & Deliverables Cards */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#003884] rounded-full inline-block"></span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Scope of Work &amp; Deliverables
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionsToRender.map((sec, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#003884] font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          {sec.title}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                        {sec.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Itemized Pricing Matrix */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#003884] rounded-full inline-block"></span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Costing &amp; GST Matrix
                  </h3>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0b1329] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Deliverable / Service</th>
                        <th className="py-3 px-4 text-center w-24">Qty</th>
                        <th className="py-3 px-4 text-right w-36">Rate (₹)</th>
                        <th className="py-3 px-4 text-right w-40">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quote.items && quote.items.length > 0 ? (
                        quote.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{it.name}</div>
                              {it.description && (
                                <div className="text-[11px] text-slate-500 mt-0.5">{it.description}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-medium">{it.qty}</td>
                            <td className="py-3 px-4 text-right font-mono">
                              ₹ {Number(it.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              ₹ {Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No items specified
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Box */}
                <div className="flex justify-end pt-2">
                  <div className="w-full sm:w-80 bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Taxable):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        ₹ {Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {Number(quote.discount_amount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span className="font-mono font-semibold">
                          - ₹ {Number(quote.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {!isGstExempt && (
                      <>
                        {isIgst ? (
                          <div className="flex justify-between text-slate-600">
                            <span>IGST ({gstRate}%):</span>
                            <span className="font-mono font-semibold text-slate-800">
                              + ₹ {Number(quote.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-slate-600">
                              <span>CGST ({(gstRate / 2).toFixed(1)}%):</span>
                              <span className="font-mono font-semibold text-slate-800">
                                + ₹ {(Number(quote.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>SGST ({(gstRate / 2).toFixed(1)}%):</span>
                              <span className="font-mono font-semibold text-slate-800">
                                + ₹ {(Number(quote.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-base text-[#003884] font-mono">
                        ₹ {Number(quote.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Formal Signatory Box */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Terms of Engagement
                  </span>
                  <div className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed bg-[#f8fafc] p-4 rounded-xl border border-slate-200">
                    {quote.terms || '1. Valid for 15 days.\n2. Payment: 50% advance, 50% on project delivery.\n3. Taxes applicable as per GST rules.'}
                  </div>
                </div>

                <div className="flex flex-col justify-end items-end text-right space-y-1">
                  <div className="w-48 h-16 border-b border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs italic">
                    Authorized Signatory
                  </div>
                  <div className="text-xs font-bold text-slate-900 pt-1">DigiInk Solutions</div>
                  <div className="text-[11px] text-slate-500">Official Executive Approval</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ViewQuotationPage;
