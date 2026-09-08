import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  Mail, MessageSquare, KeyRound, Settings,
  Edit2, Save, X, CheckCircle2, XCircle,
  Copy, ExternalLink, ChevronDown, ChevronUp,
  Eye, EyeOff, Plus, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';

type SettingsTab = 'email' | 'whatsapp' | 'password' | 'system';

const SuperAdminSettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>('email');

  // Template states
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', body: '' });
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Add template states
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    key: '', name: '', subject: '', body: '', description: '', variables: '',
  });
  const [addError, setAddError] = useState('');

  // Password states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // System settings states
  const [editingSettingKey, setEditingSettingKey] = useState<string | null>(null);
  const [settingEditValue, setSettingEditValue] = useState('');
  const [showAddSetting, setShowAddSetting] = useState(false);
  const [addSettingForm, setAddSettingForm] = useState({ key: '', value: '', label: '', description: '', type: 'text' });
  const [addSettingError, setAddSettingError] = useState('');
  const [deletingSettingKey, setDeletingSettingKey] = useState<string | null>(null);

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  // Email Templates
  const { data: emailTemplates, isLoading: emailLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await api.get('/super-admin/email-templates');
      return res.data.data;
    },
    enabled: activeTab === 'email',
  });

  // WhatsApp Templates
  const { data: waTemplates, isLoading: waLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const res = await api.get('/super-admin/whatsapp-templates');
      return res.data.data;
    },
    enabled: activeTab === 'whatsapp',
  });

  // System Settings
  const { data: systemSettings, isLoading: systemLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await api.get('/super-admin/system-settings');
      return res.data.data;
    },
    enabled: activeTab === 'system',
  });

  // Update Email Template
  const updateEmailMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: { subject: string; body: string } }) => {
      const res = await api.patch(`/super-admin/email-templates/${key}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setEditingKey(null); setEditError('');
      setEditSuccess('Email template updated!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
    onError: (err: any) => setEditError(err.response?.data?.message || 'Failed to update'),
  });

  // Update WhatsApp Template
  const updateWaMutation = useMutation({
    mutationFn: async ({ key, body }: { key: string; body: string }) => {
      const res = await api.patch(`/super-admin/whatsapp-templates/${key}`, { body });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      setEditingKey(null); setEditError('');
      setEditSuccess('WhatsApp template updated!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
    onError: (err: any) => setEditError(err.response?.data?.message || 'Failed to update'),
  });

  // Create Email Template
  const createEmailMutation = useMutation({
    mutationFn: async () => {
      const variables = addForm.variables.split(',').map(v => v.trim()).filter(Boolean);
      const res = await api.post('/super-admin/email-templates', {
        key: addForm.key, name: addForm.name, subject: addForm.subject,
        body: addForm.body, description: addForm.description, variables,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setShowAddForm(false);
      setAddForm({ key: '', name: '', subject: '', body: '', description: '', variables: '' });
      setAddError('');
      setEditSuccess('Email template created!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
    onError: (err: any) => setAddError(err.response?.data?.message || 'Failed to create'),
  });

  // Create WhatsApp Template
  const createWaMutation = useMutation({
    mutationFn: async () => {
      const variables = addForm.variables.split(',').map(v => v.trim()).filter(Boolean);
      const res = await api.post('/super-admin/whatsapp-templates', {
        key: addForm.key, name: addForm.name, body: addForm.body,
        description: addForm.description, variables,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      setShowAddForm(false);
      setAddForm({ key: '', name: '', subject: '', body: '', description: '', variables: '' });
      setAddError('');
      setEditSuccess('WhatsApp template created!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
    onError: (err: any) => setAddError(err.response?.data?.message || 'Failed to create'),
  });

  // Delete Email Template
  const deleteEmailMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await api.delete(`/super-admin/email-templates/${key}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setDeletingKey(null);
      setEditSuccess('Template deleted!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
  });

  // Delete WhatsApp Template
  const deleteWaMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await api.delete(`/super-admin/whatsapp-templates/${key}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      setDeletingKey(null);
      setEditSuccess('Template deleted!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
  });

  // Update System Setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await api.patch(`/super-admin/system-settings/${key}`, { value });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setEditingSettingKey(null);
      setEditSuccess('Setting updated!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
    onError: (err: any) => setEditError(err.response?.data?.message || 'Failed to update'),
  });

  // Create System Setting
  const createSettingMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super-admin/system-settings', addSettingForm);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setShowAddSetting(false);
      setAddSettingForm({ key: '', value: '', label: '', description: '', type: 'text' });
      setAddSettingError('');
      setEditSuccess('Setting created!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
    onError: (err: any) => setAddSettingError(err.response?.data?.message || 'Failed to create'),
  });

  // Delete System Setting
  const deleteSettingMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await api.delete(`/super-admin/system-settings/${key}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setDeletingSettingKey(null);
      setEditSuccess('Setting deleted!');
      setTimeout(() => setEditSuccess(''), 3000);
    },
  });

  // Change Password
  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/change-password', passwordForm);
      return res.data;
    },
    onSuccess: () => {
      setPasswordSuccess('Password changed! Logging out...');
      setTimeout(() => { logout(); navigate('/super-admin/login'); }, 2000);
    },
    onError: (err: any) => setPasswordError(err.response?.data?.message || 'Failed to change password'),
  });

  const passwordChecks = [
    { label: 'At least 8 characters', valid: passwordForm.newPassword.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(passwordForm.newPassword) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(passwordForm.newPassword) },
    { label: 'One number', valid: /\d/.test(passwordForm.newPassword) },
    { label: 'One special character', valid: /[@$!%*?&]/.test(passwordForm.newPassword) },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tabs = [
    { key: 'email', label: 'Email Templates', icon: Mail },
    { key: 'whatsapp', label: 'WhatsApp Templates', icon: MessageSquare },
    { key: 'system', label: 'System Settings', icon: Settings },
    { key: 'password', label: 'Change Password', icon: KeyRound },
  ];

  const TemplateHeader = ({ template, isEmail }: { template: any; isEmail: boolean }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 ${isEmail ? 'bg-blue-50' : 'bg-green-50'} rounded-lg flex items-center justify-center`}>
          {isEmail ? <Mail className="w-4 h-4 text-blue-600" /> : <MessageSquare className="w-4 h-4 text-green-600" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{template.name}</p>
          <p className="text-xs text-slate-400">{template.description || template.key}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setExpandedKey(expandedKey === template.key ? null : template.key)}
          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
          {expandedKey === template.key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {editingKey === template.key ? (
          <button onClick={() => { setEditingKey(null); setEditError(''); }}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        ) : (
          <button onClick={() => {
            setEditingKey(template.key);
            setEditForm({ subject: template.subject || '', body: template.body || '' });
            setEditError(''); setExpandedKey(template.key);
          }} className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            isEmail ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
          }`}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {deletingKey === template.key ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-600 font-medium">Sure?</span>
            <button onClick={() => isEmail ? deleteEmailMutation.mutate(template.key) : deleteWaMutation.mutate(template.key)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-red-600 text-white rounded-lg">Yes</button>
            <button onClick={() => setDeletingKey(null)} className="text-xs font-medium px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-500">No</button>
          </div>
        ) : (
          <button onClick={() => setDeletingKey(template.key)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>
      <div className="mb-7">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage templates, system settings and password</p>
      </div>

      {editSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {editSuccess}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {tabs.map((tab) => (
              <button key={tab.key}
                onClick={() => { setActiveTab(tab.key as SettingsTab); setEditingKey(null); setShowAddForm(false); setEditError(''); setAddError(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all border-b border-slate-100 last:border-0 ${
                  activeTab === tab.key ? 'bg-blue-50 text-blue-700 border-l-2 border-l-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ======= EMAIL TEMPLATES ======= */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Email Templates</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Edit subject and body of each template</p>
                </div>
                <button onClick={() => { setShowAddForm(!showAddForm); setAddError(''); setAddForm({ key: '', name: '', subject: '', body: '', description: '', variables: '' }); }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Add Template
                </button>
              </div>

              {showAddForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-blue-900">New Email Template</h3>
                  {addError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{addError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Key *</label>
                      <input type="text" placeholder="e.g. payment_reminder" value={addForm.key}
                        onChange={(e) => setAddForm({ ...addForm, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Name *</label>
                      <input type="text" placeholder="e.g. Payment Reminder" value={addForm.name}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Subject *</label>
                    <input type="text" placeholder="Email subject with {{variables}}" value={addForm.subject}
                      onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
                    <input type="text" placeholder="When is this email sent?" value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Variables (comma separated)</label>
                    <input type="text" placeholder="{{admin_name}}, {{company_name}}" value={addForm.variables}
                      onChange={(e) => setAddForm({ ...addForm, variables: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Body (HTML)</label>
                    <textarea rows={8} placeholder="<p>Hello {{admin_name}},</p>..." value={addForm.body}
                      onChange={(e) => setAddForm({ ...addForm, body: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => createEmailMutation.mutate()}
                      disabled={createEmailMutation.isPending || !addForm.key || !addForm.name || !addForm.subject}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                      {createEmailMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><Save className="w-4 h-4" /> Create</>}
                    </button>
                    <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                  </div>
                </div>
              )}

              {emailLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading templates...</p>
                </div>
              ) : (emailTemplates || []).map((template: any) => (
                <div key={template.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <TemplateHeader template={template} isEmail={true} />
                  {template.variables?.length > 0 && (
                    <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1.5">
                      {template.variables.map((v: string) => (
                        <span key={v} className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-mono">{v}</span>
                      ))}
                    </div>
                  )}
                  {expandedKey === template.key && (
                    <div className="p-5 space-y-4">
                      {editError && editingKey === template.key && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{editError}</div>}
                      {editingKey === template.key ? (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Subject</label>
                            <input type="text" value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Body (HTML)</label>
                            <textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows={10}
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y" />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => updateEmailMutation.mutate({ key: template.key, data: editForm })} disabled={updateEmailMutation.isPending}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                              {updateEmailMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Subject</p>
                            <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{template.subject}</p>
                          </div>
                          {template.body && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Body</p>
                              <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{template.body}</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ======= WHATSAPP TEMPLATES ======= */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">WhatsApp Templates</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Copy message or open WhatsApp directly</p>
                </div>
                <button onClick={() => { setShowAddForm(!showAddForm); setAddError(''); setAddForm({ key: '', name: '', subject: '', body: '', description: '', variables: '' }); }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Add Template
                </button>
              </div>

              {showAddForm && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-green-900">New WhatsApp Template</h3>
                  {addError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{addError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Key *</label>
                      <input type="text" placeholder="e.g. wa_payment_reminder" value={addForm.key}
                        onChange={(e) => setAddForm({ ...addForm, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Name *</label>
                      <input type="text" placeholder="e.g. Payment Reminder" value={addForm.name}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
                    <input type="text" placeholder="When is this sent?" value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Variables (comma separated)</label>
                    <input type="text" placeholder="{{admin_name}}, {{company_name}}" value={addForm.variables}
                      onChange={(e) => setAddForm({ ...addForm, variables: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Message Body *</label>
                    <textarea rows={8} placeholder="Hello {{admin_name}},..." value={addForm.body}
                      onChange={(e) => setAddForm({ ...addForm, body: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => createWaMutation.mutate()}
                      disabled={createWaMutation.isPending || !addForm.key || !addForm.name || !addForm.body}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                      {createWaMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><Save className="w-4 h-4" /> Create</>}
                    </button>
                    <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                  </div>
                </div>
              )}

              {waLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading templates...</p>
                </div>
              ) : (waTemplates || []).map((template: any) => (
                <div key={template.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <TemplateHeader template={template} isEmail={false} />
                  {template.variables?.length > 0 && (
                    <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1.5">
                      {template.variables.map((v: string) => (
                        <span key={v} className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-mono">{v}</span>
                      ))}
                    </div>
                  )}
                  {expandedKey === template.key && (
                    <div className="p-5 space-y-4">
                      {editError && editingKey === template.key && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{editError}</div>}
                      {editingKey === template.key ? (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Message Body</label>
                            <textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows={10}
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white resize-y" />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => updateWaMutation.mutate({ key: template.key, body: editForm.body })} disabled={updateWaMutation.isPending}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                              {updateWaMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Message Preview</p>
                            <div className="bg-[#dcf8c6] border border-green-200 rounded-xl p-4 font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                              {template.body}
                            </div>
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            <button onClick={() => handleCopy(template.body, template.key)}
                              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border transition-colors ${copiedKey === template.key ? 'bg-green-600 text-white border-green-600' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}>
                              {copiedKey === template.key ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Message</>}
                            </button>
                            <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(template.body)}`, '_blank')}
                              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">
                              <ExternalLink className="w-4 h-4" /> Open WhatsApp
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ======= SYSTEM SETTINGS ======= */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">System Settings</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Platform-wide configuration</p>
                </div>
                <button onClick={() => { setShowAddSetting(!showAddSetting); setAddSettingError(''); setAddSettingForm({ key: '', value: '', label: '', description: '', type: 'text' }); }}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Add Setting
                </button>
              </div>

              {/* Add Setting Form */}
              {showAddSetting && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900">New Setting</h3>
                  {addSettingError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{addSettingError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Key *</label>
                      <input type="text" placeholder="e.g. max_users" value={addSettingForm.key}
                        onChange={(e) => setAddSettingForm({ ...addSettingForm, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Label *</label>
                      <input type="text" placeholder="e.g. Max Users" value={addSettingForm.label}
                        onChange={(e) => setAddSettingForm({ ...addSettingForm, label: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Value *</label>
                      <input type="text" placeholder="e.g. 50" value={addSettingForm.value}
                        onChange={(e) => setAddSettingForm({ ...addSettingForm, value: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Type</label>
                      <select value={addSettingForm.type} onChange={(e) => setAddSettingForm({ ...addSettingForm, type: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean (true/false)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
                    <input type="text" placeholder="What does this setting do?" value={addSettingForm.description}
                      onChange={(e) => setAddSettingForm({ ...addSettingForm, description: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => createSettingMutation.mutate()}
                      disabled={createSettingMutation.isPending || !addSettingForm.key || !addSettingForm.label || !addSettingForm.value}
                      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                      {createSettingMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><Save className="w-4 h-4" /> Create</>}
                    </button>
                    <button onClick={() => setShowAddSetting(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                  </div>
                </div>
              )}

              {systemLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading settings...</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%]">Setting</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[35%]">Description</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%]">Value</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(systemSettings || []).map((setting: any) => (
                        <tr key={setting.key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900 text-sm">{setting.label}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{setting.key}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-500">{setting.description || '—'}</p>
                          </td>
                          <td className="px-5 py-4">
                            {editingSettingKey === setting.key ? (
                              <div className="flex items-center gap-2">
                                {setting.type === 'boolean' ? (
                                  <select value={settingEditValue} onChange={(e) => setSettingEditValue(e.target.value)}
                                    className="px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                  </select>
                                ) : (
                                  <input type={setting.type === 'number' ? 'number' : 'text'}
                                    value={settingEditValue}
                                    onChange={(e) => setSettingEditValue(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                )}
                              </div>
                            ) : (
                              <div>
                                {setting.type === 'boolean' ? (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${setting.value === 'true' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                    {setting.value === 'true'
                                      ? <><ToggleRight className="w-3.5 h-3.5" /> Enabled</>
                                      : <><ToggleLeft className="w-3.5 h-3.5" /> Disabled</>
                                    }
                                  </span>
                                ) : (
                                  <span className="font-semibold text-slate-900">{setting.value}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {editingSettingKey === setting.key ? (
                                <>
                                  <button onClick={() => updateSettingMutation.mutate({ key: setting.key, value: settingEditValue })}
                                    disabled={updateSettingMutation.isPending}
                                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
                                    {updateSettingMutation.isPending ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save
                                  </button>
                                  <button onClick={() => setEditingSettingKey(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingSettingKey(setting.key); setSettingEditValue(setting.value); }}
                                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg">
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  {deletingSettingKey === setting.key ? (
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => deleteSettingMutation.mutate(setting.key)}
                                        className="text-xs font-semibold px-2 py-1.5 bg-red-600 text-white rounded-lg">Yes</button>
                                      <button onClick={() => setDeletingSettingKey(null)}
                                        className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg text-slate-500">No</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeletingSettingKey(setting.key)}
                                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======= CHANGE PASSWORD ======= */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-400 mt-0.5">Update your Super Admin password</p>
              </div>
              <div className="p-6 max-w-md space-y-5">
                {passwordSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> {passwordError}
                  </div>
                )}
                {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => {
                  const labels: Record<string, string> = { currentPassword: 'Current Password', newPassword: 'New Password', confirmPassword: 'Confirm New Password' };
                  const showKey = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm';
                  return (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{labels[field]}</label>
                      <div className="relative">
                        <input type={showPass[showKey as keyof typeof showPass] ? 'text' : 'password'}
                          value={passwordForm[field as keyof typeof passwordForm]}
                          onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                          placeholder={`Enter ${labels[field].toLowerCase()}`}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white pr-11" />
                        <button type="button"
                          onClick={() => setShowPass({ ...showPass, [showKey]: !showPass[showKey as keyof typeof showPass] })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPass[showKey as keyof typeof showPass] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {field === 'newPassword' && passwordForm.newPassword && (
                        <div className="mt-2 space-y-1">
                          {passwordChecks.map((check) => (
                            <div key={check.label} className="flex items-center gap-2">
                              {check.valid ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                              <p className={`text-xs ${check.valid ? 'text-green-600' : 'text-slate-400'}`}>{check.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {field === 'confirmPassword' && passwordForm.confirmPassword && (
                        <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${passwordForm.newPassword === passwordForm.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordForm.newPassword === passwordForm.confirmPassword
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                            : <><XCircle className="w-3.5 h-3.5" /> Passwords do not match</>}
                        </p>
                      )}
                    </div>
                  );
                })}
                <button onClick={() => { setPasswordError(''); passwordMutation.mutate(); }}
                  disabled={passwordMutation.isPending || !passwordForm.currentPassword || !passwordChecks.every(c => c.valid) || passwordForm.newPassword !== passwordForm.confirmPassword}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
                  {passwordMutation.isPending
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</>
                    : <><KeyRound className="w-4 h-4" /> Update Password</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminSettings;