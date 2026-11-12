import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface RecipientLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  company?: string;
  status_name?: string;
  status_color?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
}

interface DigiMailCampaign {
  id: string;
  name: string;
  subject: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  open_rate_pct: number;
  status: string;
  created_at: string;
}

interface DigiMailLog {
  id: string;
  campaign_id?: string;
  campaign_name?: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone?: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  is_opened: boolean;
  opened_at?: string;
  open_count: number;
  sent_at: string;
}

const DigiMailPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'compose' | 'campaigns' | 'logs' | 'templates'>('compose');

  // Filter & Search states
  const [searchRecipients, setSearchRecipients] = useState('');
  const [searchLogs, setSearchLogs] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('all');

  // Selection states (Max 500 constraint for Gmail SMTP)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Compose State
  const [campaignName, setCampaignName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Template Modal state
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');

  // 1. Fetch Overall DigiMail Stats
  const { data: statsData } = useQuery({
    queryKey: ['digimail-stats'],
    queryFn: async () => {
      const res = await api.get('/digimail/stats');
      return res.data?.data;
    },
    refetchInterval: 15 * 1000,
  });

  const stats = statsData || {
    totalCampaigns: 0,
    totalSent: 0,
    totalFailed: 0,
    totalOpened: 0,
    openRate: 0,
  };

  // 2. Fetch Lead Recipients
  const { data: recipientsData, isLoading: isLoadingRecipients } = useQuery({
    queryKey: ['digimail-recipients', searchRecipients],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchRecipients.trim()) params.append('search', searchRecipients.trim());
      params.append('limit', '500'); // Up to 500 leads
      const res = await api.get(`/digimail/recipients?${params.toString()}`);
      return res.data?.data;
    },
    staleTime: 30 * 1000,
  });

  const allRecipients: RecipientLead[] = recipientsData?.recipients || [];

  // 3. Fetch Email Templates
  const { data: templatesData } = useQuery({
    queryKey: ['digimail-templates'],
    queryFn: async () => {
      const res = await api.get('/digimail/templates');
      return res.data?.data;
    },
    staleTime: 60 * 1000,
  });

  const templates: EmailTemplate[] = templatesData || [];

  // 4. Fetch Campaigns History
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['digimail-campaigns'],
    queryFn: async () => {
      const res = await api.get('/digimail/campaigns?limit=30');
      return res.data?.data;
    },
    enabled: activeTab === 'campaigns',
    refetchInterval: 10 * 1000,
  });

  const campaigns: DigiMailCampaign[] = campaignsData?.campaigns || [];

  // 5. Fetch Delivery & Open Logs
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['digimail-logs', logStatusFilter, searchLogs],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (logStatusFilter !== 'all') params.append('status', logStatusFilter);
      if (searchLogs.trim()) params.append('search', searchLogs.trim());
      params.append('limit', '50');
      const res = await api.get(`/digimail/logs?${params.toString()}`);
      return res.data?.data;
    },
    enabled: activeTab === 'logs',
    refetchInterval: 10 * 1000,
  });

  const logs: DigiMailLog[] = logsData?.logs || [];

  // Handle Select All (Max 500 constraint for Gmail SMTP)
  const handleSelectAll500 = () => {
    if (selectedLeadIds.size === allRecipients.length && allRecipients.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      const max500 = allRecipients.slice(0, 500).map((r) => r.id);
      setSelectedLeadIds(new Set(max500));
    }
  };

  const handleToggleRecipient = (id: string) => {
    const updated = new Set(selectedLeadIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      if (updated.size >= 500) {
        alert('Daily Gmail SMTP limit: Maximum 500 recipients allowed per run.');
        return;
      }
      updated.add(id);
    }
    setSelectedLeadIds(updated);
  };

  // Load Template into Composer
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setEmailSubject(tmpl.subject);
      setHtmlContent(tmpl.body);
    }
  };

  // Send Bulk Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const chosenRecipients = allRecipients
        .filter((r) => selectedLeadIds.has(r.id))
        .map((r) => ({
          leadId: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
        }));

      if (chosenRecipients.length === 0) {
        throw new Error('Please select at least 1 recipient lead.');
      }

      if (!emailSubject.trim()) {
        throw new Error('Please specify an email subject.');
      }

      if (!htmlContent.trim()) {
        throw new Error('Please enter HTML or text message content.');
      }

      const res = await api.post('/digimail/send', {
        campaignName: campaignName.trim() || `Campaign ${new Date().toLocaleDateString('en-GB')}`,
        subject: emailSubject.trim(),
        htmlContent,
        recipients: chosenRecipients,
      });
      return res.data;
    },
    onSuccess: () => {
      setStatusMessage({
        type: 'success',
        text: `Success! Dispatched campaign to ${selectedLeadIds.size} recipient(s). Emails are sending with live open tracking.`,
      });
      setSelectedLeadIds(new Set());
      setCampaignName('');
      queryClient.invalidateQueries({ queryKey: ['digimail-stats'] });
      queryClient.invalidateQueries({ queryKey: ['digimail-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['digimail-logs'] });
    },
    onError: (err: any) => {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to dispatch email campaign',
      });
    },
  });

  // Create Template Mutation
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/digimail/templates', {
        name: newTemplateName.trim(),
        subject: newTemplateSubject.trim(),
        body: newTemplateBody.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setShowNewTemplateModal(false);
      setNewTemplateName('');
      setNewTemplateSubject('');
      setNewTemplateBody('');
      queryClient.invalidateQueries({ queryKey: ['digimail-templates'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to save template');
    },
  });

  // Live Preview Replacements
  const sampleLead = allRecipients.find((r) => selectedLeadIds.has(r.id)) || allRecipients[0] || {
    name: 'Rajeev Singhania',
    email: 'rajeev@polymers.in',
    phone: '+91 97114 45566',
  };

  const previewSubject = emailSubject
    ? emailSubject.replace(/\{\{\s*name\s*\}\}/gi, sampleLead.name)
    : 'No Subject Specified';

  const previewHtml = htmlContent
    ? htmlContent
        .replace(/\{\{\s*name\s*\}\}/gi, sampleLead.name)
        .replace(/\{\{\s*email\s*\}\}/gi, sampleLead.email)
        .replace(/\{\{\s*phone\s*\}\}/gi, sampleLead.phone || '')
    : '<div style="color: #94a3b8; font-family: sans-serif; text-align: center; padding: 40px 0;">No content typed yet. Type HTML or plain text on the left to see live preview here...</div>';

  return (
    <CrmLayout>
      <div className="space-y-6 max-w-7xl pb-20 font-sans">
        {/* Top Header Card (Clean Enterprise UI) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#003884] text-white flex items-center justify-center font-black shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">DigiMail Hub</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#003884] border border-blue-200 uppercase tracking-wide">
                    Enterprise Bulk Mailer
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send high-volume personalized emails to leads with live side-by-side HTML preview and open tracking
                </p>
              </div>
            </div>
          </div>

          {/* Connected SMTP Account Pill */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">SMTP Active</p>
              <p className="font-semibold text-slate-800">hostingdigiink@gmail.com (Max 500/run)</p>
            </div>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Emails Sent</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{stats.totalSent}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Delivered via SMTP</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <span>Emails Opened</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-emerald-600 mt-2">{stats.totalOpened}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{stats.openRate}% Open Rate</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-purple-700">
              <span>Campaigns</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <h3 className="text-2xl font-black text-purple-600 mt-2">{stats.totalCampaigns}</h3>
            <p className="text-[10px] text-purple-600 font-medium mt-0.5">Dispatched batches</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-700">
              <span>Failed / Bounces</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-rose-600 mt-2">{stats.totalFailed}</h3>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">Rejected addresses</p>
          </div>
        </div>

        {/* Tab Navigation (No emojis, clean corporate tabs) */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl gap-2 pt-2 text-xs font-semibold">
          {[
            { id: 'compose', label: 'Compose & Bulk Send' },
            { id: 'campaigns', label: 'Campaigns History' },
            { id: 'logs', label: 'Delivery & Open Logs' },
            { id: 'templates', label: 'Email Templates' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setStatusMessage(null);
              }}
              className={`pb-3 px-4 transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#003884] text-[#003884] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="font-bold text-sm cursor-pointer ml-3">
              ✕
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: COMPOSE & BULK SEND WITH SIDE-BY-SIDE PREVIEW     */}
        {/* ======================================================== */}
        {activeTab === 'compose' && (
          <div className="space-y-6">
            {/* Step 1: Select Leads Table (Clean Leads UI Layout) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 1: Select Target Leads</h3>
                  <p className="text-[11px] text-slate-400">
                    Showing leads with verified email addresses (Maximum 500 per dispatch for Gmail quota)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    Selected: <span className="text-[#003884]">{selectedLeadIds.size}</span> / 500 max
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAll500}
                    className="px-3 py-1.5 text-xs font-semibold text-[#003884] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
                  >
                    {selectedLeadIds.size === allRecipients.length && allRecipients.length > 0
                      ? 'Deselect All'
                      : 'Select All (Max 500)'}
                  </button>
                </div>
              </div>

              {/* Instant Search Bar */}
              <div className="max-w-md">
                <input
                  type="text"
                  value={searchRecipients}
                  onChange={(e) => setSearchRecipients(e.target.value)}
                  placeholder="Filter leads by name, email, phone, city..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                />
              </div>

              {/* Table of Leads */}
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.size > 0 && selectedLeadIds.size === allRecipients.length}
                          onChange={handleSelectAll500}
                          className="w-4 h-4 rounded text-[#003884] focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">City / Location</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isLoadingRecipients ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">Loading leads...</td>
                      </tr>
                    ) : allRecipients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">No leads with valid email found</td>
                      </tr>
                    ) : (
                      allRecipients.map((lead) => {
                        const isChecked = selectedLeadIds.has(lead.id);
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => handleToggleRecipient(lead.id)}
                            className={`cursor-pointer transition ${
                              isChecked ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleRecipient(lead.id)}
                                className="w-4 h-4 rounded text-[#003884] focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{lead.name}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{lead.email}</td>
                            <td className="py-2.5 px-3 text-slate-500">{lead.phone || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{lead.city || '-'}</td>
                            <td className="py-2.5 px-3">
                              {lead.status_name ? (
                                <span
                                  className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase shadow-2xs"
                                  style={{ backgroundColor: lead.status_color || '#3b82f6' }}
                                >
                                  {lead.status_name}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 2: SIDE-BY-SIDE EDITOR & REAL-TIME PREVIEW */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 2: Message Design &amp; Live Preview</h3>
                  <p className="text-[11px] text-slate-400">
                    Edit HTML/plain text on the left — real rendered email preview updates instantly on the right
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplateModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    + Save as Template
                  </button>
                </div>
              </div>

              {/* Template & Campaign Name Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Load Existing Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  >
                    <option value="">-- Choose Email Template --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Campaign Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. November Product Launch"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email Subject *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Exclusive Offer for {{name}} - DigiMail"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#003884]"
                />
              </div>

              {/* Variable Insertion Pills */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-500">Insert Dynamic Tags:</span>
                {['{{name}}', '{{email}}', '{{phone}}'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setHtmlContent((prev) => prev + ` ${tag} `)}
                    className="px-2 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] hover:border-blue-500 hover:text-blue-600 cursor-pointer shadow-2xs"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              {/* SIDE-BY-SIDE CONTAINER: Left (Editor) vs Right (Live Rendered Preview) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                {/* Left: Code Editor */}
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>HTML / Text Editor</span>
                    <span className="font-mono text-slate-400">{htmlContent.length} chars</span>
                  </div>
                  <textarea
                    rows={16}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="<h2>Hello {{name}},</h2><p>We are excited to share our latest updates with you...</p>"
                    className="w-full flex-1 p-3 font-mono text-xs bg-slate-900 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003884] leading-relaxed resize-y"
                  />
                </div>

                {/* Right: Live Preview Box */}
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>Live Preview (Sample: {sampleLead.name})</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">● Real-time render</span>
                  </div>

                  <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-inner">
                    {/* Fake Email Client Header */}
                    <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-3 space-y-1 text-[11px] text-slate-600">
                      <div>
                        <strong>From:</strong> DigiInk Solutions &lt;hostingdigiink@gmail.com&gt;
                      </div>
                      <div>
                        <strong>To:</strong> {sampleLead.name} &lt;{sampleLead.email}&gt;
                      </div>
                      <div className="text-slate-900 font-semibold">
                        <strong>Subject:</strong> {previewSubject}
                      </div>
                    </div>

                    {/* Rendered HTML Container */}
                    <div
                      className="p-4 flex-1 overflow-auto bg-white text-xs text-slate-800 prose prose-sm max-w-none min-h-[300px]"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Dispatch Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Ready to send to <strong className="text-slate-900">{selectedLeadIds.size} lead(s)</strong>.
                </div>

                <button
                  type="button"
                  disabled={sendEmailMutation.isPending || selectedLeadIds.size === 0}
                  onClick={() => sendEmailMutation.mutate()}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                    sendEmailMutation.isPending || selectedLeadIds.size === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-[#003884] hover:bg-[#002860] active:scale-98'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>
                    {sendEmailMutation.isPending
                      ? 'Dispatching Emails...'
                      : `Dispatch Campaign to ${selectedLeadIds.size} Selected Lead(s)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CAMPAIGNS HISTORY                                 */}
        {/* ======================================================== */}
        {activeTab === 'campaigns' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Campaigns History</h3>
                <p className="text-[11px] text-slate-400">Track sent, failed, and open rates per bulk batch</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Campaign Name</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Recipients</th>
                    <th className="py-3 px-4 text-center">Sent</th>
                    <th className="py-3 px-4 text-center">Opened</th>
                    <th className="py-3 px-4 text-center">Open Rate</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingCampaigns ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">Loading campaigns...</td>
                    </tr>
                  ) : campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No email campaigns dispatched yet</td>
                    </tr>
                  ) : (
                    campaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{camp.name}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{camp.subject}</td>
                        <td className="py-3 px-4 text-center font-semibold">{camp.total_recipients}</td>
                        <td className="py-3 px-4 text-center font-bold text-blue-600">{camp.sent_count}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">{camp.opened_count}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {camp.open_rate_pct || 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(camp.created_at).toLocaleDateString('en-GB')} {new Date(camp.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DELIVERY & OPEN LOGS                              */}
        {/* ======================================================== */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email Delivery &amp; Open Logs</h3>
                <p className="text-[11px] text-slate-400">Individual status of each lead with opened timestamp</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="opened">Opened (Read)</option>
                  <option value="failed">Failed</option>
                </select>

                <input
                  type="text"
                  value={searchLogs}
                  onChange={(e) => setSearchLogs(e.target.value)}
                  placeholder="Filter name or email..."
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Delivery Status</th>
                    <th className="py-3 px-4 text-center">Opened (Read)</th>
                    <th className="py-3 px-4">Opened At</th>
                    <th className="py-3 px-4">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">Loading delivery logs...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No logs found</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-semibold text-slate-900">{log.recipient_name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{log.recipient_email}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{log.subject}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.status === 'failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.is_opened ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Opened ({log.open_count}x)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Unopened</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {log.opened_at ? new Date(log.opened_at).toLocaleTimeString('en-GB') : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.sent_at).toLocaleDateString('en-GB')} {new Date(log.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: TEMPLATES MANAGEMENT                              */}
        {/* ======================================================== */}
        {activeTab === 'templates' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email Templates</h3>
                <p className="text-[11px] text-slate-400">Shared templates synced with Settings &amp; DigiMail</p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewTemplateModal(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#003884] hover:bg-[#002860] rounded-xl transition cursor-pointer shadow-xs"
              >
                + Create New Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {templates.length === 0 ? (
                <div className="col-span-3 py-10 text-center text-xs text-slate-400">
                  No email templates found. Click "+ Create New Template" to add one.
                </div>
              ) : (
                templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{tmpl.name}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                          EMAIL
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 mt-1">Sub: {tmpl.subject}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-3 mt-1 font-mono">
                        {tmpl.body}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTemplate(tmpl.id);
                        setActiveTab('compose');
                      }}
                      className="w-full py-1.5 text-[11px] font-semibold text-[#003884] bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer text-center"
                    >
                      Use in Composer →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal: Create New Template */}
        {showNewTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Add New Email Template</h3>
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. Welcome Onboarding"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Subject Line *</label>
                  <input
                    type="text"
                    value={newTemplateSubject}
                    onChange={(e) => setNewTemplateSubject(e.target.value)}
                    placeholder="e.g. Welcome to Apex CRM, {{name}}!"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">HTML / Text Body *</label>
                  <textarea
                    rows={6}
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    placeholder="<p>Hi {{name}},</p><p>Thank you for reaching out to us...</p>"
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewTemplateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createTemplateMutation.isPending}
                  onClick={() => createTemplateMutation.mutate()}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#003884] hover:bg-[#002860] rounded-lg cursor-pointer"
                >
                  {createTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CrmLayout>
  );
};

export default DigiMailPage;
