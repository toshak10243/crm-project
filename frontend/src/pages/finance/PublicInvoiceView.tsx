import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

interface InvoiceData {
  id: string;
  invoice_number: string;
  public_token: string;
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

interface CompanyInfo {
  companyName?: string;
  brandName?: string;
  email?: string;
  phone?: string;
  website?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
}

export const PublicInvoiceView: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  // Fetch Public Invoice Details
  const { data, isLoading, isError } = useQuery<{
    invoice: InvoiceData;
    company: CompanyInfo;
  }>({
    queryKey: ['public-invoice', token],
    queryFn: async () => {
      const res = await api.get(`/finance/invoices/public/${token}`);
      return res.data?.data;
    },
    enabled: !!token,
    staleTime: 10 * 1000,
  });

  const inv = data?.invoice;
  const company = data?.company || {};

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-[#003884] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-800">Loading Invoice...</h3>
          <p className="text-xs text-slate-500 mt-1">Retrieving official invoice from DigiInk Solutions</p>
        </div>
      </div>
    );
  }

  if (isError || !inv) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Invoice Not Found</h2>
          <p className="text-xs text-slate-500 mt-2">
            This invoice link may be invalid or has expired. Please contact DigiInk Solutions at{' '}
            <strong className="text-slate-700">+91 9024154995</strong> or email{' '}
            <strong className="text-slate-700">hostingdigiink@gmail.com</strong>.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = inv.status === 'paid';
  const isPartial = inv.status === 'partial';
  const isOverdue = inv.status === 'overdue';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased py-6 px-3 sm:px-6 print:p-0 print:bg-white">
      {/* Floating Top Bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-4 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-[#003884] flex items-center justify-center font-black text-sm">
            D
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {company.companyName || 'DigiInk Solutions'}
            </div>
            <div className="text-[11px] text-slate-500">Official Tax Invoice Portal</div>
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
            Billing Help: +91 9024154995
          </a>
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
        {/* Header / Letterhead */}
        <div className="p-6 sm:p-8 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-blue-50/20">
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
              </div>
            </div>

            {/* Invoice Metadata */}
            <div className="sm:text-right w-full sm:w-auto bg-white sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-none border-slate-200">
              <div className="inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-900 text-white mb-2">
                Tax Invoice
              </div>
              <div className="text-lg font-extrabold text-slate-900 font-mono">
                {inv.invoice_number}
              </div>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <div>
                  Invoice Date:{' '}
                  <strong className="text-slate-800">
                    {new Date(inv.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                {inv.due_date && (
                  <div>
                    Due Date:{' '}
                    <strong className="text-slate-800">
                      {new Date(inv.due_date).toLocaleDateString('en-GB', {
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
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>PAID IN FULL</span>
                  </span>
                ) : isPartial ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span>PARTIALLY PAID</span>
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <span>PAYMENT OVERDUE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <span>PAYMENT PENDING</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="p-6 sm:p-8 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Billed To
            </span>
            <div className="mt-1 text-base font-bold text-slate-900">{inv.client_name}</div>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              {inv.client_phone && <div>Phone: {inv.client_phone}</div>}
              {inv.client_email && <div>Email: {inv.client_email}</div>}
              {inv.client_address && <div>Address: {inv.client_address}</div>}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Services Description
            </span>
            <div className="mt-1 text-sm font-bold text-slate-900">{inv.title}</div>
            {inv.notes && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{inv.notes}</p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-6 sm:p-8">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Item &amp; Description</th>
                  <th className="py-3 px-3 text-center">HSN/SAC</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {inv.items && inv.items.length > 0 ? (
                  inv.items.map((item, idx) => (
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
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {item.hsn || '-'}
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
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No line items specified
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bank Details & Totals */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6">
            {/* DigiInk Official Payment Details */}
            <div className="w-full sm:max-w-md bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#003884] block mb-2">
                Official Bank &amp; Payment Transfer Details
              </span>
              <div className="text-xs space-y-1 text-slate-700">
                <div>
                  <span className="text-slate-500">Bank Name:</span>{' '}
                  <strong className="text-slate-900">{company.bankName || 'HDFC Bank Ltd'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Account Name:</span>{' '}
                  <strong className="text-slate-900">{company.companyName || 'DigiInk Solutions'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Account Number:</span>{' '}
                  <strong className="font-mono text-slate-900">{company.accountNo || '50200085942315'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">IFSC Code:</span>{' '}
                  <strong className="font-mono text-slate-900">{company.ifscCode || 'HDFC0001864'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Branch:</span>{' '}
                  <span>{company.branchName || 'Mansarovar, Jaipur'}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 mt-2">
                  <span className="text-slate-500">Instant UPI Payment ID:</span>{' '}
                  <strong className="font-mono text-[#003884] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {company.upiId || 'digiink@hdfcbank'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₹{Number(inv.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {Number(inv.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono font-semibold">
                    -₹{Number(inv.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Total Tax (GST 18%):</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₹{Number(inv.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Invoice Total:</span>
                <span className="text-base text-slate-900 font-mono">
                  ₹{Number(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>Paid Amount:</span>
                <span className="font-mono">
                  ₹{Number(inv.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-black text-[#003884]">
                <span>Balance Due:</span>
                <span className="text-base font-mono">
                  ₹{Number(inv.due_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-[11px] text-slate-500">
          <div>This is an official computer-generated tax invoice issued by {company.companyName || 'DigiInk Solutions'}.</div>
          <div className="mt-0.5">
            GSTIN: {company.gstin || '08AGHPP4568R1ZD'} • Contact: {company.phone || '+91 9024154995'} • {company.email || 'hostingdigiink@gmail.com'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
