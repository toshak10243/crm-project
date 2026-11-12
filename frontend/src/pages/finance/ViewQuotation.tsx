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
  created_at: string;
}

// Number to Words in Indian English (e.g. INR Twenty Five Thousand Only)
function numberToWordsINR(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero';
  
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  };

  const integerPart = Math.floor(num);
  let str = '';

  const crores = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;
  if (crores > 0) {
    str += (crores > 99 ? inWords(Math.floor(crores / 100)) + ' Hundred ' + inWords(crores % 100) : inWords(crores)) + ' Crore ';
  }

  const lakhs = Math.floor(rem / 100000);
  rem = rem % 100000;
  if (lakhs > 0) {
    str += inWords(lakhs) + ' Lakh ';
  }

  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;
  if (thousands > 0) {
    str += inWords(thousands) + ' Thousand ';
  }

  const hundreds = Math.floor(rem / 100);
  rem = rem % 100;
  if (hundreds > 0) {
    str += inWords(hundreds) + ' Hundred ';
  }

  if (rem > 0) {
    str += inWords(rem) + ' ';
  }

  return str.trim();
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

  // 1. Fetch Quotation Data
  const { data: quote, isLoading, isError } = useQuery<Quotation>({
    queryKey: ['quotation-detail', id],
    queryFn: async () => {
      const res = await api.get(`/finance/quotations/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  // 2. Fetch Company Settings Data
  const { data: settingsData } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const company = settingsData?.aboutCompany || {};

  // Company Details with exact fallbacks from official DigiInk Solutions PDF
  const companyName = company.companyName || company.brandName || 'Digiink Solutions LLP';
  const addressLine1 = company.addressLine1 || '318 3rd and 4th, Metro Station New Aatish Market,';
  const addressLine2 = company.addressLine2 || 'N-317, Mansarovar, Jaipur, Rajasthan 302020';
  const gstin = company.gstin || '08AAVFD6708K1ZS';
  const pan = company.pan || 'AAVFD6708K';
  const email = company.email || company.supportEmail || 'digiinksolutions2505@gmail.com';
  const phone = company.phone || '8740011262';
  const bankName = company.bankName || 'IDFC FIRST';
  const accountHolderName = company.accountHolderName || 'Digiink Solutions LLP';
  const accountNumber = company.accountNumber || '69024154995';
  const ifscCode = company.ifscCode || 'IDFB0042128';
  const accountType = 'Current';
  const logoUrl = company.logoUrl || '/logo.png';

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
          <p className="text-xs text-slate-500 mt-1">Retrieving official specifications and commercials</p>
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

  // Format Dates matching PDF style (e.g. Oct 28, 2026)
  const quotationDate = new Date(quote.quotation_date || quote.created_at);
  const formattedQuoteDate = quotationDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedFooterDate = quotationDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const validUntilDate = quote.valid_until ? new Date(quote.valid_until) : null;
  const formattedValidUntil = validUntilDate
    ? validUntilDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Open';

  // Extract Scope Sections & deliverables
  const sectionsToRender: ScopeSection[] = (quote.sections && quote.sections.length > 0)
    ? quote.sections
    : (quote.items && quote.items.length > 0)
    ? quote.items.map((it) => ({
        title: it.name,
        content: it.description || 'Full scope implementation, setup, testing and deployment.',
        goal: 'Convert visitors into Direct Booking',
      }))
    : [
        {
          title: quote.title || 'Digital Solution Implementation',
          content: '1. Requirement gathering & architecture\n2. Design, UI/UX & Responsive Development\n3. Integration, Quality Assurance & Deployment\n4. Onboarding, Training & Technical Support',
          goal: 'Convert visitors into Direct Booking',
        },
      ];

  const amountInWords = `INR ${numberToWordsINR(quote.total_amount)} Only`;
  const paymentMethod = quote.payment_method || 'Bank transfer (NEFT / RTGS / IMPS) / UPI';
  const notesText = quote.notes || 'Thank you for choosing DigiInk Solutions for your marketing needs. We look forward to working with you.';

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased">
      {/* ======================================================== */}
      {/* PRINT STYLES (EXACT PIXEL REPLICA OF USER'S PDFS)        */}
      {/* ======================================================== */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          body {
            background-color: white !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {/* ======================================================== */}
      {/* TOP NAVBAR (SCREENSHOT HEADER)                           */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs no-print">
        {/* Left: Branding & Logo */}
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain rounded-xl border border-slate-100 shadow-2xs bg-white p-0.5"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
          />
          <div>
            <div className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{companyName}</span>
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
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 print-container">
        {/* Outer White Card Container */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:rounded-none print:p-0">
          
          {/* ACTION BUTTON CLUSTER (TOP OF CARD) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100 no-print">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                DOCUMENT REFERENCE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                Quotation #{quote.quote_number}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* PDF Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5b4bc4] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Print or Save PDF"
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

              {/* Copy Share Link */}
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

              {/* Back to List */}
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

          {/* ========================================================================= */}
          {/* TEMPLATE 1: EXACT 1:1 REPLICA OF Prince_Modi_DIGI-Q-2026-0055.pdf         */}
          {/* ========================================================================= */}
          {activeTemplate === 'tpl1' && (
            <div className="space-y-6 text-[11px] text-slate-800 leading-relaxed font-sans">
              
              {/* TOP HEADER: LOGO (LEFT) & "Quotation" TITLE (RIGHT) */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    Quotation
                  </h1>
                </div>
              </div>

              {/* 3-COLUMN METADATA GRID (QUOTATION NO / QUOTATION FROM / QUOTATION FOR) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-4 border-b border-slate-200 text-xs">
                
                {/* Column 1: Document Details (Left 4 cols) */}
                <div className="md:col-span-4 space-y-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Quotation No</span>
                    <strong className="font-mono text-xs text-slate-900">{quote.quote_number}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Quotation Date</span>
                    <span className="text-slate-800">{formattedQuoteDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Valid Till Date</span>
                    <span className="text-slate-800">{formattedValidUntil}</span>
                  </div>
                  <div className="pt-1 text-slate-700">
                    <div>Country of Supply: <strong>India</strong></div>
                    <div>Place of Supply: <strong>{quote.place_of_supply || 'Rajasthan'}</strong></div>
                  </div>
                </div>

                {/* Column 2: Quotation From (Middle 5 cols) */}
                <div className="md:col-span-5 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Quotation From
                  </div>
                  <div className="font-bold text-slate-900 text-xs">{companyName}</div>
                  <p className="text-slate-600 leading-tight">
                    {addressLine1}
                    <br />
                    {addressLine2}
                  </p>
                  <div className="pt-1 space-y-0.5 text-slate-700">
                    <div>GSTIN: &nbsp;<strong className="font-mono font-medium">{gstin}</strong></div>
                    <div>PAN: &nbsp;<strong className="font-mono font-medium">{pan}</strong></div>
                    <div>Email: &nbsp;<span className="text-slate-800">{email}</span></div>
                    <div>Phone: &nbsp;<span className="text-slate-800">{phone}</span></div>
                  </div>
                </div>

                {/* Column 3: Quotation For (Right 3 cols) */}
                <div className="md:col-span-3 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Quotation For
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{quote.client_name}</div>
                  {quote.client_address && (
                    <p className="text-slate-600 leading-tight">{quote.client_address}</p>
                  )}
                  {quote.client_gstin && (
                    <div className="text-slate-700">GSTIN: &nbsp;<strong className="font-mono">{quote.client_gstin}</strong></div>
                  )}
                  {quote.client_phone && (
                    <div className="text-slate-700">Phone: &nbsp;{quote.client_phone}</div>
                  )}
                  {quote.client_email && (
                    <div className="text-slate-700">Email: &nbsp;{quote.client_email}</div>
                  )}
                </div>
              </div>

              {/* LINE ITEMS / SCOPE TABLE (WITH SCOPE LIST EMBEDDED INSIDE ITEM COLUMN) */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-2 text-center w-20">HSN/SAC</th>
                      <th className="py-2.5 px-2 text-center w-20">GST Rate</th>
                      <th className="py-2.5 px-2 text-center w-16">Quantity</th>
                      <th className="py-2.5 px-3 text-right w-24">Rate</th>
                      <th className="py-2.5 px-3 text-right w-24">Amount</th>
                      <th className="py-2.5 px-3 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sectionsToRender.map((sec, idx) => {
                      // Corresponding pricing row if available
                      const itemMatch = quote.items && quote.items[idx];
                      const rate = itemMatch ? Number(itemMatch.rate) : Number(quote.subtotal || 25000) / (sectionsToRender.length || 1);
                      const qty = itemMatch ? Number(itemMatch.qty || 1) : 1;
                      const lineAmount = rate * qty;

                      return (
                        <tr key={idx} className="align-top hover:bg-slate-50/50">
                          {/* Column 1: Item Title + Strategic Goal + Numbered Deliverables */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-xs">
                              {idx + 1}. &nbsp;{sec.title}
                            </div>
                            {sec.goal && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5 mb-1.5">
                                {sec.goal}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-600 space-y-0.5 pl-2 leading-relaxed">
                              {sec.content.split('\n').filter((l) => l.trim()).map((line, lIdx) => (
                                <div key={lIdx}>{line}</div>
                              ))}
                            </div>
                          </td>

                          {/* Column 2: HSN/SAC */}
                          <td className="py-3 px-2 text-center font-mono text-slate-400">
                            {itemMatch?.hsn || '—'}
                          </td>

                          {/* Column 3: GST Rate */}
                          <td className="py-3 px-2 text-center font-mono text-slate-500">
                            {quote.gst_type === 'none' ? '0%' : `${quote.gst_rate || 18}%`}
                          </td>

                          {/* Column 4: Quantity */}
                          <td className="py-3 px-2 text-center font-mono font-medium">
                            {qty}
                          </td>

                          {/* Column 5: Rate */}
                          <td className="py-3 px-3 text-right font-mono">
                            ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Column 6: Amount */}
                          <td className="py-3 px-3 text-right font-mono">
                            ₹{lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Column 7: Total */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* AMOUNTS & TOTAL SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-3 border-b border-slate-200 items-start text-xs">
                {/* Left: Amount in words */}
                <div className="sm:col-span-7 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    AMOUNT CHARGEABLE (IN WORDS)
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {amountInWords}
                  </div>
                  <div className="text-slate-500 text-[11px] pt-1">
                    Company's PAN: <strong>{pan}</strong>
                  </div>
                </div>

                {/* Right: Amount & Total */}
                <div className="sm:col-span-5 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Amount</span>
                    <span className="font-mono font-semibold">
                      ₹{Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-300 text-sm border-b-2 border-slate-900 pb-1">
                    <span>Total (INR)</span>
                    <span className="font-mono">
                      ₹{Number(quote.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* TERMS & CONDITIONS AND BANK DETAILS (2 COLUMNS) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 text-xs">
                {/* Left: Terms and Conditions */}
                <div className="md:col-span-7 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Terms and Conditions
                  </h4>
                  <div className="space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <div>1. Payment Terms: {paymentMethod}</div>
                    <div>2. Validity: This quotation is valid for until {formattedValidUntil}.</div>
                    <div>3. Implementation Timeline: Estimated setup within 14 working days from advance payment.</div>
                    <div>4. GST as applicable is included in the Grand Total above.</div>
                  </div>
                  <p className="text-[11px] text-slate-700 pt-1 font-medium leading-relaxed">
                    {notesText}
                  </p>
                </div>

                {/* Right: Bank Details */}
                <div className="md:col-span-5 space-y-2 bg-[#f8fafc] p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Bank Details
                  </h4>
                  <div className="space-y-1 text-slate-700 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Name:</span>
                      <strong className="text-right">{accountHolderName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Number:</span>
                      <strong className="font-mono text-right">{accountNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IFSC:</span>
                      <strong className="font-mono text-right">{ifscCode}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Type:</span>
                      <span className="text-right">{accountType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank:</span>
                      <strong className="text-right">{bankName}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-2">
                <div>
                  For any enquiry, reach out via email at <strong>{email}</strong>, call on <strong>{phone}</strong>
                </div>
                <div className="border-t border-slate-100 pt-2 flex flex-wrap justify-between items-center text-slate-400">
                  <span>Page 1 of 1</span>
                  <span>Quotation No: <strong>{quote.quote_number}</strong></span>
                  <span>Quotation Date: <strong>{formattedFooterDate}</strong></span>
                  <span>Quotation For: <strong>{quote.client_name}</strong></span>
                </div>
                <div className="text-slate-400 italic">
                  This is a system generated document, no signature is required.
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE 2: EXACT 1:1 REPLICA OF Prince_Modi_DIGI-Q-2026-0055 (1).pdf     */}
          {/* ========================================================================= */}
          {activeTemplate === 'tpl2' && (
            <div className="space-y-6 text-[11px] text-slate-800 leading-relaxed font-sans">
              
              {/* TOP HEADER: LOGO (LEFT) & "QUOTATION" + SUBTITLE (RIGHT) */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    QUOTATION
                  </h1>
                  <div className="text-xs text-[#2563eb] font-semibold mt-0.5">
                    Digiink Business Proposal &amp; Commercials
                  </div>
                </div>
              </div>

              {/* COMPANY DETAILS (LEFT) & QUOTATION PARTICULARS (RIGHT) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4 border-b border-slate-200 text-xs">
                {/* Left: Company Particulars */}
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">
                    {companyName}
                  </div>
                  <p className="text-slate-600 leading-tight">
                    {addressLine1}
                    <br />
                    {addressLine2}
                  </p>
                  <div className="pt-1 space-y-0.5 text-slate-700">
                    <div>GSTIN: &nbsp;<strong className="font-mono">{gstin}</strong></div>
                    <div>PAN: &nbsp;<strong className="font-mono">{pan}</strong></div>
                    <div>Email: &nbsp;<span className="text-slate-800">{email}</span></div>
                    <div>Phone: &nbsp;<span className="text-slate-800">{phone}</span></div>
                  </div>
                </div>

                {/* Right: Quotation Details Table */}
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-100 py-0.5">
                    <span className="font-sans text-slate-500 font-medium">Quotation No.</span>
                    <strong className="text-slate-900">: {quote.quote_number}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-0.5">
                    <span className="font-sans text-slate-500 font-medium">Quotation Date</span>
                    <span className="font-sans text-slate-800">: {formattedQuoteDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-0.5">
                    <span className="font-sans text-slate-500 font-medium">Valid Till</span>
                    <span className="font-sans text-slate-800">: {formattedValidUntil}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-0.5">
                    <span className="font-sans text-slate-500 font-medium">Country of Supply</span>
                    <span className="font-sans text-slate-800">: India</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="font-sans text-slate-500 font-medium">Place of Supply</span>
                    <span className="font-sans text-slate-800">: {quote.place_of_supply || 'Rajasthan'}</span>
                  </div>
                </div>
              </div>

              {/* CLIENT DETAILS BANNER */}
              <div className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50 p-1.5 px-3 rounded-lg border border-slate-100">
                  QUOTATION FOR (CLIENT DETAILS)
                </div>
                <div className="text-sm font-bold text-slate-900 px-3 pt-1">
                  {quote.client_name}
                </div>
                {quote.client_address && (
                  <div className="text-xs text-slate-600 px-3">{quote.client_address}</div>
                )}
              </div>

              {/* COMMERCIALS TABLE (COMPACT SERVICE / ITEM TABLE) */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#2563eb] text-white font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-4">Service / Item Description</th>
                      <th className="py-2.5 px-3 text-center w-28">HSN/SAC</th>
                      <th className="py-2.5 px-4 text-right w-36">Rate (₹)</th>
                      <th className="py-2.5 px-4 text-right w-36">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quote.items && quote.items.length > 0 ? (
                      quote.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {it.name}
                            {it.description && (
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">{it.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">{it.hsn || '998314'}</td>
                          <td className="py-3 px-4 text-right font-mono font-medium">
                            {Number(it.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {Number(it.rate * (it.qty || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 px-3 text-center font-mono text-slate-400">1</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{quote.title || 'Digital Solution Development'}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">998314</td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {Number(quote.subtotal || 25000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {Number(quote.subtotal || 25000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* AMOUNTS & TOTAL SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-2 border-b border-slate-200 items-start text-xs">
                {/* Left: Words */}
                <div className="sm:col-span-7 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    AMOUNT CHARGEABLE (IN WORDS):
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {amountInWords}
                  </div>
                  <div className="text-slate-500 text-[11px] pt-1">
                    Company's PAN: <strong>{pan}</strong>
                  </div>
                </div>

                {/* Right: Subtotal, Taxable, Grand Total */}
                <div className="sm:col-span-5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      ₹{Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount</span>
                    <span className="font-mono">
                      ₹{Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-300 text-sm">
                    <span>Grand Total (INR)</span>
                    <span className="font-mono">
                      ₹{Number(quote.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* SCOPE OF WORK & PROJECT DELIVERABLES (DEDICATED SECTION BELOW COMMERCIALS) */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
                  SCOPE OF WORK &amp; PROJECT DELIVERABLES
                </h3>

                <div className="space-y-4">
                  {sectionsToRender.map((sec, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="font-bold text-xs text-slate-900 uppercase">
                        SECTION {idx + 1} &nbsp;{sec.title}
                      </div>
                      {sec.goal && (
                        <div className="text-[11px] text-[#2563eb] font-semibold">
                          Objective: {sec.goal}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-700 space-y-1 pl-2">
                        {sec.content.split('\n').filter((l) => l.trim()).map((line, lIdx) => (
                          <div key={lIdx} className="flex items-start gap-2">
                            <span className="text-slate-400 font-bold">•</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TERMS & CONDITIONS AND BANK DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-slate-200 text-xs">
                {/* Left: Terms & Conditions */}
                <div className="md:col-span-7 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    TERMS &amp; CONDITIONS
                  </h4>
                  <div className="space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <div>1. Payment Terms: {paymentMethod}</div>
                    <div>2. Validity: This quotation is valid until {formattedValidUntil}</div>
                    <div>3. Implementation Timeline: Estimated setup within 14 working days from advance payment.</div>
                    <div>4. GST as applicable is included in the Grand Total above.</div>
                  </div>
                  <p className="text-[11px] text-slate-700 pt-1 font-medium leading-relaxed">
                    {notesText}
                  </p>
                </div>

                {/* Right: Bank Details */}
                <div className="md:col-span-5 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    BANK DETAILS
                  </h4>
                  <div className="space-y-1 text-slate-700 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Name:</span>
                      <strong className="text-right">{accountHolderName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Number:</span>
                      <strong className="font-mono text-right">{accountNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IFSC:</span>
                      <strong className="font-mono text-right">{ifscCode}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Type:</span>
                      <span className="text-right">{accountType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank:</span>
                      <strong className="text-right">{bankName}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-2">
                <div>
                  For any enquiry, reach out via email at <strong>{email}</strong>, call on <strong>{phone}</strong>
                </div>
                <div className="border-t border-slate-100 pt-2 flex flex-wrap justify-between items-center text-slate-400">
                  <span>Page 1 of 1</span>
                  <span>Quotation No: <strong>{quote.quote_number}</strong></span>
                  <span>Quotation Date: <strong>{formattedFooterDate}</strong></span>
                  <span>Quotation For: <strong>{quote.client_name}</strong></span>
                </div>
                <div className="text-slate-400 italic">
                  This is a system generated document, no signature is required.
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
