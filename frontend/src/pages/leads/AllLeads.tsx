import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
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
  recent_remarks?: LeadRemarkItem[];
  total_remarks?: number;
  latest_remark?: LeadRemarkItem | null;
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

const AllLeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [updatedOn, setUpdatedOn] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Bulk Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkModalType, setBulkModalType] = useState<'followup' | 'assign' | 'delete' | null>(null);

  // Modal form states
  const [bulkManagerId, setBulkManagerId] = useState('');
  const [bulkFollowupDate, setBulkFollowupDate] = useState('');

  // Active 3-dots action menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // View / Edit / Call simulation Modal states
  const [viewLead, setViewLead] = useState<LeadRecord | null>(null);
  const [callModalLead, setCallModalLead] = useState<LeadRecord | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit / Update Lead Modal states
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [editLeadHistory, setEditLeadHistory] = useState<any[]>([]);

  // Remarks inline inputs and History modal state
  const [remarkInputs, setRemarkInputs] = useState<Record<string, string>>({});
  const [submittingRemarkLeadId, setSubmittingRemarkLeadId] = useState<string | null>(null);
  const [historyModalLead, setHistoryModalLead] = useState<LeadRecord | null>(null);

  // Excel / CSV Upload Dialog states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileError, setUploadFileError] = useState('');
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // Send WhatsApp Message Modal states
  const [whatsappLead, setWhatsappLead] = useState<LeadRecord | null>(null);
  const [selectedWaTemplateId, setSelectedWaTemplateId] = useState('');
  const [customWaMessage, setCustomWaMessage] = useState('');

  // Send Email Message Modal states
  const [emailLead, setEmailLead] = useState<LeadRecord | null>(null);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');
  const [customEmailMessage, setCustomEmailMessage] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

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

  // Fetch form options (Statuses, Managers/Counselors)
  const { data: optionsData } = useQuery({
    queryKey: ['lead-options'],
    queryFn: async () => {
      const res = await api.get('/leads/options');
      return res.data?.data;
    },
  });

  const statuses = optionsData?.statuses || [];
  const counselors = optionsData?.counselors || [];
  const branches = optionsData?.branches || [];
  const campaigns = optionsData?.campaigns || [];
  const receivedChannels = optionsData?.receivedChannels || [];
  const leadSources = optionsData?.leadSources || [];
  const templates = optionsData?.templates || [];
  const customFields: any[] = optionsData?.customFields || [];

  // Fetch leads with query parameters
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads-list', page, limit, debouncedSearch, statusFilter, managerFilter, startDate, endDate, updatedOn],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.append('status_id', statusFilter);
      if (managerFilter && managerFilter !== 'all') params.append('manager_id', managerFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (updatedOn) params.append('updated_on', updatedOn);

      const res = await api.get(`/leads?${params.toString()}`);
      return res.data?.data;
    },
  });

  const records: LeadRecord[] = leadsData?.records || [];
  const pagination = leadsData?.pagination || { totalRecords: 0, totalPages: 1, page: 1, limit: 10 };

  // Bulk actions mutation
  const bulkMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leads/bulk', payload);
      return res.data;
    },
    onSuccess: (res) => {
      setAlertMessage({ text: res?.message || 'Bulk operation completed', type: 'success' });
      setSelectedLeadIds([]);
      setBulkModalType(null);
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
    },
    onError: (err: any) => {
      setAlertMessage({ text: err.response?.data?.message || 'Bulk action failed', type: 'error' });
    },
  });

  // Single Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/leads/${id}`);
      return res.data;
    },
    onSuccess: () => {
      setAlertMessage({ text: 'Lead deleted successfully', type: 'success' });
      setActiveMenuId(null);
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
    },
    onError: () => {
      setAlertMessage({ text: 'Failed to delete lead', type: 'error' });
    },
  });

  // Handle select all checkbox on current page
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = records.map((r) => r.id);
      setSelectedLeadIds(allIds);
    } else {
      setSelectedLeadIds([]);
    }
  };

  // Handle single lead checkbox toggle
  const handleToggleLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add remark mutation (Enter to save)
  const addRemarkMutation = useMutation({
    mutationFn: async ({ leadId, remark }: { leadId: string; remark: string }) => {
      const res = await api.post(`/leads/${leadId}/remarks`, { remark });
      return res.data;
    },
    onSuccess: (_, variables) => {
      setRemarkInputs((prev) => ({ ...prev, [variables.leadId]: '' }));
      setSubmittingRemarkLeadId(null);
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['lead-remarks-history', variables.leadId] });
    },
    onError: (err: any) => {
      setSubmittingRemarkLeadId(null);
      setAlertMessage({ text: err.response?.data?.message || 'Failed to add remark', type: 'error' });
    },
  });

  const handleRemarkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, leadId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = remarkInputs[leadId]?.trim();
      if (!val) return;
      setSubmittingRemarkLeadId(leadId);
      addRemarkMutation.mutate({ leadId, remark: val });
    }
  };

  // File parsing for CSV / Excel
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFileError('');
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (data.length === 0) {
          setUploadFileError('The uploaded sheet is empty.');
          setParsedLeads([]);
          return;
        }
        setParsedLeads(data);
      } catch (err: any) {
        setUploadFileError('Failed to parse file. Please upload a valid CSV or XLSX/XLS file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Bulk Import Mutation
  const importMutation = useMutation({
    mutationFn: async (leads: any[]) => {
      const res = await api.post('/leads/import', { leads });
      return res.data;
    },
    onSuccess: (res) => {
      setAlertMessage({ text: res?.message || 'Leads imported successfully!', type: 'success' });
      setUploadModalOpen(false);
      setParsedLeads([]);
      setUploadFileName('');
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
    },
    onError: (err: any) => {
      setUploadFileError(err.response?.data?.message || 'Failed to import leads');
    },
  });

  // Open Edit Lead Modal and prefill data
  const handleOpenEditLead = async (lead: LeadRecord) => {
    try {
      setActiveMenuId(null);
      setEditingLeadId(lead.id);

      // Fetch full details
      const res = await api.get(`/leads/${lead.id}`);
      const data = res.data?.data || lead;

      setEditFormData({
        branch_id: data.branch_id || '',
        phone: data.phone || '',
        first_name: data.first_name || '',
        middle_name: data.middle_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        gender: data.gender || '',
        date_of_birth: data.date_of_birth ? data.date_of_birth.slice(0, 10) : '',
        city: data.city || '',
        lead_received_on: data.lead_received_on ? data.lead_received_on.slice(0, 10) : '',
        status_id: data.status_id || '',
        lead_from: data.lead_from || '',
        campaign_id: data.campaign_id || '',
        campaign_details: data.lead_from || '',
        remark: data.remark || '',
        refer_by: data.refer_by || '',
        custom_data: data.custom_data || {},
        appointment_date: data.custom_data?.appointment_date || '',
        service_type: data.custom_data?.service_type || '',
        address: data.address || data.custom_data?.address || '',
        feedback: data.custom_data?.feedback || '',
        // Call Time
        next_followup_date: data.next_followup_date ? data.next_followup_date.slice(0, 10) : '',
        followup_time_from: data.followup_time_from || '',
        followup_time_to: data.followup_time_to || '',
        assigned_to: data.assigned_to || '',
        followup_remark: data.followup_remark || '',
      });

      setEditLeadHistory(data.history || []);
    } catch {
      setAlertMessage({ text: 'Failed to load lead details for editing', type: 'error' });
    }
  };

  // Update Lead Mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.patch(`/leads/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setAlertMessage({ text: 'Lead updated successfully!', type: 'success' });
      setEditingLeadId(null);
      setEditFormData(null);
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
    },
    onError: (err: any) => {
      setAlertMessage({ text: err.response?.data?.message || 'Failed to update lead', type: 'error' });
    },
  });

  // Helper date/time formatter with format: 03 Nov 2026, 01:25 pm matching screenshot
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

  // Helper date/time formatter
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
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

  // Export current list to CSV
  const handleDownloadCSV = () => {
    if (records.length === 0) {
      alert('No records to download');
      return;
    }
    const headers = ['Lead Number', 'Name', 'Phone', 'Email', 'City', 'Status', 'Lead From', 'Lead Assigned', 'Follow-up Date', 'Follow-up Time', 'Remark'];
    const rows = records.map((r) => [
      `"${r.lead_number || ''}"`,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.city || ''}"`,
      `"${r.status_name || ''}"`,
      `"${r.lead_from || ''}"`,
      `"${r.assigned_to_name || ''}"`,
      `"${r.next_followup_date || ''}"`,
      `"${r.followup_time_from || ''}"`,
      `"${(r.remark || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAllSelected = records.length > 0 && records.every((r) => selectedLeadIds.includes(r.id));

  return (
    <CrmLayout>
      <div className="space-y-5 pb-12">

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

        {/* Filter Card Section matching screenshot 1 */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          {/* Row 1: Start Date, End Date, Status, Manager */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Select Lead Status</option>
                {statuses.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Manager</label>
              <select
                value={managerFilter}
                onChange={(e) => {
                  setManagerFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Select Manager</option>
                {counselors.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Updated On, Search Bar, Download, + Add Lead, + Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 items-end">
            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Updated On</label>
              <input
                type="date"
                value={updatedOn}
                onChange={(e) => {
                  setUpdatedOn(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="lg:col-span-5 flex items-center justify-end gap-2.5 flex-wrap">
              {/* Download Button */}
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download</span>
              </button>

              {/* Add Lead Button */}
              <button
                type="button"
                onClick={() => navigate('/master/addLead')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <span className="text-sm leading-none font-bold">+</span>
                <span>Add Lead</span>
              </button>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => {
                  setUploadFileError('');
                  setParsedLeads([]);
                  setUploadFileName('');
                  setUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <span className="text-sm leading-none font-bold">+</span>
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lead List Section Title + Total Records Count */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Lead List</h2>
          <div className="text-xs font-semibold text-slate-600">
            Total Records: <span className="text-blue-600 font-bold">{pagination.totalRecords}</span>
          </div>
        </div>

        {/* Rows per page selector */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="border border-slate-200 bg-white px-2 py-1 rounded text-xs focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        {/* Select All Checkbox Card / Bulk Action Banner matching screenshot 5 */}
        {selectedLeadIds.length > 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-900">
                {selectedLeadIds.length} lead(s) selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedLeadIds([])}
                className="text-xs text-blue-600 underline font-medium hover:text-blue-800"
              >
                Clear Selection
              </button>
            </div>

            {/* Action Buttons matching screenshot 5 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Set Follow-Up */}
              <button
                type="button"
                onClick={() => setBulkModalType('followup')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Set Follow-Up ({selectedLeadIds.length})</span>
              </button>

              {/* Assign Manager */}
              <button
                type="button"
                onClick={() => setBulkModalType('assign')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Assign Manager ({selectedLeadIds.length})</span>
              </button>

              {/* Delete All */}
              <button
                type="button"
                onClick={() => setBulkModalType('delete')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete All ({selectedLeadIds.length})</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span>Select All</span>
            </label>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 bg-white rounded-xl border border-slate-200">
            Loading leads records...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && records.length === 0 && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <div className="text-slate-400 mb-2">
              <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No leads found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or add a new lead.</p>
            <button
              onClick={() => navigate('/master/addLead')}
              className="mt-4 px-4 py-2 bg-[#0b3b75] text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              + Add Lead
            </button>
          </div>
        )}

        {/* Lead Cards List matching screenshot 2, 3, 4, 5 */}
        {!isLoading && records.length > 0 && (
          <div className="space-y-4">
            {records.map((lead) => {
              const isSelected = selectedLeadIds.includes(lead.id);

              return (
                <div
                  key={lead.id}
                  className={`bg-white rounded-xl p-5 transition-all relative ${isSelected
                    ? 'border-2 border-blue-500 shadow-sm'
                    : 'border border-slate-200/90 shadow-2xs hover:border-slate-300'
                    }`}
                >
                  {/* Top Bar: Select for bulk update + 3-dots action menu */}
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-500 select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleLead(lead.id)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span>Select for bulk update</span>
                    </label>

                    {/* 3 dots action menu trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === lead.id ? null : lead.id);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {/* 3-dots popup menu matching screenshot 4 */}
                      {activeMenuId === lead.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-9 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-30 text-xs font-medium text-slate-700 animate-in fade-in"
                        >
                          {/* Edit - opens Update Lead Modal matching reference */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditLead(lead)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-slate-700 text-left"
                          >
                            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete lead "${lead.name}"?`)) {
                                deleteMutation.mutate(lead.id);
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 text-rose-600 text-left"
                          >
                            <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>

                          {/* View - opens new page /master/viewLead/:id */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              navigate(`/master/viewLead/${lead.id}`);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-cyan-600 text-left"
                          >
                            <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View</span>
                          </button>

                          {/* Call */}
                          <button
                            type="button"
                            onClick={async () => {
                              setCallModalLead(lead);
                              setActiveMenuId(null);
                              try {
                                await api.post('/ivr/click-to-call', {
                                  customerPhone: lead.phone,
                                  leadId: lead.id,
                                  leadName: lead.name,
                                });
                              } catch (err) {
                                console.error('Click to call initiation failed', err);
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-blue-600 text-left"
                          >
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>Call</span>
                          </button>

                          {/* Send Message (WhatsApp) - Opens WhatsApp Modal matching reference */}
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsappLead(lead);
                              setSelectedWaTemplateId('');
                              setCustomWaMessage('');
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-emerald-600 text-left"
                          >
                            <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.031 2a9.967 9.967 0 00-8.528 15.176L2 22l4.981-1.472A9.963 9.963 0 0012.031 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.286c-1.579 0-3.08-.432-4.385-1.246l-.315-.196-3.238.956.974-3.158-.21-.334a8.251 8.251 0 01-1.267-4.308c0-4.57 3.717-8.286 8.441-8.286 4.653 0 8.44 3.716 8.44 8.286 0 4.57-3.787 8.286-8.235 8.286z" />
                            </svg>
                            <span>Send Message</span>
                          </button>

                          {/* Send Email - Opens Email Modal matching reference */}
                          <button
                            type="button"
                            onClick={() => {
                              setEmailLead(lead);
                              setSelectedEmailTemplateId('');
                              setCustomEmailMessage('');
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-blue-600 text-left"
                          >
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Send Email</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer / Company Title with blue user icon */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <h3
                      className="text-base font-bold text-[#0b3b75] hover:underline cursor-pointer tracking-tight"
                      onClick={() => navigate(`/master/viewLead/${lead.id}`)}
                    >
                      {lead.name}
                    </h3>
                  </div>

                  {/* 3 Column Grid with matching icons from reference */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                    {/* Column 1 */}
                    <div className="space-y-2.5">
                      {/* Lead Status */}
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Lead Status:</span>
                        <span
                          className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase text-white shadow-2xs"
                          style={{
                            backgroundColor:
                              lead.status_name === 'FOLLOW-UP'
                                ? '#9333ea'
                                : lead.status_name === 'NO RESPONSE'
                                  ? '#0f172a'
                                  : lead.status_color || '#2563eb',
                          }}
                        >
                          {lead.status_name || 'NEW'}
                        </span>
                      </div>

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
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-2.5">
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Date:</span>
                        <span className="text-slate-700 font-medium">{formatDate(lead.next_followup_date || lead.created_at)}</span>
                      </div>

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

                      {/* Lead Received On */}
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Lead Received On:</span>
                        <span className="text-slate-700 font-medium">{lead.lead_received_on ? formatDate(lead.lead_received_on) : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="space-y-2.5">
                      {/* Time */}
                      <div className="flex items-center gap-2">
                        <span className="text-orange-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Time:</span>
                        <span className="text-slate-700 font-medium">{formatTime(lead.followup_time_from)}</span>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="text-slate-900 font-bold">Email:</span>
                        <span className="text-slate-700 font-medium">{lead.email || 'N/A'}</span>
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

                  {/* Remark Bottom Section matching exact reference screenshot */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                    {/* Header line: Remark: [Latest] Date Time ... Read more (History) */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">Remark:</span>
                        {lead.latest_remark && (
                          <>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Latest
                            </span>
                            <span className="text-slate-500 font-medium">
                              {formatRemarkTimestamp(lead.latest_remark.created_at)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Read more (History) trigger */}
                      {(lead.total_remarks || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setHistoryModalLead(lead)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Read more (History)</span>
                        </button>
                      )}
                    </div>

                    {/* Display up to 5 recent remarks */}
                    {lead.recent_remarks && lead.recent_remarks.length > 0 ? (
                      <div className="space-y-1.5">
                        {lead.recent_remarks.map((rem, idx) => (
                          <div
                            key={rem.id || idx}
                            className={`text-xs text-slate-700 ${idx === 0 ? 'font-medium text-slate-900' : 'text-slate-600 opacity-90'
                              }`}
                          >
                            <span className="text-slate-400 font-normal mr-1.5">•</span>
                            <span className="whitespace-pre-line">{rem.remark}</span>
                            {rem.created_by_name && (
                              <span className="text-[11px] text-slate-400 ml-1.5 italic">
                                — {rem.created_by_name} ({formatRemarkTimestamp(rem.created_at)})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        {lead.remark ? lead.remark : 'No remarks added yet.'}
                      </div>
                    )}

                    {/* Inline Input Box: + Add remark (Enter to save) */}
                    <div className="pt-1">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="+ Add remark (Enter to save)"
                          value={remarkInputs[lead.id] || ''}
                          onChange={(e) =>
                            setRemarkInputs((prev) => ({ ...prev, [lead.id]: e.target.value }))
                          }
                          onKeyDown={(e) => handleRemarkKeyDown(e, lead.id)}
                          disabled={submittingRemarkLeadId === lead.id}
                          className="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:opacity-60 transition-all"
                        />
                        {submittingRemarkLeadId === lead.id && (
                          <span className="absolute right-3 top-2 text-[10px] text-blue-600 font-semibold animate-pulse">
                            Saving...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Section matching screenshot 3 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-6 select-none">
            {/* Prev button */}
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &lt; prev
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1;
              const isActive = page === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded transition-colors ${isActive
                    ? 'bg-[#0b3b75] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Ellipsis if many pages */}
            {pagination.totalPages > 5 && (
              <>
                <span className="px-1 text-slate-400 font-bold text-xs">..</span>
                <button
                  type="button"
                  onClick={() => setPage(pagination.totalPages)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded transition-colors ${page === pagination.totalPages
                    ? 'bg-[#0b3b75] text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            {/* Next button */}
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              next &gt;
            </button>
          </div>
        )}

        {/* Footer Copyright */}
        <div className="text-center text-xs text-slate-400 pt-6">
          © 2026 CRM. All Rights Reserved.
        </div>
      </div>

      {/* ======================================================== */}
      {/* BULK ACTION MODAL: SET FOLLOW-UP (Matching SS 1) */}
      {/* ======================================================== */}
      {bulkModalType === 'followup' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Header: Royal Dark Blue Banner */}
            <div className="bg-[#003884] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-base font-bold tracking-tight">Set Follow-Up Date</h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalType(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Info banner */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 text-xs text-blue-700">
                This will set the same follow-up date for <span className="font-bold text-blue-900">{selectedLeadIds.length} selected lead(s)</span>.
              </div>

              {/* Form Input */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Next Follow-Up Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={bulkFollowupDate}
                    onChange={(e) => setBulkFollowupDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Please select a date to continue.</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkModalType(null)}
                className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bulkFollowupDate || bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate({
                    lead_ids: selectedLeadIds,
                    action: 'followup',
                    next_followup_date: bulkFollowupDate,
                  })
                }
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {bulkMutation.isPending ? 'Updating...' : `Update ${selectedLeadIds.length} Lead(s)`}
                </span>
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* BULK ACTION MODAL: ASSIGN MANAGER (Matching SS 2) */}
      {/* ======================================================== */}
      {bulkModalType === 'assign' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Header: Royal Dark Blue Banner */}
            <div className="bg-[#003884] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-base font-bold tracking-tight">Assign Manager</h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalType(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Info banner */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 text-xs text-blue-700">
                This will assign the same manager to <span className="font-bold text-blue-900">{selectedLeadIds.length} selected lead(s)</span>.
              </div>

              {/* Form Input */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Select Manager <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bulkManagerId}
                  onChange={(e) => setBulkManagerId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">-- Select a Manager --</option>
                  {counselors.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Please select a manager to continue.</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkModalType(null)}
                className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bulkManagerId || bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate({
                    lead_ids: selectedLeadIds,
                    action: 'assign',
                    assigned_to: bulkManagerId,
                  })
                }
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>
                  {bulkMutation.isPending ? 'Assigning...' : `Assign to ${selectedLeadIds.length} Lead(s)`}
                </span>
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* BULK ACTION MODAL: DELETE ALL */}
      {/* ======================================================== */}
      {bulkModalType === 'delete' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-rose-600 mb-1">
              Delete {selectedLeadIds.length} Selected Leads?
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to permanently delete these leads? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setBulkModalType(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate({
                    lead_ids: selectedLeadIds,
                    action: 'delete',
                  })
                }
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {bulkMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* VIEW LEAD DETAILS MODAL */}
      {/* ======================================================== */}
      {viewLead && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0b3b75]">Lead Information</h3>
              <button
                onClick={() => setViewLead(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Customer Name:</span>
                <span className="font-bold text-slate-800">{viewLead.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Phone:</span>
                <span className="font-mono font-bold text-slate-800">{viewLead.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="text-slate-800">{viewLead.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold uppercase text-blue-600">{viewLead.status_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Lead From:</span>
                <span className="text-slate-800">{viewLead.lead_from || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Location:</span>
                <span className="text-slate-800">{viewLead.city || viewLead.address || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Assigned To:</span>
                <span className="text-slate-800">{viewLead.assigned_to_name || 'Unassigned'}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 font-medium block mb-1">Remark:</span>
                <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 whitespace-pre-line">
                  {viewLead.remark || viewLead.followup_remark || 'No remark entered.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setViewLead(null)}
                className="px-4 py-2 bg-[#0b3b75] text-white rounded-lg text-xs font-semibold hover:bg-[#082b57]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* CALL MODAL WITH CLOUD IVR INTEGRATION */}
      {/* ======================================================== */}
      {callModalLead && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <svg className="w-8 h-8 animate-pulse text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCallModalLead(null)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Disconnect Call
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* SEND WHATSAPP MESSAGE MODAL (Matching Reference SS 1) */}
      {/* ======================================================== */}
      {whatsappLead && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Header: Royal Blue Banner */}
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

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Lead Name (Readonly) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Lead Name</label>
                <input
                  type="text"
                  readOnly
                  value={whatsappLead.name}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              {/* Mobile Number (Readonly) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Mobile Number</label>
                <input
                  type="text"
                  readOnly
                  value={whatsappLead.phone}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-mono focus:outline-none"
                />
              </div>

              {/* Select Message / Template dropdown */}
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

              {/* Optional message textarea */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Message Content</label>
                <textarea
                  rows={4}
                  placeholder="Type your message here or pick a template above..."
                  value={customWaMessage}
                  onChange={(e) => setCustomWaMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Footer Buttons: Send & Cancel */}
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
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* SEND EMAIL MESSAGE MODAL (Matching Reference SS 2) */}
      {/* ======================================================== */}
      {emailLead && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Header: Royal Blue Banner */}
            <div className="bg-[#003884] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-base font-bold tracking-tight">Send Email Message</h3>
              </div>
              <button
                type="button"
                onClick={() => setEmailLead(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Lead Name (Readonly) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Lead Name</label>
                <input
                  type="text"
                  readOnly
                  value={emailLead.name}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              {/* Email Address (Readonly) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="text"
                  readOnly
                  value={emailLead.email || 'N/A'}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
                />
              </div>

              {/* Select Template dropdown */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Select Template</label>
                <select
                  value={selectedEmailTemplateId}
                  onChange={(e) => {
                    setSelectedEmailTemplateId(e.target.value);
                    const selected = templates.find((t: any) => t.id === e.target.value);
                    if (selected) {
                      setCustomEmailMessage(selected.body || '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="">Select Option</option>
                  {/* Dynamic templates from database (populated in settings) */}
                  {templates
                    .filter((t: any) => t.type === 'email' || !t.type)
                    .map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  {templates.length === 0 && (
                    <>
                      <option value="test">Test</option>
                      <option value="custom">Custom</option>
                    </>
                  )}
                </select>
              </div>

              {/* Optional message textarea */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Email Body</label>
                <textarea
                  rows={3}
                  placeholder="Type your email message..."
                  value={customEmailMessage}
                  onChange={(e) => setCustomEmailMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Footer Buttons: Send & Cancel */}
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
                onClick={() => {
                  if (!emailLead.email) {
                    alert('This lead does not have an email address.');
                    return;
                  }
                  const subject = encodeURIComponent(`Regarding your inquiry - CRM`);
                  const body = encodeURIComponent(
                    customEmailMessage || `Hello ${emailLead.name},\n\nThank you for connecting with us.`
                  );
                  window.location.href = `mailto:${emailLead.email}?subject=${subject}&body=${body}`;
                  setEmailLead(null);
                }}
                className="inline-flex items-center gap-1.5 px-6 py-2 bg-[#0b3b75] hover:bg-[#082b57] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* REMARKS HISTORY POPUP MODAL (Read more History) */}
      {/* ======================================================== */}
      {historyModalLead && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in max-h-[85vh] flex flex-col">
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

            {/* Scrollable list of all remarks */}
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
        </div>
        , document.body)}

      {/* ======================================================== */}
      {/* UPDATE LEAD MODAL (Matching Exact Reference SS 1 - SS 5) */}
      {/* ======================================================== */}
      {editingLeadId && editFormData && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Header: Royal Dark Blue Banner matching SS 1 */}
            <div className="bg-[#003884] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-bold tracking-tight">Update Lead</h3>
              <button
                type="button"
                onClick={() => setEditingLeadId(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Form Grid matching Add Lead fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Branch */}
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

                {/* Phone Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* First Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Middle Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Middle Name</label>
                  <input
                    type="text"
                    placeholder="Enter Middle Name"
                    value={editFormData.middle_name}
                    onChange={(e) => setEditFormData({ ...editFormData, middle_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    placeholder="Enter Last Name"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={editFormData.date_of_birth}
                    onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Lead Received On */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Lead Received On</label>
                  <select
                    value={editFormData.lead_received_on}
                    onChange={(e) => setEditFormData({ ...editFormData, lead_received_on: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Lead Received On</option>
                    {receivedChannels.map((ch: any) => (
                      <option key={ch.id} value={ch.name}>{ch.name}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Status */}
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

                {/* Lead From */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Lead From</label>
                  <select
                    value={editFormData.lead_from}
                    onChange={(e) => setEditFormData({ ...editFormData, lead_from: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Lead From</option>
                    {leadSources.map((ls: any) => (
                      <option key={ls.id} value={ls.name}>{ls.name}</option>
                    ))}
                  </select>
                </div>

                {/* Campaign */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Campaign</label>
                  <select
                    value={editFormData.campaign_id}
                    onChange={(e) => setEditFormData({ ...editFormData, campaign_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Campaign</option>
                    {campaigns.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Campaign Details */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Campaign Details</label>
                  <input
                    type="text"
                    placeholder="Enter Campaign details"
                    value={editFormData.campaign_details}
                    onChange={(e) => setEditFormData({ ...editFormData, campaign_details: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Refer */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Refer</label>
                  <input
                    type="text"
                    value={editFormData.refer_by}
                    onChange={(e) => setEditFormData({ ...editFormData, refer_by: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Dynamically Rendered Custom Fields from Database */}
                {customFields.map((field: any) => {
                  const opts: string[] = Array.isArray(field.options)
                    ? field.options
                    : typeof field.options === 'string'
                      ? field.options.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : [];
                  const val = editFormData.custom_data?.[field.name] ?? '';

                  return (
                    <div key={field.id || field.name} className={field.input_type === 'textarea' ? 'sm:col-span-2' : ''}>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        {field.label}
                        {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                      </label>
                      {field.input_type === 'text' && (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              custom_data: { ...editFormData.custom_data, [field.name]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      )}
                      {field.input_type === 'number' && (
                        <input
                          type="number"
                          value={val}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              custom_data: { ...editFormData.custom_data, [field.name]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      )}
                      {field.input_type === 'date' && (
                        <input
                          type="date"
                          value={val}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              custom_data: { ...editFormData.custom_data, [field.name]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      )}
                      {field.input_type === 'textarea' && (
                        <textarea
                          rows={2}
                          value={val}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              custom_data: { ...editFormData.custom_data, [field.name]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      )}
                      {field.input_type === 'select' && (
                        <select
                          value={val}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              custom_data: { ...editFormData.custom_data, [field.name]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                        >
                          <option value="">Select {field.label}</option>
                          {opts.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.input_type === 'radio' && (
                        <div className="flex items-center gap-4 pt-1">
                          {opts.map((opt: string) => (
                            <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
                              <input
                                type="radio"
                                name={`edit_custom_${field.name}`}
                                value={opt}
                                checked={val === opt}
                                onChange={() =>
                                  setEditFormData({
                                    ...editFormData,
                                    custom_data: { ...editFormData.custom_data, [field.name]: opt },
                                  })
                                }
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {field.input_type === 'checkbox' && (
                        opts.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-4 pt-1">
                            {opts.map((opt: string) => {
                              const isChecked = Array.isArray(val) ? val.includes(opt) : val === opt;
                              return (
                                <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const cur = Array.isArray(val) ? [...val] : val ? [val] : [];
                                      const next = e.target.checked ? [...cur, opt] : cur.filter((x: string) => x !== opt);
                                      setEditFormData({
                                        ...editFormData,
                                        custom_data: { ...editFormData.custom_data, [field.name]: next },
                                      });
                                    }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              checked={!!val}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  custom_data: { ...editFormData.custom_data, [field.name]: e.target.checked },
                                })
                              }
                            />
                            <span className="text-xs text-slate-700">{field.label}</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Remark Textarea (Spans 4 columns) */}
                <div className="lg:col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1.5">Remark</label>
                  <textarea
                    rows={3}
                    value={editFormData.remark}
                    onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Call Time Section matching SS 3 */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Call Time</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Next Followup Date</label>
                    <input
                      type="date"
                      value={editFormData.next_followup_date}
                      onChange={(e) => setEditFormData({ ...editFormData, next_followup_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">From</label>
                    <input
                      type="time"
                      value={editFormData.followup_time_from}
                      onChange={(e) => setEditFormData({ ...editFormData, followup_time_from: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">To</label>
                    <input
                      type="time"
                      value={editFormData.followup_time_to}
                      onChange={(e) => setEditFormData({ ...editFormData, followup_time_to: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Lead Assign</label>
                    <select
                      value={editFormData.assigned_to}
                      onChange={(e) => setEditFormData({ ...editFormData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
                    >
                      <option value="">Unassigned</option>
                      {counselors.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-4">
                    <label className="block font-semibold text-slate-700 mb-1.5">Lead FollowUp Remark</label>
                    <input
                      type="text"
                      placeholder="Enter Lead FollowUp Remark"
                      value={editFormData.followup_remark}
                      onChange={(e) => setEditFormData({ ...editFormData, followup_remark: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Lead History Table Section matching SS 3, SS 4, SS 5 */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Lead History</h4>

                {editLeadHistory.length > 0 ? (
                  <div className="space-y-4">
                    {editLeadHistory.map((item: any, idx: number) => {
                      const dataObj = typeof item.data === 'string' ? JSON.parse(item.data) : item.data || {};
                      return (
                        <div key={item.id || idx} className="space-y-2">
                          {/* Status Pill matching SS */}
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-white"></span>
                            <span className="px-3 py-1 bg-[#1e3a5f] text-white rounded font-bold text-[11px] uppercase tracking-wide">
                              {item.lead_status || 'STATUS'} / {formatDate(item.created_at)}
                            </span>
                          </div>

                          {/* Details Table */}
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
                                    <td className="px-4 py-2 font-semibold text-slate-900 whitespace-pre-line">{String(val || 'N/A')}</td>
                                    <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                                      {formatTime(item.created_at ? new Date(item.created_at).toTimeString().slice(0, 5) : '')}
                                    </td>
                                    <td className="px-4 py-2 font-medium text-slate-700">{item.updated_by_name || 'Burhan Ezzy'}</td>
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
                    No activity logs recorded yet. Updates will appear here.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer matching SS 5 */}
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
        </div>
        , document.body)}
      {uploadModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[9999] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Header: Royal Dark Blue Banner */}
            <div className="bg-[#003884] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <h3 className="text-base font-bold tracking-tight">Import Leads (CSV / Excel)</h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Info text */}
              <p className="text-xs text-slate-600">
                Upload your Excel (<span className="font-semibold text-slate-800">.xlsx, .xls</span>) or <span className="font-semibold text-slate-800">.csv</span> file. All column fields will be automatically imported without validation errors.
              </p>

              {/* Drag & Drop File Picker Box */}
              <div
                onClick={() => fileUploadRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/30"
              >
                <input
                  ref={fileUploadRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <svg className="w-10 h-10 mx-auto text-blue-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-xs font-bold text-slate-800">
                  {uploadFileName ? uploadFileName : 'Click to select CSV or Excel file'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Supports .csv, .xlsx, .xls
                </div>
              </div>

              {/* Error Alert */}
              {uploadFileError && (
                <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-lg border border-rose-200">
                  {uploadFileError}
                </div>
              )}

              {/* Parsed Count & Confirmation Notice */}
              {parsedLeads.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 space-y-1 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{parsedLeads.length} leads found in file!</span>
                  </div>
                  <p className="text-emerald-800 text-[11px]">
                    Are you sure you want to import all <span className="font-bold">{parsedLeads.length}</span> leads?
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedLeads.length === 0 || importMutation.isPending}
                onClick={() => importMutation.mutate(parsedLeads)}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#337ab7] hover:bg-[#286090] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>
                  {importMutation.isPending
                    ? 'Importing...'
                    : parsedLeads.length > 0
                      ? `Import All ${parsedLeads.length} Leads`
                      : 'Import Leads'}
                </span>
              </button>
            </div>
          </div>
        </div>
        , document.body)}
    </CrmLayout>
  );
};

export default AllLeadsPage;
