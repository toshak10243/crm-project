import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface LeadRemarkItem {
  id: string;
  lead_id: string;
  remark: string;
  created_by_name?: string;
  created_at: string;
}

interface LeadRecord {
  id: string;
  lead_number: number;
  name: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  lead_from?: string;
  remark?: string;
  lead_received_on?: string;
  created_at: string;
  updated_at: string;
  next_followup_date?: string;
  followup_time_from?: string;
  followup_time_to?: string;
  followup_remark?: string;
  status_name?: string;
  status_color?: string;
  assigned_to_name?: string;
  assigned_to_id?: string;
  branch_name?: string;
  campaign_id?: string;
  recent_remarks?: LeadRemarkItem[];
  total_remarks?: number;
  latest_remark?: LeadRemarkItem | null;
}

interface FollowupPageProps {
  todayOnly?: boolean;
}

const DEFAULT_WA_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome to CRM!',
    content: (name: string) => `Hello ${name}, welcome to CRM! We're excited to partner with you. How can our team assist your business today?`,
  },
  {
    id: 'followup_first_call',
    name: 'Follow-Up Template (After First Call)',
    content: (name: string) => `Hi ${name}, thank you for your time on the call today. As discussed, please let us know if you have any questions or need more details. Looking forward to our next conversation!`,
  },
  {
    id: 'proposal_quotation',
    name: 'Proposal / Quotation Template',
    content: (name: string) => `Dear ${name}, here is the customized proposal & quotation for your requirements. Please review it and feel free to reach out for any clarifications.`,
  },
  {
    id: 'online_demo',
    name: 'Online Demo Invitation / Confirmation',
    content: (name: string) => `Hi ${name}, your online CRM product demo has been confirmed. We look forward to showing you the full platform features and workflows.`,
  },
  {
    id: 'welcome_aboard',
    name: "Welcome Aboard - Let's Kick Off Your Project with CRM",
    content: (name: string) => `Welcome aboard ${name}! We are thrilled to start our project journey together with CRM. Our team is ready to onboard you smoothly.`,
  },
  {
    id: 'project_delivery',
    name: 'Project Delivery Complete - Your CRM Solution is Ready',
    content: (name: string) => `Dear ${name}, we are pleased to inform you that your CRM solution setup and delivery is complete. Let us know if you need any adjustments!`,
  },
  {
    id: 'feedback',
    name: 'Feedback Template',
    content: (name: string) => `Hi ${name}, we value your feedback! Could you take a moment to share your experience with our services and team?`,
  },
  {
    id: 'exit_followup',
    name: 'Exit Follow-Up Email (Future Opportunities)',
    content: (name: string) => `Hello ${name}, thank you for considering us. We understand the timing might not be right currently. We'd love to stay in touch for future opportunities!`,
  },
  {
    id: 'followup_after_demo',
    name: 'Follow-up after a demo',
    content: (name: string) => `Hi ${name}, thank you for attending the demo today! How did you find the walkthrough? Let us know the next steps or if you'd like a follow-up call.`,
  },
  {
    id: 'other',
    name: 'Other',
    content: () => '',
  },
];

