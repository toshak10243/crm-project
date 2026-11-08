import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CrmLayout } from '../../components/layout/CrmLayout';
import apiClient from '../../lib/api';

interface BranchItem {
  id: string;
  name: string;
  location: string;
  create_by: string;
  created_at?: string;
}

export const BranchPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Modal states: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [activeBranch, setActiveBranch] = useState<BranchItem | null>(null);
  const [branchName, setBranchName] = useState<string>('');
  const [branchLocation, setBranchLocation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch branches from database
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: rowsPerPage,
      };
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await apiClient.get('/branches', { params });
      const data = res.data?.data || {};
      setBranches(data.records || []);
      setTotalRecords(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch branches', err);
      setBranches([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [page, rowsPerPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBranches();
  };

  const openAddModal = () => {
    setModalMode('add');
    setActiveBranch(null);
    setBranchName('');
    setBranchLocation('');
  };

  const openEditModal = (b: BranchItem) => {
    setModalMode('edit');
    setActiveBranch(b);
    setBranchName(b.name);
    setBranchLocation(b.location === '-' ? '' : b.location);
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveBranch(null);
    setBranchName('');
    setBranchLocation('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      alert('Branch Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        await apiClient.post('/branches', {
          name: branchName.trim(),
          location: branchLocation.trim() || null,
        });
      } else if (modalMode === 'edit' && activeBranch) {
        await apiClient.patch(`/branches/${activeBranch.id}`, {
          name: branchName.trim(),
          location: branchLocation.trim() || null,
        });
      }
      closeModal();
      fetchBranches();
    } catch (err: any) {
      console.error('Failed to save branch', err);
      alert(err.response?.data?.message || 'Failed to save branch. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (b: BranchItem) => {
    if (!window.confirm(`Are you sure you want to delete branch "${b.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/branches/${b.id}`);
      fetchBranches();
    } catch (err: any) {
      console.error('Failed to delete branch', err);
      alert(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  return (
    <CrmLayout>
      <div className="space-y-4">
        {/* Top Action Bar: Search Pill on Left, + Add Branch Button on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-1">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm placeholder-slate-400"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            </div>
          </form>

          {/* + Add Branch Button */}
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#0b3b75] hover:bg-[#082a54] rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            + Add Branch
          </button>
        </div>

        {/* Branch List Section Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xl font-bold text-slate-800">Branch List</h2>
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

        {/* Table matching Screenshot 1 & 2 */}
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#f8fafc] text-slate-800 font-bold uppercase text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-5">BRANCH NAME</th>
                <th className="py-3 px-5">LOCATION</th>
                <th className="py-3 px-5">CREATE BY</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Loading branches from database...
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-500 font-medium bg-[#f1f5f9]/40">
                    No branches found
                  </td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">{b.name}</td>
                    <td className="py-3.5 px-5 text-slate-700">{b.location || '-'}</td>
                    <td className="py-3.5 px-5 text-slate-600">{b.create_by || '-'}</td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-3">
                        {/* Edit Green Pen Button */}
                        <button
                          onClick={() => openEditModal(b)}
                          title="Edit Branch"
                          className="text-emerald-700 hover:text-emerald-800 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Delete Red Trash Button */}
                        <button
                          onClick={() => handleDelete(b)}
                          title="Delete Branch"
                          className="text-rose-600 hover:text-rose-700 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 text-xs text-slate-400 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
          >
            &lt; previous
          </button>
          <span className="w-7 h-7 rounded bg-[#0b3b75] text-white text-xs font-semibold flex items-center justify-center shadow-xs">
            {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * rowsPerPage >= totalRecords}
            className="px-2.5 py-1 text-xs text-slate-600 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
          >
            next &gt;
          </button>
        </div>

        {/* Modal: Add Branch / Update Branch (Exact match to Screenshot 3) */}
        {modalMode && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              {/* Header: Dark Blue Header with Title & Close Icon */}
              <div className="bg-[#0b3b75] px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-bold text-base tracking-tight">
                  {modalMode === 'add' ? 'Add Branch' : 'Update Branch'}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white/80 hover:text-white text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Branch Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Branch Name"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    placeholder="Enter Location / City"
                    value={branchLocation}
                    onChange={(e) => setBranchLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {/* Footer Buttons: Close & Update/Submit matching SS 3 */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-[#0b3b75] hover:bg-[#082a54] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Add' : 'Update'}
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

export default BranchPage;
