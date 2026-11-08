import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface LeadStatusItem {
  id: string;
  name: string;
  color: string;
  sort_order?: number;
}

interface TemplateItem {
  id: string;
  type: 'whatsapp' | 'email';
  name: string;
  subject?: string;
  body: string;
  created_at?: string;
}

interface LeadSourceItem {
  id: string;
  name: string;
  assigned_manager_id?: string;
  assigned_manager_name?: string;
  sort_order?: number;
}

interface ManagerItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AboutCompanyData {
  companyName: string;
  brandName: string;
  logoUrl: string;
  tagline: string;
  gstin: string;
  pan: string;
  cin: string;
  msmeUdyam: string;
  email: string;
  supportEmail: string;
  phone: string;
  alternatePhone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active section for smooth scroll & quick jumps
  const [activeTab, setActiveTab] = useState<'about' | 'statuses' | 'whatsapp' | 'email' | 'leadFrom'>('about');

  // Flash alert
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlert({ text, type });
    setTimeout(() => setAlert(null), 3500);
  };

  // Modals state
  const [statusModal, setStatusModal] = useState<{ mode: 'add' | 'edit'; item?: LeadStatusItem } | null>(null);
  const [statusName, setStatusName] = useState('');
  const [statusColor, setStatusColor] = useState('#2563eb');

  const [waModal, setWaModal] = useState<{ mode: 'add' | 'edit'; item?: TemplateItem } | null>(null);
  const [waName, setWaName] = useState('');
  const [waBody, setWaBody] = useState('');

  const [emailModal, setEmailModal] = useState<{ mode: 'add' | 'edit'; item?: TemplateItem } | null>(null);
  const [emailName, setEmailName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [sourceModal, setSourceModal] = useState<{ mode: 'add' | 'edit'; item?: LeadSourceItem } | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceManagerId, setSourceManagerId] = useState('');

  // Rows per page selectors
  const [statusRows, setStatusRows] = useState(10);
  const [waRows, setWaRows] = useState(10);
  const [emailRows, setEmailRows] = useState(10);
  const [sourceRows, setSourceRows] = useState(10);

  // 1. Fetch All Settings
  const { data: settingsData } = useQuery({
    queryKey: ['settings-all'],
    queryFn: async () => {
      const res = await api.get('/settings/all');
      return res.data?.data;
    },
  });

  const statuses: LeadStatusItem[] = settingsData?.statuses || [];
  const whatsappTemplates: TemplateItem[] = settingsData?.whatsappTemplates || [];
  const emailTemplates: TemplateItem[] = settingsData?.emailTemplates || [];
  const leadSources: LeadSourceItem[] = settingsData?.leadSources || [];
  const autoAssignLeads: boolean = !!settingsData?.autoAssignLeads;
  const managers: ManagerItem[] = settingsData?.managers || [];
  const aboutCompanyInitial: AboutCompanyData = settingsData?.aboutCompany || {
    companyName: '',
    brandName: '',
    logoUrl: '',
    tagline: '',
    gstin: '',
    pan: '',
    cin: '',
    msmeUdyam: '',
    email: '',
    supportEmail: '',
    phone: '',
    alternatePhone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  };

  const [companyForm, setCompanyForm] = useState<AboutCompanyData>(aboutCompanyInitial);

  // Sync state when data loads
  React.useEffect(() => {
    if (settingsData?.aboutCompany) {
      setCompanyForm(settingsData.aboutCompany);
    }
  }, [settingsData?.aboutCompany]);

  // Save About Company Mutation
  const saveCompanyMutation = useMutation({
    mutationFn: async (data: AboutCompanyData) => {
      const res = await api.patch('/settings/about-company', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      showAlert('Company details updated successfully');
    },
    onError: (err: any) => {
      showAlert(err?.response?.data?.message || err.message, 'error');
    },
  });

  // Handle Logo Upload (Base64 data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert('Logo file size must be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Auto Assign Mutation
  const toggleAutoAssignMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await api.patch('/settings/toggle-auto-assign', { enabled });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      showAlert(`Auto-assign leads ${enabled ? 'enabled' : 'disabled'}`);
    },
  });

  // --- STATUS MUTATIONS ---
  const saveStatusMutation = useMutation({
    mutationFn: async () => {
      if (!statusName.trim()) throw new Error('Status title is required');
      if (statusModal?.mode === 'add') {
        return await api.post('/settings/lead-statuses', { name: statusName, color: statusColor });
      } else if (statusModal?.item) {
        return await api.patch(`/settings/lead-statuses/${statusModal.item.id}`, { name: statusName, color: statusColor });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['lead-form-options'] });
      setStatusModal(null);
      showAlert(`Lead Status ${statusModal?.mode === 'add' ? 'created' : 'updated'} successfully`);
    },
    onError: (err: any) => showAlert(err?.response?.data?.message || err.message, 'error'),
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/settings/lead-statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['lead-form-options'] });
      showAlert('Lead Status deleted successfully');
    },
  });

  // --- WHATSAPP TEMPLATE MUTATIONS ---
  const saveWaMutation = useMutation({
    mutationFn: async () => {
      if (!waName.trim() || !waBody.trim()) throw new Error('Title and Message are required');
      if (waModal?.mode === 'add') {
        return await api.post('/settings/templates', { type: 'whatsapp', name: waName, body: waBody });
      } else if (waModal?.item) {
        return await api.patch(`/settings/templates/${waModal.item.id}`, { name: waName, body: waBody });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      setWaModal(null);
      showAlert(`WhatsApp template ${waModal?.mode === 'add' ? 'created' : 'updated'} successfully`);
    },
    onError: (err: any) => showAlert(err?.response?.data?.message || err.message, 'error'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/settings/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      showAlert('Template deleted successfully');
    },
  });

  // --- EMAIL TEMPLATE MUTATIONS ---
  const saveEmailMutation = useMutation({
    mutationFn: async () => {
      if (!emailName.trim() || !emailBody.trim()) throw new Error('Title and Message are required');
      if (emailModal?.mode === 'add') {
        return await api.post('/settings/templates', { type: 'email', name: emailName, subject: emailSubject, body: emailBody });
      } else if (emailModal?.item) {
        return await api.patch(`/settings/templates/${emailModal.item.id}`, { name: emailName, subject: emailSubject, body: emailBody });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      setEmailModal(null);
      showAlert(`Email template ${emailModal?.mode === 'add' ? 'created' : 'updated'} successfully`);
    },
    onError: (err: any) => showAlert(err?.response?.data?.message || err.message, 'error'),
  });

  // --- LEAD SOURCE MUTATIONS ---
  const saveSourceMutation = useMutation({
    mutationFn: async () => {
      if (!sourceName.trim()) throw new Error('Lead source title is required');
      if (sourceModal?.mode === 'add') {
        return await api.post('/settings/lead-sources', { name: sourceName, assigned_manager_id: sourceManagerId || undefined });
      } else if (sourceModal?.item) {
        return await api.patch(`/settings/lead-sources/${sourceModal.item.id}`, { name: sourceName, assigned_manager_id: sourceManagerId || null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['lead-form-options'] });
      setSourceModal(null);
      showAlert(`Lead From ${sourceModal?.mode === 'add' ? 'created' : 'updated'} successfully`);
    },
    onError: (err: any) => showAlert(err?.response?.data?.message || err.message, 'error'),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/settings/lead-sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['lead-form-options'] });
      showAlert('Lead From deleted successfully');
    },
  });

  // Smooth scroll handler
  const scrollTo = (id: string, tab: 'about' | 'statuses' | 'whatsapp' | 'email' | 'leadFrom') => {
    setActiveTab(tab);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <CrmLayout>
      <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-20">
        {/* Flash Alert */}
        {alert && (
          <div className="fixed top-5 right-5 z-[99999]">
            <div
              className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold transition-all ${
                alert.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              <span>{alert.text}</span>
            </div>
          </div>
        )}

        <div className="w-full px-6 py-4 space-y-8">
          {/* Top Quick Navigation Shortcuts Tabs */}
          <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-2xs flex flex-wrap items-center gap-2 sticky top-2 z-10">
            <button
              onClick={() => scrollTo('sec-about', 'about')}
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'about'
                  ? 'bg-[#003884] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>About Company</span>
            </button>
            <button
              onClick={() => scrollTo('sec-statuses', 'statuses')}
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'statuses'
                  ? 'bg-[#003884] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Lead Statuses ({statuses.length})
            </button>
            <button
              onClick={() => scrollTo('sec-whatsapp', 'whatsapp')}
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-[#003884] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              WhatsApp Templates ({whatsappTemplates.length})
            </button>
            <button
              onClick={() => scrollTo('sec-email', 'email')}
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-[#003884] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Email Templates ({emailTemplates.length})
            </button>
            <button
              onClick={() => scrollTo('sec-leadfrom', 'leadFrom')}
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'leadFrom'
                  ? 'bg-[#003884] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Lead From ({leadSources.length})
            </button>
          </div>

          {/* ======================================================== */}
          {/* SECTION 0: ABOUT COMPANY & COMPLETE BUSINESS PROFILE       */}
          {/* ======================================================== */}
          <section id="sec-about" className="scroll-mt-20">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {/* Clean White Card Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">About Company</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manage business profile, logo, GSTIN, PAN, contact, address & bank details</p>
                </div>
                <button
                  type="button"
                  onClick={() => saveCompanyMutation.mutate(companyForm)}
                  disabled={saveCompanyMutation.isPending}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-[#003884] hover:bg-blue-900 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{saveCompanyMutation.isPending ? 'Saving...' : 'Save Company Details'}</span>
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6">
                {/* 1. Branding & Logo */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                    1. Identity & Branding
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Logo Box */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-center">
                      {companyForm.logoUrl ? (
                        <div className="w-full flex flex-col items-center">
                          <img
                            src={companyForm.logoUrl}
                            alt="Company Logo"
                            className="max-h-24 object-contain rounded border border-slate-200 bg-white p-2"
                          />
                          <div className="mt-2.5 flex gap-2">
                            <label className="text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded cursor-pointer border border-blue-100">
                              Change
                              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setCompanyForm((prev) => ({ ...prev, logoUrl: '' }))}
                              className="text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-2">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-xs font-medium text-slate-700">Company Logo</span>
                          <span className="text-[11px] text-slate-400">PNG, JPG (Max 2MB)</span>
                          <label className="mt-2.5 px-3 py-1 rounded bg-[#003884] text-white text-xs font-medium hover:bg-blue-900 cursor-pointer transition-colors">
                            Browse
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Basic Info Fields */}
                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Company Legal Name *</label>
                        <input
                          type="text"
                          value={companyForm.companyName}
                          onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                          placeholder="e.g. Apex Global Technologies Pvt Ltd"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Brand / Trade Name</label>
                        <input
                          type="text"
                          value={companyForm.brandName}
                          onChange={(e) => setCompanyForm({ ...companyForm, brandName: e.target.value })}
                          placeholder="e.g. Apex CRM"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Tagline / Motto</label>
                        <input
                          type="text"
                          value={companyForm.tagline}
                          onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                          placeholder="e.g. Empowering Businesses with Next-Gen CRM Solutions"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Official Website</label>
                        <input
                          type="text"
                          value={companyForm.website}
                          onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                          placeholder="https://yourcompany.com"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Primary Email *</label>
                        <input
                          type="email"
                          value={companyForm.email}
                          onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                          placeholder="contact@company.com"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Legal, Tax & Registration Details */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                    2. Legal & Tax Registrations
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={companyForm.gstin}
                        onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                        placeholder="e.g. 08AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono uppercase focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={companyForm.pan}
                        onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value.toUpperCase() })}
                        placeholder="e.g. ABCDE1234F"
                        maxLength={10}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono uppercase focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CIN (Corporate ID)</label>
                      <input
                        type="text"
                        value={companyForm.cin}
                        onChange={(e) => setCompanyForm({ ...companyForm, cin: e.target.value.toUpperCase() })}
                        placeholder="e.g. U72900RJ2026PTC012345"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono uppercase focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">MSME / Udyam Reg. No.</label>
                      <input
                        type="text"
                        value={companyForm.msmeUdyam}
                        onChange={(e) => setCompanyForm({ ...companyForm, msmeUdyam: e.target.value.toUpperCase() })}
                        placeholder="UDYAM-RJ-XX-XXXXXXX"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono uppercase focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Communication & Contact */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                    3. Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Primary Phone *</label>
                      <input
                        type="text"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Alternate Phone</label>
                      <input
                        type="text"
                        value={companyForm.alternatePhone}
                        onChange={(e) => setCompanyForm({ ...companyForm, alternatePhone: e.target.value })}
                        placeholder="+91 80000 12345"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Support Email</label>
                      <input
                        type="email"
                        value={companyForm.supportEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, supportEmail: e.target.value })}
                        placeholder="support@company.com"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Registered Physical Address */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                    4. Registered Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={companyForm.addressLine1}
                        onChange={(e) => setCompanyForm({ ...companyForm, addressLine1: e.target.value })}
                        placeholder="Plot / Office No, Building Name, Street"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={companyForm.addressLine2}
                        onChange={(e) => setCompanyForm({ ...companyForm, addressLine2: e.target.value })}
                        placeholder="Area, Landmark or Tech Zone"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                        placeholder="e.g. Jaipur"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={companyForm.state}
                        onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                        placeholder="e.g. Rajasthan"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">PIN / Postal Code</label>
                      <input
                        type="text"
                        value={companyForm.pincode}
                        onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                        placeholder="e.g. 302017"
                        maxLength={10}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={companyForm.country}
                        onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                        placeholder="India"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Banking & Settlement Info */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                    5. Bank & Invoicing Settlement
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={companyForm.bankName}
                        onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                        placeholder="e.g. HDFC Bank, ICICI Bank"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={companyForm.accountHolderName}
                        onChange={(e) => setCompanyForm({ ...companyForm, accountHolderName: e.target.value })}
                        placeholder="Company Account Name"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={companyForm.accountNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, accountNumber: e.target.value })}
                        placeholder="e.g. 50200012345678"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={companyForm.ifscCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. HDFC0001234"
                        maxLength={11}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono uppercase focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Company UPI ID / VPA</label>
                      <input
                        type="text"
                        value={companyForm.upiId}
                        onChange={(e) => setCompanyForm({ ...companyForm, upiId: e.target.value.toLowerCase() })}
                        placeholder="company@bank"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono focus:outline-none focus:border-[#003884]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Save Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => saveCompanyMutation.mutate(companyForm)}
                    disabled={saveCompanyMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-[#003884] hover:bg-blue-900 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{saveCompanyMutation.isPending ? 'Saving...' : 'Save Company Details'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* SECTION 1: LEAD STATUSES                                  */}
          {/* ======================================================== */}
          <section id="sec-statuses" className="scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Lead Statuses</h2>
                <p className="text-xs text-slate-500 mt-0.5">Customize sales pipeline status pills and colors</p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Rows:</span>
                  <select
                    value={statusRows}
                    onChange={(e) => setStatusRows(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setStatusName('');
                    setStatusColor('#2563eb');
                    setStatusModal({ mode: 'add' });
                  }}
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  + Add Lead Status
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">TITLE</th>
                      <th className="py-3 px-6 text-center">BACKGROUND COLOR</th>
                      <th className="py-3 px-6">CREATED BY</th>
                      <th className="py-3 px-6 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {statuses.slice(0, statusRows).map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">{st.name}</td>
                        <td className="py-3.5 px-6 text-center">
                          <span
                            className="inline-block w-5 h-5 rounded-full shadow-2xs border border-white"
                            style={{ backgroundColor: st.color || '#3b82f6' }}
                            title={st.color}
                          />
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 text-xs">CRM System</td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => {
                                setStatusName(st.name);
                                setStatusColor(st.color || '#2563eb');
                                setStatusModal({ mode: 'edit', item: st });
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete status "${st.name}"?`)) {
                                  deleteStatusMutation.mutate(st.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* SECTION 2: WHATSAPP TEMPLATES                             */}
          {/* ======================================================== */}
          <section id="sec-whatsapp" className="scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp Message Templates</h2>
                <p className="text-xs text-slate-500 mt-0.5">Quick message templates for one-click WhatsApp client followups</p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Rows:</span>
                  <select
                    value={waRows}
                    onChange={(e) => setWaRows(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setWaName('');
                    setWaBody('');
                    setWaModal({ mode: 'add' });
                  }}
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  + Add WhatsApp Message
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6 w-1/4">TITLE</th>
                      <th className="py-3 px-6 w-1/2">MESSAGE</th>
                      <th className="py-3 px-6">CREATED BY</th>
                      <th className="py-3 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {whatsappTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                          No WhatsApp templates added yet.
                        </td>
                      </tr>
                    ) : (
                      whatsappTemplates.slice(0, waRows).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-900 align-top">{t.name}</td>
                          <td className="py-3.5 px-6 align-top">
                            <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-lg text-slate-700 text-xs whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                              {t.body}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-slate-500 text-xs align-top">CRM System</td>
                          <td className="py-3.5 px-6 text-right align-top">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setWaName(t.name);
                                  setWaBody(t.body);
                                  setWaModal({ mode: 'edit', item: t });
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete WhatsApp template "${t.name}"?`)) {
                                    deleteTemplateMutation.mutate(t.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
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
          </section>

          {/* ======================================================== */}
          {/* SECTION 3: EMAIL TEMPLATES                                */}
          {/* ======================================================== */}
          <section id="sec-email" className="scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Email Templates</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pre-configured corporate email layouts with dynamic placeholders</p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Rows:</span>
                  <select
                    value={emailRows}
                    onChange={(e) => setEmailRows(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setEmailName('');
                    setEmailSubject('');
                    setEmailBody('');
                    setEmailModal({ mode: 'add' });
                  }}
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  + Add Email Template
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6 w-1/4">TITLE</th>
                      <th className="py-3 px-6 w-1/2">MESSAGE / SUBJECT</th>
                      <th className="py-3 px-6">CREATED BY</th>
                      <th className="py-3 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {emailTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                          No Email templates added yet.
                        </td>
                      </tr>
                    ) : (
                      emailTemplates.slice(0, emailRows).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-900 align-top">{t.name}</td>
                          <td className="py-3.5 px-6 align-top">
                            <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-lg text-slate-700 text-xs leading-relaxed max-h-36 overflow-y-auto">
                              {t.subject && (
                                <div className="font-bold text-slate-900 mb-1.5 pb-1 border-b border-blue-200/50">
                                  Subject: {t.subject}
                                </div>
                              )}
                              <div className="whitespace-pre-line">{t.body}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-slate-500 text-xs align-top">CRM System</td>
                          <td className="py-3.5 px-6 text-right align-top">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEmailName(t.name);
                                  setEmailSubject(t.subject || '');
                                  setEmailBody(t.body);
                                  setEmailModal({ mode: 'edit', item: t });
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete Email template "${t.name}"?`)) {
                                    deleteTemplateMutation.mutate(t.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
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
          </section>

          {/* ======================================================== */}
          {/* SECTION 4: AUTO ASSIGN LEADS TOGGLE CARD                  */}
          {/* ======================================================== */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Auto Assign Leads</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automatically distribute and assign incoming leads to managers</p>
            </div>
            <button
              type="button"
              onClick={() => toggleAutoAssignMutation.mutate(!autoAssignLeads)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoAssignLeads ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoAssignLeads ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ======================================================== */}
          {/* SECTION 5: LEAD FROM (LEAD SOURCES)                       */}
          {/* ======================================================== */}
          <section id="sec-leadfrom" className="scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Lead From</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage source channels and optional manager auto-assignments</p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Rows:</span>
                  <select
                    value={sourceRows}
                    onChange={(e) => setSourceRows(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setSourceName('');
                    setSourceManagerId('');
                    setSourceModal({ mode: 'add' });
                  }}
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  + Add Lead From
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">TITLE</th>
                      <th className="py-3 px-6">ASSIGNED MANAGER</th>
                      <th className="py-3 px-6">CREATED BY</th>
                      <th className="py-3 px-6 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {leadSources.slice(0, sourceRows).map((src) => (
                      <tr key={src.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {src.name}
                          {src.name === 'Toshak Sharma' && (
                            <span className="ml-2 px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 font-bold rounded">
                              Dynamic
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 text-xs">
                          {src.assigned_manager_name || '-'}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 text-xs">CRM System</td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSourceName(src.name);
                                setSourceManagerId(src.assigned_manager_id || '');
                                setSourceModal({ mode: 'edit', item: src });
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete Lead From "${src.name}"?`)) {
                                  deleteSourceMutation.mutate(src.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* ======================================================== */}
        {/* MODAL 1: ADD / EDIT LEAD STATUS WITH COLOR WHEEL PICKER   */}
        {/* ======================================================== */}
        {statusModal &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-[#003884] px-6 py-4 flex items-center justify-between text-white">
                  <h3 className="text-base font-semibold">
                    {statusModal.mode === 'add' ? 'Add Lead Status' : 'Update Lead Status'}
                  </h3>
                  <button onClick={() => setStatusModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                    ✕
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveStatusMutation.mutate();
                  }}
                  className="p-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. INTERESTED, DEMO SCHEDULED"
                      value={statusName}
                      onChange={(e) => setStatusName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Background Color (Color Wheel Picker)
                    </label>
                    <div className="flex items-center gap-3">
                      {/* Native HTML5 Color Wheel Input */}
                      <input
                        type="color"
                        value={statusColor}
                        onChange={(e) => setStatusColor(e.target.value)}
                        className="w-12 h-10 p-0.5 rounded border border-slate-300 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={statusColor}
                        onChange={(e) => setStatusColor(e.target.value)}
                        className="w-32 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded uppercase"
                      />
                      <div
                        className="px-3 py-1 rounded text-xs font-bold text-white shadow-2xs"
                        style={{ backgroundColor: statusColor }}
                      >
                        Preview Pill
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStatusModal(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saveStatusMutation.isPending}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] rounded shadow-2xs"
                    >
                      {saveStatusMutation.isPending ? 'Saving...' : statusModal.mode === 'add' ? 'Add' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )}

        {/* ======================================================== */}
        {/* MODAL 2: ADD / EDIT WHATSAPP TEMPLATE                     */}
        {/* ======================================================== */}
        {waModal &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-[#003884] px-6 py-4 flex items-center justify-between text-white">
                  <h3 className="text-base font-semibold">
                    {waModal.mode === 'add' ? 'Add WhatsApp Message' : 'Update WhatsApp Message'}
                  </h3>
                  <button onClick={() => setWaModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                    ✕
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveWaMutation.mutate();
                  }}
                  className="p-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Welcome Message, Follow-up"
                      value={waName}
                      onChange={(e) => setWaName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message</label>
                    <textarea
                      rows={5}
                      placeholder="Enter WhatsApp template message..."
                      value={waBody}
                      onChange={(e) => setWaBody(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setWaModal(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saveWaMutation.isPending}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] rounded shadow-2xs"
                    >
                      {saveWaMutation.isPending ? 'Saving...' : waModal.mode === 'add' ? 'Add' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )}

        {/* ======================================================== */}
        {/* MODAL 3: ADD / EDIT EMAIL TEMPLATE                        */}
        {/* ======================================================== */}
        {emailModal &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-[#003884] px-6 py-4 flex items-center justify-between text-white">
                  <h3 className="text-base font-semibold">
                    {emailModal.mode === 'add' ? 'Add Email Template' : 'Update Email Template'}
                  </h3>
                  <button onClick={() => setEmailModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                    ✕
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEmailMutation.mutate();
                  }}
                  className="p-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Proposal Email, First Introduction"
                      value={emailName}
                      onChange={(e) => setEmailName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      placeholder="Enter Email Subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message Body</label>
                    <textarea
                      rows={5}
                      placeholder="Enter corporate email body..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEmailModal(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saveEmailMutation.isPending}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] rounded shadow-2xs"
                    >
                      {saveEmailMutation.isPending ? 'Saving...' : emailModal.mode === 'add' ? 'Add' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )}

        {/* ======================================================== */}
        {/* MODAL 4: ADD / EDIT LEAD FROM (LEAD SOURCE)               */}
        {/* ======================================================== */}
        {sourceModal &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-[#003884] px-6 py-4 flex items-center justify-between text-white">
                  <h3 className="text-base font-semibold">
                    {sourceModal.mode === 'add' ? 'Add Lead From' : 'Update Lead From'}
                  </h3>
                  <button onClick={() => setSourceModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                    ✕
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveSourceMutation.mutate();
                  }}
                  className="p-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Surat, Toshak Sharma, Walk In"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Assigned Manager (Optional)
                    </label>
                    <select
                      value={sourceManagerId}
                      onChange={(e) => setSourceManagerId(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    >
                      <option value="">-- None / Default --</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSourceModal(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saveSourceMutation.isPending}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] rounded shadow-2xs"
                    >
                      {saveSourceMutation.isPending ? 'Saving...' : sourceModal.mode === 'add' ? 'Add' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </CrmLayout>
  );
};

export default SettingsPage;
