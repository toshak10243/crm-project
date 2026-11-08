import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface WaDaddyPageProps {
  view: 'contacts' | 'campaigns' | 'templates' | 'chat';
}

const WaDaddyPage: React.FC<WaDaddyPageProps> = ({ view }) => {
  const queryClient = useQueryClient();

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page] = useState(1);

  // Tabs for subviews
  const [activeSubTab, setActiveSubTab] = useState<'contacts' | 'groups'>('contacts');
  const [templateStatusFilter, setTemplateStatusFilter] = useState<'Approved' | 'Pending' | 'Rejected'>('Approved');

  // Chat selected contact
  const [selectedChatContactId, setSelectedChatContactId] = useState<string>('');
  const [chatInputText, setChatInputText] = useState<string>('');

  // 1. DATA QUERIES
  // Contacts
  const { data: contactsData } = useQuery({
    queryKey: ['wa-contacts', page, rowsPerPage, search],
    queryFn: async () => {
      const res = await api.get('/wadaddy/contacts', {
        params: { page, limit: rowsPerPage, search: search.trim() || undefined },
      });
      return res.data?.data;
    },
    enabled: view === 'contacts',
  });

  // Campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ['wa-campaigns', page, rowsPerPage, search],
    queryFn: async () => {
      const res = await api.get('/wadaddy/campaigns', {
        params: { page, limit: rowsPerPage, search: search.trim() || undefined },
      });
      return res.data?.data;
    },
    enabled: view === 'campaigns',
  });

  // Templates (5 templates from DB)
  const { data: templatesData } = useQuery({
    queryKey: ['wa-templates', templateStatusFilter],
    queryFn: async () => {
      const res = await api.get('/wadaddy/templates', {
        params: { status: templateStatusFilter },
      });
      return res.data?.data;
    },
    enabled: view === 'templates',
  });

  // Chat Threads
  const { data: chatThreadsData } = useQuery({
    queryKey: ['wa-chat-threads'],
    queryFn: async () => {
      const res = await api.get('/wadaddy/chats');
      return res.data?.data;
    },
    enabled: view === 'chat',
  });

  // Active Chat Messages
  const { data: chatMessagesData } = useQuery({
    queryKey: ['wa-chat-messages', selectedChatContactId],
    queryFn: async () => {
      if (!selectedChatContactId) return [];
      const res = await api.get(`/wadaddy/chats/${selectedChatContactId}/messages`);
      return res.data?.data;
    },
    enabled: view === 'chat' && !!selectedChatContactId,
    refetchInterval: 3000, // Poll active chat every 3s
  });

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return await api.post(`/wadaddy/chats/${selectedChatContactId}/messages`, { text, sender: 'agent' });
    },
    onSuccess: () => {
      setChatInputText('');
      queryClient.invalidateQueries({ queryKey: ['wa-chat-messages', selectedChatContactId] });
      queryClient.invalidateQueries({ queryKey: ['wa-chat-threads'] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || !selectedChatContactId) return;
    sendMessageMutation.mutate(chatInputText.trim());
  };

  const contactsList = contactsData?.contacts || [];
  const campaignsList = campaignsData?.campaigns || [];
  const templatesList: any[] = templatesData || [];
  const chatThreads: any[] = chatThreadsData || [];
  const activeMessages: any[] = chatMessagesData || [];

  // Auto select first chat contact if not selected
  React.useEffect(() => {
    if (view === 'chat' && chatThreads.length > 0 && !selectedChatContactId) {
      setSelectedChatContactId(chatThreads[0].contact_id);
    }
  }, [view, chatThreads, selectedChatContactId]);

  const activeContact = chatThreads.find((c) => c.contact_id === selectedChatContactId);

  return (
    <CrmLayout>
      <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-20">
        <div className="w-full px-6 py-4 space-y-5">
          {/* ======================================================== */}
          {/* VIEW 1: CONTACTS (Screenshot 1 Matching)                 */}
          {/* ======================================================== */}
          {view === 'contacts' && (
            <div className="space-y-4">
              {/* Header Title & Top Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contacts</h1>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#002860] hover:bg-[#001d47] transition rounded shadow-2xs cursor-pointer"
                  >
                    Add Bulk Contact
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition rounded shadow-2xs cursor-pointer"
                  >
                    Export Contacts
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] transition rounded shadow-2xs cursor-pointer"
                  >
                    + Add Contact
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-2">
                <a href="#download" className="text-xs text-blue-600 hover:underline">
                  Download Sample File
                </a>
              </div>

              {/* Subtabs: Contacts | Groups */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setActiveSubTab('contacts')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${
                    activeSubTab === 'contacts' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Contacts
                </button>
                <button
                  onClick={() => setActiveSubTab('groups')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${
                    activeSubTab === 'groups' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Groups
                </button>
              </div>

              {/* Search, Rows & Total Count Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search here..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-[#003884]"
                  />
                </div>

                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                </select>

                <div className="text-xs font-semibold text-slate-600">
                  Total Records : <span className="font-bold text-slate-900">{contactsData?.total || contactsList.length}</span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">
                        <input type="checkbox" className="rounded border-slate-300" />
                      </th>
                      <th className="py-3 px-6">FULL NAME</th>
                      <th className="py-3 px-6">PHONE</th>
                      <th className="py-3 px-6">EMAIL</th>
                      <th className="py-3 px-6">CREATED BY</th>
                      <th className="py-3 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {contactsList.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          <input type="checkbox" className="rounded border-slate-300" />
                        </td>
                        <td className="py-3.5 px-6 font-bold text-slate-900">{c.full_name}</td>
                        <td className="py-3.5 px-6 font-mono text-slate-600 text-xs">{c.phone}</td>
                        <td className="py-3.5 px-6 text-slate-600 text-xs">{c.email || '-'}</td>
                        <td className="py-3.5 px-6 text-slate-500 text-xs">CRM System</td>
                        <td className="py-3.5 px-6 text-right text-slate-500">
                          <button className="p-1 hover:text-slate-900 cursor-pointer">⋮</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: CAMPAIGNS (Screenshot 2 Matching)                */}
          {/* ======================================================== */}
          {view === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h1>
                <button
                  type="button"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] transition rounded shadow-2xs cursor-pointer"
                >
                  + Create New Campaign
                </button>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">CAMPAIGN NAME</th>
                      <th className="py-3 px-6">CREATED DATE</th>
                      <th className="py-3 px-6">STATUS</th>
                      <th className="py-3 px-6">CONTACTS</th>
                      <th className="py-3 px-6">CREATED BY</th>
                      <th className="py-3 px-6">SENT</th>
                      <th className="py-3 px-6">FAILED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {campaignsList.map((cmp: any) => (
                      <tr key={cmp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-900">{cmp.campaign_name}</td>
                        <td className="py-3.5 px-6 text-slate-500 text-xs">
                          {new Date(cmp.created_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {cmp.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-700 text-xs font-medium">
                          👥 {cmp.contacts_count}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 text-xs">{cmp.created_by_name || 'CRM System'}</td>
                        <td className="py-3.5 px-6 text-emerald-600 text-xs font-medium">
                          ↗ {cmp.sent_count || 0} Sent ↓
                        </td>
                        <td className="py-3.5 px-6 text-rose-600 text-xs font-medium">
                          ⚠ {cmp.failed_count || 0} Failed ↓
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: TEMPLATES (Screenshot 3 Matching - 5 Templates)  */}
          {/* ======================================================== */}
          {view === 'templates' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Templates</h1>
                <div className="text-xs font-bold text-slate-700">
                  Total Records : <span className="font-extrabold text-slate-900">{templatesList.length}</span>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemplateStatusFilter('Approved')}
                  className={`px-4 py-2 text-xs font-bold rounded transition cursor-pointer ${
                    templateStatusFilter === 'Approved' ? 'bg-[#003884] text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Approved Templates
                </button>
                <button
                  onClick={() => setTemplateStatusFilter('Pending')}
                  className={`px-4 py-2 text-xs font-bold rounded transition cursor-pointer ${
                    templateStatusFilter === 'Pending' ? 'bg-[#003884] text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Pending Approval Templates
                </button>
                <button
                  onClick={() => setTemplateStatusFilter('Rejected')}
                  className={`px-4 py-2 text-xs font-bold rounded transition cursor-pointer ${
                    templateStatusFilter === 'Rejected' ? 'bg-[#003884] text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Rejected Templates
                </button>
              </div>

              {/* Template Cards Grid (Screenshot 3 Matching Exact Look) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                {templatesList.map((tmpl: any) => (
                  <div
                    key={tmpl.id}
                    className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Name Header */}
                      <div className="p-3.5 border-b border-slate-100 font-bold text-xs text-slate-900">
                        Name: <span className="font-semibold text-slate-700">{tmpl.name}</span>
                      </div>

                      {/* Header visual banner matching screenshot */}
                      {tmpl.header_type === 'IMAGE' && (
                        <div className="h-28 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white px-4 text-center">
                          <div>
                            <div className="text-sm font-black tracking-tight uppercase">CRM CLOUD</div>
                            <div className="text-[10px] text-blue-100 mt-0.5">Automate operations & grow your business</div>
                          </div>
                        </div>
                      )}

                      {/* Body Content */}
                      <div className="p-4 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans max-h-64 overflow-y-auto">
                        {tmpl.body}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Status: <strong className="text-emerald-700">{tmpl.status}</strong></span>
                      <span className="uppercase text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {tmpl.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4 & 5: CHAT INTERFACE (Screenshot 4 & 5 Matching)   */}
          {/* ======================================================== */}
          {view === 'chat' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chat</h1>

              <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex h-[580px]">
                {/* Left Sidebar: Chats List */}
                <div className="w-80 border-r border-slate-200 flex flex-col flex-shrink-0">
                  <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
                    Chats ({chatThreads.length})
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {chatThreads.map((contact) => {
                      const isSelected = contact.contact_id === selectedChatContactId;
                      const initial = contact.full_name?.charAt(0).toUpperCase() || 'U';
                      return (
                        <div
                          key={contact.contact_id}
                          onClick={() => setSelectedChatContactId(contact.contact_id)}
                          className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                            isSelected ? 'bg-blue-50/80 border-l-4 border-[#003884]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {contact.full_name}
                              </h4>
                              <span className="text-[10px] text-slate-400">
                                {contact.last_message_time ? new Date(contact.last_message_time).toLocaleDateString('en-GB') : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{contact.phone}</p>
                            {contact.last_message && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{contact.last_message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Area: Conversation & Messaging Area */}
                <div className="flex-1 flex flex-col bg-slate-50/50">
                  {activeContact ? (
                    <>
                      {/* Active Contact Header (Screenshot 5 Match) */}
                      <div className="p-3.5 bg-white border-b border-slate-200 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                          {activeContact.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{activeContact.full_name}</h3>
                          <p className="text-[11px] text-slate-500 font-mono">{activeContact.phone}</p>
                        </div>
                      </div>

                      {/* Chat Messages Bubbles Stream (Screenshot 5 Match) */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-3">
                        {activeMessages.map((msg: any) => {
                          const isAgent = msg.sender === 'agent';
                          const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          });
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`px-4 py-2 rounded-lg text-xs max-w-sm leading-relaxed shadow-2xs ${
                                  isAgent
                                    ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                }`}
                              >
                                <div>{msg.text}</div>
                                <div className="text-[9px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                                  <span>{time}</span>
                                  {isAgent && <span className="text-blue-500">✓</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer Message Input Box */}
                      <div className="p-3 bg-white border-t border-slate-200">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Type a message..."
                            value={chatInputText}
                            onChange={(e) => setChatInputText(e.target.value)}
                            className="flex-1 px-4 py-2 text-xs bg-slate-100 hover:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                          />
                          <button
                            type="submit"
                            disabled={!chatInputText.trim() || sendMessageMutation.isPending}
                            className="px-4 py-2 bg-[#003884] hover:bg-[#002860] text-white rounded-lg transition disabled:opacity-40 cursor-pointer"
                          >
                            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                          </button>
                        </form>
                        <div className="text-[10px] text-slate-400 text-center mt-2">
                          Your free 24-hour window is over. <span className="text-emerald-600 font-semibold cursor-pointer">WhatsApp via your own personal number.</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                      Select a contact to start chatting
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CrmLayout>
  );
};

export default WaDaddyPage;
