'use client';

import React, { useState, useEffect } from 'react';
import { useUi } from '../context/UiContext';
import { apiFetch } from '../../lib/api';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const SearchIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const FilterIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const DownloadIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const CheckCircleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const AlertCircleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function ComplaintsPage() {
  const { setActiveTab } = useUi();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    setActiveTab('Complaints');
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const res = await apiFetch('/platform/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    
    setUpdating(true);
    try {
      await apiFetch(`/platform/complaints/${selectedComplaint._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, remarks })
      });
      setIsModalOpen(false);
      setSelectedComplaint(null);
      setRemarks('');
      loadComplaints();
    } catch (err) {
      alert('Failed to update complaint status');
    } finally {
      setUpdating(false);
    }
  };

  const openModal = (complaint: any) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setIsModalOpen(true);
  };

  const filteredComplaints = complaints.filter(c => 
    c.subject.toLowerCase().includes(search.toLowerCase()) ||
    c.companyId?.name.toLowerCase().includes(search.toLowerCase()) ||
    c.userId?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'in-progress': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
      default: return 'bg-amber-100 text-amber-600 border-amber-200';
    }
  };

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-[#F8FAFC]">
      
      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 space-y-10 animate-in fade-in duration-700">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-[280px]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Complaints Engine</h1>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Global Support & Resolution Center</p>
          </div>
          <div className="flex items-center gap-4 flex-1 lg:flex-none justify-end">
            <div className="relative flex-1 sm:flex-none group min-w-[240px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none">
                <SearchIcon size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search complaints, companies..." 
                className="bg-white border border-slate-200 rounded-2xl pl-12 pr-5 py-3 text-[11px] font-black w-full sm:w-80 focus:ring-4 focus:ring-indigo-100 transition-all outline-none relative shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="glass-card rounded-[40px] overflow-hidden border border-white/40 shadow-xl">
           <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white/40 backdrop-blur-md">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">System-wide Grievance Log</h3>
              <div className="flex items-center gap-3">
                 <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all" title="Filter List">
                    <FilterIcon size={18} />
                 </button>
                 <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all" title="Download Report">
                    <DownloadIcon size={18} />
                 </button>
              </div>
           </div>
           
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-slate-50">
                       <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject & Module</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company & User</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Filed On</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold">Loading complaints...</td></tr>
                    ) : filteredComplaints.length === 0 ? (
                      <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold">No complaints found.</td></tr>
                    ) : filteredComplaints.map((c) => (
                      <tr key={c._id} className="hover:bg-white/60 transition-all group cursor-pointer" onClick={() => openModal(c)}>
                         <td className="px-10 py-6">
                            <div>
                               <p className="text-sm font-black text-slate-900 tracking-tight">{c.subject}</p>
                               <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">Module: {c.module}</span>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-6">
                            <div>
                               <p className="text-xs font-black text-slate-900 tracking-tight leading-none">{c.companyId?.name}</p>
                               <p className="text-[10px] font-bold text-slate-400 mt-1.5">{c.userId?.name} • {c.email}</p>
                            </div>
                         </td>
                         <td className="px-6 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(c.status)} shadow-sm inline-block`}>
                               {c.status}
                            </span>
                         </td>
                         <td className="px-6 py-6 text-right">
                            <p className="text-[10px] font-black text-slate-900">{new Date(c.createdAt).toLocaleDateString()}</p>
                            <p className="text-[9px] font-bold text-slate-300 mt-0.5">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* ── Status Modal ── */}
      {isModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => !updating && setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[48px] border border-white/60 p-10 shadow-3xl animate-in zoom-in-95 duration-500 ease-spring overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
             
             <div className="flex items-center justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getStatusColor(selectedComplaint.status)} shadow-lg`}>
                   {selectedComplaint.status === 'resolved' ? <CheckCircleIcon size={28} /> : <AlertCircleIcon size={28} />}
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"
                >
                  <XIcon size={20} />
                </button>
             </div>

             <div className="space-y-6">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedComplaint.subject}</h2>
                   <p className="text-xs font-bold text-slate-400 mt-2">Filed by {selectedComplaint.userId?.name} from {selectedComplaint.companyId?.name}</p>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detailed Issue</p>
                   <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedComplaint.details}</p>
                </div>

                <form onSubmit={handleUpdateStatus} className="space-y-6 pt-2">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolution Status</label>
                      <div className="grid grid-cols-3 gap-3">
                         {['pending', 'in-progress', 'resolved'].map((s) => (
                           <button 
                             key={s}
                             type="button"
                             onClick={() => setNewStatus(s)}
                             className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${newStatus === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                           >
                              {s}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Remarks (Sent via Email)</label>
                      <textarea 
                        rows={3}
                        placeholder="e.g. This issue has been identified and patched in v2.4..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                      />
                   </div>

                   <button 
                     type="submit" 
                     disabled={updating}
                     className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {updating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Update & Send Email'}
                   </button>
                </form>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
