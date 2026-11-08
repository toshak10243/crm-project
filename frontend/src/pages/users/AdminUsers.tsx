import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  branch_id?: string;
  branch_name?: string;
  created_at?: string;
  is_active?: boolean;
}

const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search, Pagination & Rows
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal State: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [activeUser, setActiveUser] = useState<AdminUserItem | null>(null);

  // Form Fields matching Screenshot 2 & 3
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBranchId, setFormBranchId] = useState('');

  // Notifications
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 1. Fetch Users from real database
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', page, rowsPerPage, search],
    queryFn: async () => {
      const params: any = {
        page,
        limit: rowsPerPage,
      };
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/users', { params });
      return res.data;
    },
  });

  const users: AdminUserItem[] = usersData?.data || [];
  const totalPages: number = usersData?.meta?.totalPages || 1;

  // 2. Fetch Branches for branch dropdown in modal
  const { data: branchesData } = useQuery({
    queryKey: ['admin-branches-list'],
    queryFn: async () => {
      const res = await api.get('/branches', { params: { limit: 100 } });
      return res.data?.data?.records || [];
    },
  });

  const branches = branchesData || [];

  // Open Add Modal
  const openAddModal = () => {
    setActiveUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormBranchId(branches[0]?.id || '');
    setModalMode('add');
  };

  // Open Edit Modal
  const openEditModal = (user: AdminUserItem) => {
    setActiveUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormPassword(''); // Password is not shown for security, admin can type new password directly without old password
    setFormPhone(user.phone || '');
    setFormBranchId(user.branch_id || branches[0]?.id || '');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormBranchId('');
  };

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAlertMessage({ text: 'Admin user created successfully', type: 'success' });
      closeModal();
    },
    onError: (err: any) => {
      setAlertMessage({
        text: err.response?.data?.message || 'Failed to create user. Please try again.',
        type: 'error',
      });
    },
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.patch(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAlertMessage({ text: 'Admin user updated successfully', type: 'success' });
      closeModal();
    },
    onError: (err: any) => {
      setAlertMessage({
        text: err.response?.data?.message || 'Failed to update user',
        type: 'error',
      });
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAlertMessage({ text: 'User deleted successfully', type: 'success' });
    },
    onError: (err: any) => {
      setAlertMessage({
        text: err.response?.data?.message || 'Failed to delete user',
        type: 'error',
      });
    },
  });

  const handleDelete = (user: AdminUserItem) => {
    if (window.confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      alert('Name and Email are required');
      return;
    }

    if (modalMode === 'add') {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || null,
        branchId: formBranchId || null,
        role: 'manager',
      };
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }
      createMutation.mutate(payload);
    } else if (modalMode === 'edit' && activeUser) {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || null,
        branchId: formBranchId || null,
      };
      // Direct password update from admin side without asking for old password
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }
      updateMutation.mutate({ id: activeUser.id, payload });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <CrmLayout>
      <div className="space-y-4">
        {/* Success / Error Notification */}
        {alertMessage && (
          <div
            className={`p-3.5 rounded-lg text-sm font-medium flex items-center justify-between animate-in fade-in ${alertMessage.type === 'success'
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

        {/* Top Action Bar: Search Pill & + Add Admin Button matching Screenshot 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm placeholder-slate-400"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            </div>
          </div>

          {/* + Add Admin Button */}
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002b66] rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            + Add Admin
          </button>
        </div>

        {/* Section Header: Admin User & Rows per page matching Screenshot 1 */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xl font-bold text-slate-800">Admin User</h2>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="bg-white border border-slate-200 text-slate-700 rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Admin User Table matching Screenshot 1 */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-5 font-bold">NAME</th>
                <th className="py-3.5 px-5 font-bold">EMAIL</th>
                <th className="py-3.5 px-5 font-bold">PASSWORD</th>
                <th className="py-3.5 px-5 font-bold">PHONE NUMBER</th>
                <th className="py-3.5 px-5 font-bold">TYPE</th>
                <th className="py-3.5 px-5 font-bold">BRANCH</th>
                <th className="py-3.5 px-5 font-bold">CREATE BY</th>
                <th className="py-3.5 px-5 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading admin users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No data available
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'
                      }`}
                  >
                    <td className="py-3.5 px-5 font-semibold text-slate-800">{u.name}</td>
                    <td className="py-3.5 px-5 text-slate-600">{u.email}</td>
                    {/* Password is kept secure as masked dots for security */}
                    <td className="py-3.5 px-5 text-slate-400 font-mono tracking-widest text-sm">••••••••</td>
                    <td className="py-3.5 px-5 text-slate-700 font-mono">{u.phone || '-'}</td>
                    <td className="py-3.5 px-5 text-slate-700 capitalize">{u.role || 'Manager'}</td>
                    <td className="py-3.5 px-5 text-slate-700">{u.branch_name || 'Head Office'}</td>
                    <td className="py-3.5 px-5 text-slate-600">CRM</td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-3">
                        {/* Edit Button (Green) */}
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit Admin User"
                          className="text-emerald-700 hover:text-emerald-800 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {/* Delete Button (Red) */}
                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete Admin User"
                          className="text-rose-600 hover:text-rose-700 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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

        {/* Pagination Bar matching Screenshot 1 */}
        {totalPages > 0 && (
          <div className="flex items-center justify-center gap-1.5 pt-4 pb-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 text-xs text-slate-400 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
            >
              &lt; previous
            </button>
            <span className="w-7 h-7 rounded bg-[#003884] text-white text-xs font-semibold flex items-center justify-center shadow-xs">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 text-xs text-slate-600 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
            >
              next &gt;
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* ADD & UPDATE ADMIN MODAL (Matching Screenshot 2 & 3) */}
        {/* ======================================================== */}
        {modalMode && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              {/* Dark Blue Header matching Screenshot 2 & 3 */}
              <div className="bg-[#003884] px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-bold text-base tracking-tight">
                  {modalMode === 'add' ? 'Add Admin' : 'Update Admin'}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white/80 hover:text-white text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Form Body matching Screenshot 2 & 3 */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter Email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {/* Password (Direct reset/change without old password) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Password</label>
                  <input
                    type="text"
                    placeholder={modalMode === 'add' ? 'Enter Password' : 'Enter new password to change (leave blank to keep current)'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                  {modalMode === 'edit' && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Directly enter a new password to update without entering old password.
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="Enter Phone Number"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs font-mono"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Branch</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  >
                    <option value="">Select branch</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Footer Buttons: Close & Add/Update matching Screenshot 2 & 3 */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#003884] hover:bg-[#002b66] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : modalMode === 'add' ? 'Add' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </CrmLayout>
  );
};

export default AdminUsersPage;