export const FollowupsPage: React.FC<FollowupPageProps> = ({ todayOnly = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (todayOnly) {
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    return '';
  });
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // 3-Dots Action Menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [editLeadHistory, setEditLeadHistory] = useState<any[]>([]);
  const [historyModalLead, setHistoryModalLead] = useState<LeadRecord | null>(null);
  const [whatsappLead, setWhatsappLead] = useState<LeadRecord | null>(null);
  const [emailLead, setEmailLead] = useState<LeadRecord | null>(null);
  const [customWaMessage, setCustomWaMessage] = useState<string>('');
  const [customEmailSubject, setCustomEmailSubject] = useState<string>('');
  const [customEmailBody, setCustomEmailBody] = useState<string>('');
  const [selectedWaTemplateId, setSelectedWaTemplateId] = useState<string>('');
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>('');
  const [callModalLead, setCallModalLead] = useState<LeadRecord | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Inline remarks inputs
  const [remarkInputs, setRemarkInputs] = useState<Record<string, string>>({});
  const [submittingRemarkLeadId, setSubmittingRemarkLeadId] = useState<string | null>(null);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch options (Statuses, Managers, Branches, Templates)
  const { data: optionsData } = useQuery({
    queryKey: ['lead-options'],
    queryFn: async () => {
      const res = await api.get('/leads/options');
      return res.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statuses = optionsData?.statuses || [];
  const counselors = optionsData?.counselors || optionsData?.users || [];
  const branches = optionsData?.branches || [];
  const templates = optionsData?.templates || [];

  // Fetch followups with React Query - instantly synced without manual page refresh
  const { data: leadsData, isLoading } = useQuery({
    queryKey: [
      todayOnly ? 'today-followups' : 'all-followups',
      page,
      limit,
      debouncedSearch,
      selectedDate,
      selectedManager,
      todayOnly,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (todayOnly) {
        params.append('followup_date', selectedDate || new Date().toISOString().split('T')[0]);
      } else {
        params.append('has_followup', 'true');
        if (selectedDate) {
          params.append('followup_date', selectedDate);
        }
      }

      if (selectedManager && selectedManager !== 'all') {
        params.append('manager_id', selectedManager);
      }
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const res = await api.get(`/leads?${params.toString()}`);
      return res.data?.data;
    },
  });

  const records: LeadRecord[] = leadsData?.records || leadsData?.leads || [];
  const totalRecords: number = leadsData?.pagination?.totalRecords ?? leadsData?.total ?? records.length;
  const totalPages: number = Math.ceil(totalRecords / limit) || 1;

  // Add inline remark mutation
  const addRemarkMutation = useMutation({
    mutationFn: async ({ leadId, remark }: { leadId: string; remark: string }) => {
      const res = await api.post(`/leads/${leadId}/remarks`, { remark });
      return res.data;
    },
    onSuccess: (_, variables) => {
      setRemarkInputs((prev) => ({ ...prev, [variables.leadId]: '' }));
      setSubmittingRemarkLeadId(null);
      queryClient.invalidateQueries({ queryKey: [todayOnly ? 'today-followups' : 'all-followups'] });
    },
    onError: () => {
      setSubmittingRemarkLeadId(null);
      setAlertMessage({ text: 'Failed to add remark. Please try again.', type: 'error' });
    },
  });

  // Handle enter key to save remark
  const handleRemarkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, leadId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = (remarkInputs[leadId] || '').trim();
      if (!text) return;
      setSubmittingRemarkLeadId(leadId);
      addRemarkMutation.mutate({ leadId, remark: text });
    }
  };

  // Edit lead modal open
  const handleOpenEditModal = async (lead: LeadRecord) => {
    setActiveMenuId(null);
    setEditingLeadId(lead.id);
    setEditFormData({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      address: lead.address || '',
      status_id: (lead as any).status_id || '',
      lead_from: lead.lead_from || '',
      branch_id: (lead as any).branch_id || '',
      assigned_to: (lead as any).assigned_to || (lead as any).assigned_to_id || '',
      next_followup_date: lead.next_followup_date ? new Date(lead.next_followup_date).toISOString().slice(0, 10) : '',
      followup_time_from: lead.followup_time_from || '',
      followup_time_to: lead.followup_time_to || '',
      followup_remark: lead.followup_remark || '',
      remark: lead.remark || '',
    });

    try {
      const res = await api.get(`/leads/${lead.id}`);
      const full = res.data?.data;
      if (full) {
        setEditLeadHistory(full.history || []);
      }
    } catch (err) {
      console.error('Failed to load lead history', err);
      setEditLeadHistory([]);
    }
  };

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.patch(`/leads/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setAlertMessage({ text: 'Follow-up updated successfully!', type: 'success' });
      setEditingLeadId(null);
      setEditFormData(null);
      queryClient.invalidateQueries({ queryKey: [todayOnly ? 'today-followups' : 'all-followups'] });
    },
    onError: (err: any) => {
      setAlertMessage({ text: err.response?.data?.message || 'Failed to update follow-up', type: 'error' });
    },
  });

  // Soft delete lead
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/leads/${id}`);
      return res.data;
    },
    onSuccess: () => {
      setAlertMessage({ text: 'Lead deleted successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: [todayOnly ? 'today-followups' : 'all-followups'] });
    },
  });

  // Date formatters
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const formatRemarkTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      const formattedHours = String(hours).padStart(2, '0');
      return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'N/A';
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1] || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    }
    return timeStr;
  };

  return (
    <CrmLayout>
      <div className="space-y-4">

        {/* Success / Error notification */}
        {alertMessage && (
          <div
            className={`p-3.5 rounded-lg text-sm font-medium flex items-center justify-between ${alertMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
          >
            <span>{alertMessage.text}</span>
            <button
              onClick={() => setAlertMessage(null)}
              className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Filter Bar (Date & Manager for Today Followup) */}
        {todayOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
            <select
              value={selectedManager}
              onChange={(e) => {
                setSelectedManager(e.target.value);
                setPage(1);
              }}
              aria-label="Select Manager"
              className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs min-w-[160px]"
            >
              <option value="all">Select Manager</option>
              {counselors.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pill Search Bar matching reference screenshots */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs placeholder-slate-400"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>
        </div>

        {/* Section Header: Total Records & Rows per page */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-xl font-bold text-slate-800">
            {todayOnly ? 'Today Followup' : 'All Followup'}
          </h2>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <div>
              Total Records:{' '}
              <span className="font-semibold text-emerald-600 underline cursor-pointer">{totalRecords}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
                className="bg-white border border-slate-200 text-slate-700 rounded px-2 py-1 text-sm focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 bg-white rounded-xl border border-slate-200">
            Loading followups...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && records.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-20 text-center shadow-xs">
            <p className="text-slate-500 text-base font-normal">
              {todayOnly ? 'Today no any followup' : 'No followups found'}
            </p>
          </div>
        )}

        {/* Lead Cards List matching Exact Reference Screenshot 1 (crm.com/master/allfollowup) */}
        {!isLoading && records.length > 0 && (
          <div className="space-y-4">
            {records.map((lead) => {
              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-4"
                >
                  {/* Card Header Row matching Screenshot 1 */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Avatar + Name + Status + Followup Date + Time */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                      {/* Avatar & Lead Name */}
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#003884] flex items-center justify-center text-white flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <h3
                          className="text-base font-bold text-slate-900 hover:text-blue-700 cursor-pointer tracking-tight"
                          onClick={() => navigate(`/master/viewLead/${lead.id}`)}
                        >
                          {lead.name}
                        </h3>
                      </div>

                      {/* Lead Status Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold">
                          <svg className="w-3.5 h-3.5 inline text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </span>
                        <span className="font-bold text-slate-800">Lead Status:</span>
                        <span
                          className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase text-white shadow-2xs"
                          style={{
                            backgroundColor:
                              lead.status_name === 'FOLLOW-UP'
                                ? '#9333ea'
                                : lead.status_name === 'NO RESPONSE'
                                  ? '#0f172a'
                                  : lead.status_name === 'FUTURE PIPELINE'
                                    ? '#94a3b8'
                                    : lead.status_name === 'NO REQUIREMENT'
                                      ? '#dc2626'
                                      : lead.status_color || '#94a3b8',
                          }}
                        >
                          {lead.status_name || 'NEW'}
                        </span>
                      </div>

                      {/* Next Followup Date */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="font-bold text-slate-800">Next Followup Date:</span>
                        <span className="text-slate-700 font-medium">{formatDate(lead.next_followup_date)}</span>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-orange-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <span className="font-bold text-slate-800">Time:</span>
                        <span className="text-slate-700 font-medium">{formatTime(lead.followup_time_from)}</span>
                      </div>
                    </div>

                    {/* Right: WhatsApp, Edit Pen & Options Menu */}
                    <div className="flex items-center gap-1.5 relative">
                      {/* WhatsApp Icon */}
                      <button
                        type="button"
                        onClick={() => {
                          setWhatsappLead(lead);
                          setCustomWaMessage('');
                          setSelectedWaTemplateId('');
                        }}
                        title="Send WhatsApp Message"
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.031 2a9.967 9.967 0 00-8.528 15.176L2 22l4.981-1.472A9.963 9.963 0 0012.031 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.286c-1.579 0-3.08-.432-4.385-1.246l-.315-.196-3.238.956.974-3.158-.21-.334a8.251 8.251 0 01-1.267-4.308c0-4.57 3.717-8.286 8.441-8.286 4.653 0 8.44 3.716 8.44 8.286 0 4.57-3.787 8.286-8.235 8.286z" />
                        </svg>
                      </button>

                      {/* Edit Pen Icon */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(lead)}
                        title="Update Lead Follow-up"
                        className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* 3-Dots Action Button */}
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                        title="More options"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === lead.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-8 w-36 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-40 text-xs font-semibold"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              navigate(`/master/viewLead/${lead.id}`);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-left"
                          >
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View Lead</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (window.confirm(`Are you sure you want to delete lead "${lead.name}"?`)) {
                                deleteMutation.mutate(lead.id);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 text-rose-600 text-left"
                          >
                            <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3 Column Content Grid matching Screenshot 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-xs pt-1">
                    {/* Column 1: Lead From, Remark, Campaign */}
                    <div className="space-y-3">
                      {/* Lead From */}
                      <div className="flex items-center gap-2">
                        <span className="text-purple-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="12" r="9" strokeWidth="2" />
                            <circle cx="12" cy="12" r="3" strokeWidth="2" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Lead From:</span>
                        <span className="text-slate-700 font-medium">{lead.lead_from || 'N/A'}</span>
                      </div>

                      {/* Remark */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </span>
                          <span className="text-slate-900 font-bold">Remark:</span>
                        </div>
                        {/* Multi-line remark history */}
                        <div className="pl-6 text-slate-700 whitespace-pre-line text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                          {lead.recent_remarks && lead.recent_remarks.length > 0 ? (
                            lead.recent_remarks.map((rem, idx) => (
                              <div key={rem.id || idx}>
                                <span className="text-slate-500 font-mono">[{formatRemarkTimestamp(rem.created_at)}]</span>{' '}
                                <span>{rem.remark}</span>
                              </div>
                            ))
                          ) : (
                            <span>{lead.remark || lead.followup_remark || 'N/A'}</span>
                          )}
                        </div>
                      </div>

                      {/* Campaign */}
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Campaign:</span>
                        <span className="text-slate-700 font-medium">{lead.campaign_id || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Column 2: Phone, Branch, Campaign Details */}
                    <div className="space-y-3">
                      {/* Phone */}
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Phone:</span>
                        <span className="text-slate-700 font-medium font-mono">{lead.phone}</span>
                      </div>

                      {/* Branch */}
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Branch:</span>
                        <span className="text-slate-700 font-medium">{lead.branch_name || 'Head Office'}</span>
                      </div>

                      {/* Campaign Details */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Campaign Details:</span>
                        <span className="text-slate-700 font-medium">{lead.lead_from || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Column 3: Location, Lead Received, Lead Assign */}
                    <div className="space-y-3">
                      {/* Location */}
                      <div className="flex items-center gap-2">
                        <span className="text-rose-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Location:</span>
                        <span className="text-slate-700 font-medium">{lead.city ? `${lead.city},` : 'N/A'}</span>
                      </div>

                      {/* Lead Received On */}
                      <div className="flex items-center gap-2">
                        <span className="text-purple-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Lead Received:</span>
                        <span className="text-slate-700 font-medium">{formatDate(lead.lead_received_on || lead.created_at)}</span>
                      </div>

                      {/* Lead Assign */}
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Lead Assign:</span>
                        <span className="text-slate-700 font-medium">{lead.assigned_to_name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Remark Input for Quick Log */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="+ Add remark (Press Enter to save)"
                      value={remarkInputs[lead.id] || ''}
                      disabled={submittingRemarkLeadId === lead.id}
                      onChange={(e) =>
                        setRemarkInputs((prev) => ({ ...prev, [lead.id]: e.target.value }))
                      }
                      onKeyDown={(e) => handleRemarkKeyDown(e, lead.id)}
                      className="flex-1 text-xs px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-60"
                    />
                    {(lead.total_remarks || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistoryModalLead(lead)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap transition-colors"
                      >
                        Read more (History)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 text-xs text-slate-400 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
          >
            &lt; previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setPage(num)}
              className={`w-7 h-7 rounded text-xs font-semibold flex items-center justify-center transition-colors ${page === num
                ? 'bg-[#0b3b75] text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-2.5 py-1 text-xs text-slate-600 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
          >
            next &gt;
          </button>
        </div>

        {/* ======================================================== */}
        {/* EDIT / UPDATE LEAD MODAL (Matching exact All Leads) */}
        {/* ======================================================== */}
        {editingLeadId && editFormData && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
              <div className="bg-[#0b3b75] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
                <h3 className="text-base font-bold tracking-tight">Update Lead</h3>
                <button
                  type="button"
                  onClick={() => setEditingLeadId(null)}
                  className="text-white/80 hover:text-white transition-colors text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Branch</label>
                    <select
                      value={editFormData.branch_id}
                      onChange={(e) => setEditFormData({ ...editFormData, branch_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Lead Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">City</label>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Lead Status</label>
                    <select
                      value={editFormData.status_id}
                      onChange={(e) => setEditFormData({ ...editFormData, status_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-bold"
                    >
                      <option value="">Select Lead Status</option>
                      {statuses.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Lead From</label>
                    <input
                      type="text"
                      value={editFormData.lead_from}
                      onChange={(e) => setEditFormData({ ...editFormData, lead_from: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5">Remark</label>
                    <textarea
                      rows={2}
                      value={editFormData.remark}
                      onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-4">Call Time</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Next Followup Date</label>
                      <input
                        type="date"
                        value={editFormData.next_followup_date}
                        onChange={(e) => setEditFormData({ ...editFormData, next_followup_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">From Time</label>
                      <input
                        type="time"
                        value={editFormData.followup_time_from}
                        onChange={(e) => setEditFormData({ ...editFormData, followup_time_from: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Lead Assign</label>
                      <select
                        value={editFormData.assigned_to}
                        onChange={(e) => setEditFormData({ ...editFormData, assigned_to: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
                      >
                        <option value="">Unassigned</option>
                        {counselors.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Lead FollowUp Remark</label>
                      <input
                        type="text"
                        placeholder="Enter FollowUp Remark"
                        value={editFormData.followup_remark}
                        onChange={(e) => setEditFormData({ ...editFormData, followup_remark: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Lead History Section */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Lead History</h4>
                  {editLeadHistory.length > 0 ? (
                    <div className="space-y-4">
                      {editLeadHistory.map((item: any, idx: number) => {
                        const dataObj = typeof item.data === 'string' ? JSON.parse(item.data) : item.data || {};
                        return (
                          <div key={item.id || idx} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-white"></span>
                              <span className="px-3 py-1 bg-[#1e3a5f] text-white rounded font-bold text-[11px] uppercase tracking-wide">
                                {item.lead_status || 'STATUS'} / {formatDate(item.created_at)}
                              </span>
                            </div>
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                                  <tr>
                                    <th className="px-4 py-2.5">Event Name</th>
                                    <th className="px-4 py-2.5">Event Value / Details</th>
                                    <th className="px-4 py-2.5">Updated Time</th>
                                    <th className="px-4 py-2.5">Updated By</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {Object.entries(dataObj).map(([key, val]: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-2 font-medium text-slate-600">{key}</td>
                                      <td className="px-4 py-2 font-semibold text-slate-900">{String(val || 'N/A')}</td>
                                      <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                                        {formatTime(item.created_at ? new Date(item.created_at).toTimeString().slice(0, 5) : '')}
                                      </td>
                                      <td className="px-4 py-2 font-medium text-slate-700">{item.updated_by_name || 'Admin'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-slate-50 text-slate-400 text-center italic border border-slate-200">
                      No activity logs recorded yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingLeadId(null)}
                  className="px-5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={updateLeadMutation.isPending}
                  onClick={() =>
                    updateLeadMutation.mutate({
                      id: editingLeadId,
                      payload: editFormData,
                    })
                  }
                  className="px-6 py-2 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {updateLeadMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Remarks History Popup Modal */}
        {historyModalLead && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0b3b75]">Remark History</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {historyModalLead.name} ({historyModalLead.phone})
                  </p>
                </div>
                <button
                  onClick={() => setHistoryModalLead(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {historyModalLead.recent_remarks && historyModalLead.recent_remarks.length > 0 ? (
                  historyModalLead.recent_remarks.map((item, i) => (
                    <div key={item.id || i} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                        <span>{item.created_by_name || 'Admin'}</span>
                        <span className="text-slate-400 font-mono">
                          {formatRemarkTimestamp(item.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-line font-medium">{item.remark}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-6">No previous remarks found.</div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 mt-3">
                <button
                  type="button"
                  onClick={() => setHistoryModalLead(null)}
                  className="px-4 py-2 bg-[#0b3b75] text-white rounded-lg text-xs font-semibold hover:bg-[#082b57]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Send WhatsApp Modal (Exact Match with Reference SS 1) */}
        {whatsappLead && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
              <div className="bg-[#0b3b75] text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-base font-bold tracking-tight">Send WhatsApp Message</h3>
                <button
                  type="button"
                  onClick={() => setWhatsappLead(null)}
                  className="text-white/80 hover:text-white transition-colors text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Lead Name</label>
                  <input
                    type="text"
                    readOnly
                    value={whatsappLead.name}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    readOnly
                    value={whatsappLead.phone}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-mono font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Select Message</label>
                  <select
                    value={selectedWaTemplateId}
                    onChange={(e) => {
                      const tId = e.target.value;
                      setSelectedWaTemplateId(tId);
                      const defaultTpl = DEFAULT_WA_TEMPLATES.find((item) => item.id === tId);
                      if (defaultTpl) {
                        setCustomWaMessage(defaultTpl.content(whatsappLead.name));
                        return;
                      }
                      const dbTpl = templates.find((item: any) => item.id === tId);
                      if (dbTpl) {
                        const content = (dbTpl.content || dbTpl.body || '').replace(/\{name\}/g, whatsappLead.name);
                        setCustomWaMessage(content);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                  >
                    <option value="">Select Option</option>
                    {DEFAULT_WA_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                    {templates
                      .filter((t: any) => !DEFAULT_WA_TEMPLATES.some((dt) => dt.id === t.id))
                      .map((tpl: any) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Message</label>
                  <textarea
                    rows={4}
                    placeholder="Enter message text..."
                    value={customWaMessage}
                    onChange={(e) => setCustomWaMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setWhatsappLead(null)}
                  className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = whatsappLead.phone.replace(/[^0-9]/g, '');
                    const encodedMsg = encodeURIComponent(
                      customWaMessage || `Hello ${whatsappLead.name}, thank you for contacting us!`
                    );
                    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
                    setWhatsappLead(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-6 py-2 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Send Email Modal */}
        {emailLead && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
              <div className="bg-[#0b3b75] text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-base font-bold tracking-tight">Send Email Message</h3>
                <button
                  type="button"
                  onClick={() => setEmailLead(null)}
                  className="text-white/80 hover:text-white transition-colors text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Lead Name</label>
                  <input
                    type="text"
                    readOnly
                    value={emailLead.name}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="text"
                    readOnly
                    value={emailLead.email || 'N/A'}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Select Template</label>
                  <select
                    value={selectedEmailTemplateId}
                    onChange={(e) => {
                      const tId = e.target.value;
                      setSelectedEmailTemplateId(tId);
                      const t = templates.find((item: any) => item.id === tId);
                      if (t) {
                        setCustomEmailSubject(t.subject || t.name || '');
                        setCustomEmailBody(t.content || t.body || '');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Option</option>
                    {templates.map((tpl: any) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Subject</label>
                  <input
                    type="text"
                    placeholder="Enter email subject"
                    value={customEmailSubject}
                    onChange={(e) => setCustomEmailSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Message Body</label>
                  <textarea
                    rows={4}
                    placeholder="Enter email message body..."
                    value={customEmailBody}
                    onChange={(e) => setCustomEmailBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEmailLead(null)}
                  className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!emailLead.email}
                  onClick={() => {
                    if (!emailLead.email) return;
                    const mailtoUrl = `mailto:${emailLead.email}?subject=${encodeURIComponent(
                      customEmailSubject || 'Regarding your inquiry'
                    )}&body=${encodeURIComponent(customEmailBody || '')}`;
                    window.location.href = mailtoUrl;
                    setEmailLead(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-6 py-2 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Cloud IVR Call Modal */}
        {callModalLead && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">{callModalLead.name}</h3>
              <p className="text-sm font-mono text-slate-600 my-1">{callModalLead.phone}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold my-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Connected via Cloud IVR Gateway</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-5">
                Live line channel active. Call recording and logs synchronized.
              </p>
              <button
                type="button"
                onClick={() => setCallModalLead(null)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Disconnect Call
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    </CrmLayout>
  );
};

export default FollowupsPage;
