import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface ExtraAdminItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at?: string;
}

const MasterAdminsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  // Modal State: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [activeAdmin, setActiveAdmin] = useState<ExtraAdminItem | null>(null);

  // Form Fields matching screenshot 2
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');

  // Notification / Alert
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 1. Fetch Extra Admins dynamically from DB
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['extra-admins', page, search],
    queryFn: async () => {
      const params: any = {
        page,
        limit: rowsPerPage,
        role: 'extra_admin',
      };
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/users', { params });
      return res.data;
    },
  });

  const adminsList: ExtraAdminItem[] = usersData?.data || [];
  const totalRecords: number = usersData?.meta?.total ?? adminsList.length;

  // Helper alert auto-dismiss
  const triggerAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setActiveAdmin(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setModalMode('add');
  };

  // Open Edit Modal
  const handleOpenEdit = (admin: ExtraAdminItem) => {
    setActiveAdmin(admin);
    setFormName(admin.name || '');
    setFormEmail(admin.email || '');
    setFormPhone(admin.phone || '');
    setFormPassword(''); // blank unless updating
    setModalMode('edit');
  };

  // Close Modal
  const handleCloseModal = () => {
    setModalMode(null);
    setActiveAdmin(null);
  };

  // 2. Create Extra Admin Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-admins'] });
      triggerAlert('Extra Admin added successfully!');
      handleCloseModal();
    },
    onError: (err: any) => {
      triggerAlert(err?.response?.data?.message || 'Failed to add Extra Admin', 'error');
    },
  });

  // 3. Update Extra Admin Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.patch(`/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-admins'] });
      triggerAlert('Extra Admin updated successfully!');
      handleCloseModal();
    },
    onError: (err: any) => {
      triggerAlert(err?.response?.data?.message || 'Failed to update Extra Admin', 'error');
    },
  });

  // 4. Delete Extra Admin Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-admins'] });
      triggerAlert('Extra Admin deleted successfully!');
    },
    onError: (err: any) => {
      triggerAlert(err?.response?.data?.message || 'Failed to delete Extra Admin', 'error');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      triggerAlert('Name and Email are required', 'error');
      return;
    }

    if (modalMode === 'add') {
      createMutation.mutate({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        role: 'extra_admin',
        password: formPassword.trim() || 'Admin@12345',
      });
    } else if (modalMode === 'edit' && activeAdmin) {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        role: 'extra_admin',
      };
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }
      updateMutation.mutate({ id: activeAdmin.id, payload });
    }
  };

  return (
    <CrmLayout>
      <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-16">
        {/* Flash Alert */}
        {alertMessage && (
          <div className="fixed top-5 right-5 z-[99999]">
            <div
              className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold transition-all duration-300 ${
                alertMessage.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              <span>{alertMessage.text}</span>
            </div>
          </div>
        )}

        <div className="w-full px-6 py-4">
          {/* Top Search & Add Button Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mb-6">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884] shadow-2xs"
              />
            </div>

            <button
              onClick={handleOpenAdd}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <span>+</span>
              <span>Add Extra Admin</span>
            </button>
          </div>

          {/* Section Heading & Total Count */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Extra Admins List</h2>
            <div className="text-sm font-medium text-slate-600">
              Total : <span className="font-bold text-slate-900">{totalRecords}</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">NAME</th>
                    <th className="py-3 px-6">EMAIL</th>
                    <th className="py-3 px-6">PHONE</th>
                    <th className="py-3 px-6 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#003884]" />
                        <div className="mt-2 text-xs">Loading extra admins...</div>
                      </td>
                    </tr>
                  ) : adminsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                        No extra admins found
                      </td>
                    </tr>
                  ) : (
                    adminsList.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors duration-150 text-slate-700"
                      >
                        <td className="py-3.5 px-6 font-medium text-slate-900 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 whitespace-nowrap">
                          {item.email}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 whitespace-nowrap">
                          {item.phone || '-'}
                        </td>
                        <td className="py-3.5 px-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Edit Button - Green Pen */}
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Extra Admin"
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>

                            {/* Delete Button - Red Trash */}
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              title="Delete Extra Admin"
                              className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
        </div>

        {/* Modal: Add / Update Extra Admin */}
        {modalMode &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Dark Blue Header matching screenshot */}
                <div className="bg-[#003884] px-6 py-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">
                    {modalMode === 'add' ? 'Add Extra Admin' : 'Update Extra Admin'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    type="button"
                    className="text-white/80 hover:text-white transition p-1 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter Email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Phone Number"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="text"
                      placeholder={modalMode === 'add' ? 'Enter Password' : 'Enter new password to change'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                    />
                    {modalMode === 'edit' && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Leave blank to keep current password unchanged. Password is saved securely hashed.
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="px-6 py-2 text-sm font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <span>Saving...</span>
                      ) : modalMode === 'add' ? (
                        'Add'
                      ) : (
                        'Update'
                      )}
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

export default MasterAdminsPage;

