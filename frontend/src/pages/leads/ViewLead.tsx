import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

const ViewLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => {
      const res = await api.get(`/leads/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  const { data: optionsData } = useQuery({
    queryKey: ['lead-form-options'],
    queryFn: async () => {
      const res = await api.get('/leads/options');
      return res.data?.data;
    },
  });

  const customFields: any[] = optionsData?.customFields || [];

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

  if (isLoading) {
    return (
      <CrmLayout>
        <div className="p-12 text-center text-xs font-semibold text-slate-500 bg-white rounded-xl border border-slate-200">
          Loading lead details...
        </div>
      </CrmLayout>
    );
  }

  if (error || !lead) {
    const errorMsg = (error as any)?.response?.data?.message || 'Lead not found';
    return (
      <CrmLayout>
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800">{errorMsg}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The requested lead could not be loaded. Please ensure the lead exists and you have permission to view it.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/crm/all-leads')}
              className="px-4 py-2 bg-[#0b3b75] hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Back to Leads
            </button>
          </div>
        </div>
      </CrmLayout>
    );
  }

  const customData = lead.custom_data || {};

  return (
    <CrmLayout>
      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-end">
          <button
            onClick={() => navigate('/crm/all-leads')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            ← Back to Leads
          </button>
        </div>

        {/* Clean Container Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs space-y-6">
          {/* Top Profile Banner with Photo & Status */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-400/60 shadow-md flex-shrink-0 bg-slate-50 flex items-center justify-center">
              {lead.photo_url ? (
                <img src={lead.photo_url} alt={lead.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center">
                  {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{lead.name}</h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs"
                  style={{ backgroundColor: lead.status_color || '#3b82f6' }}
                >
                  {lead.status_name || 'NEW'}
                </span>
                {lead.lead_number && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    #{lead.lead_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {lead.phone} {lead.email ? `• ${lead.email}` : ''} {lead.city ? `• ${lead.city}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {/* Left Column: User Details: */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 pb-3 mb-4 border-b border-slate-100 uppercase tracking-wide">
                User Details:
              </h2>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Branch</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.branch_name || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Phone Number</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium font-mono">{lead.phone || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">First Name</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.first_name || lead.name || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Middle Name</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.middle_name || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Last Name</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.last_name || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Email</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.email || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Gender</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.gender || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Date Of Birth</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">
                    {lead.date_of_birth ? formatDate(lead.date_of_birth) : 'N/A'}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">City</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.city || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Lead Received On</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">
                    {lead.lead_received_on ? formatDate(lead.lead_received_on) : 'N/A'}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Lead Status</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 font-bold uppercase text-blue-600">
                    {lead.status_name || 'NEW'}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Lead From</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.lead_from || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Campaign</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.campaign_name || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Remark</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium whitespace-pre-line">{lead.remark || 'N/A'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Refer</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{lead.refer_by || 'N/A'}</span>
                </div>

                {/* Dynamically Rendered Custom Fields direct from Database */}
                {customFields.map((f: any) => {
                  const val = customData[f.name];
                  if (val === undefined || val === null || val === '') return null;
                  const displayVal = Array.isArray(val)
                    ? val.join(', ')
                    : typeof val === 'boolean'
                    ? (val ? 'Yes' : 'No')
                    : f.input_type === 'date'
                    ? formatDate(val)
                    : String(val);
                  return (
                    <div key={f.id || f.name} className="flex items-start">
                      <span className="w-40 font-bold text-slate-800">{f.label}</span>
                      <span className="w-6 text-slate-400 font-bold">:</span>
                      <span className="flex-1 text-slate-700 font-medium">{displayVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Call Time: */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 pb-3 mb-4 border-b border-slate-100 uppercase tracking-wide">
                Call Time:
              </h2>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Next Follow-Up Date</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">
                    {lead.next_followup_date ? formatDate(lead.next_followup_date) : 'N/A'}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Call Time From</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{formatTime(lead.followup_time_from)}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Call Time To</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">{formatTime(lead.followup_time_to)}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Lead Assigned (Counselor)</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-semibold">{lead.assigned_to_name || 'Unassigned'}</span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Photo</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <div className="flex-1">
                    {lead.photo_url ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-200 shadow-xs">
                        <img src={lead.photo_url} alt={lead.name} className="w-full h-full object-cover rounded-full" />
                      </div>
                    ) : (
                      <span className="text-slate-500 font-normal">No photo uploaded</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Lead Follow-Up Remark</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium whitespace-pre-line">
                    {lead.followup_remark || lead.remark || 'N/A'}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="w-40 font-bold text-slate-800">Lead Created At</span>
                  <span className="w-6 text-slate-400 font-bold">:</span>
                  <span className="flex-1 text-slate-700 font-medium">
                    {formatDate(lead.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default ViewLeadPage;
