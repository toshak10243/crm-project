import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CrmLayout } from '../../components/layout/CrmLayout';
import apiClient from '../../lib/api';

interface IvrPageProps {
  type: 'incoming' | 'outgoing';
}

export const IvrPage: React.FC<IvrPageProps> = ({ type }) => {
  const isIncoming = type === 'incoming';

  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params: any = {
        type,
        page,
        limit: rowsPerPage,
      };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search.trim()) params.search = search.trim();

      const res = await apiClient.get('/ivr/calls', { params });
      const data = res.data?.data || {};
      setCalls(data.calls || []);
      setTotalRecords(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch IVR calls', err);
      setCalls([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [type, startDate, endDate, rowsPerPage, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCalls();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  return (
    <CrmLayout>
      <div className="space-y-4">

        {/* Filter Bar with Start Date, End Date, Search & Rows Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Dates */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Right side: Search Box and Rows / Records Counter */}
          <div className="flex flex-col items-end gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-72">
              <input
                type="text"
                placeholder="Search here..."
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

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Rows"
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
              <span>Total Records: <strong className="text-slate-800">{totalRecords}</strong></span>
            </div>
          </div>
        </div>

        {/* IVR Table (Exact match to Screenshots 1 & 2) */}
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#f8fafc] text-slate-800 font-bold uppercase text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">NO</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4">CALLER</th>
                <th className="py-3 px-4">{isIncoming ? 'CALL RECEIVER' : 'RECEIVER'}</th>
                <th className="py-3 px-4">RECORDING URL</th>
                <th className="py-3 px-4">CALL DURATION</th>
                {isIncoming && <th className="py-3 px-4">LEAD</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isIncoming ? 8 : 7} className="py-12 text-center text-slate-400">
                    Loading call records...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                /* Empty state from Screenshot 1 */
                <tr>
                  <td colSpan={isIncoming ? 8 : 7} className="py-16 text-center text-slate-500 font-medium bg-[#f1f5f9]/40">
                    No data available
                  </td>
                </tr>
              ) : (
                /* Real Database Rows */
                calls.map((call, idx) => (
                  <tr key={call.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{(page - 1) * rowsPerPage + idx + 1}</td>
                    <td className="py-3.5 px-4">{formatDate(call.created_at)}</td>
                    <td className="py-3.5 px-4 text-slate-600">{formatTime(call.created_at)}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{call.caller || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-800">{call.receiver || '-'}</td>
                    <td className="py-3.5 px-4">
                      {call.recording_url ? (
                        <button
                          onClick={() => setActiveAudioUrl(call.recording_url)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          View Recording
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">No recording</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{call.call_duration || '0 s'}</td>
                    {isIncoming && <td className="py-3.5 px-4">{call.lead_name || '-'}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Audio Player Modal when clicking "View Recording" */}
        {activeAudioUrl && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#111827] text-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </span>
                  <h3 className="font-semibold text-sm">Call Voice Recording Player</h3>
                </div>
                <button
                  onClick={() => setActiveAudioUrl(null)}
                  className="text-slate-400 hover:text-white text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-black/60 rounded-lg flex flex-col items-center justify-center space-y-3">
                <audio controls autoPlay className="w-full">
                  <source src={activeAudioUrl} type="audio/wav" />
                  <source src={activeAudioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <div className="text-[11px] text-slate-400 font-mono break-all text-center">
                  Source: {activeAudioUrl}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <a
                  href={activeAudioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Open in New Tab
                </a>
                <button
                  onClick={() => setActiveAudioUrl(null)}
                  className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </CrmLayout>
  );
};

export default IvrPage;
