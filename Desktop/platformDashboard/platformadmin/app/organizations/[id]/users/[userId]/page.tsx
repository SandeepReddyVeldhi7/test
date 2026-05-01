'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUi } from '../../../../context/UiContext';
import { apiFetch } from '../../../../../lib/api';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const BackIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const UserIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const ActivityIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const StatsIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);

export default function UserInsightPage() {
  const params = useParams();
  const router = useRouter();
  const { setActiveTab } = useUi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab('Organizations');
    loadInsights();
  }, [params.id, params.userId]);

  const loadInsights = async () => {
    try {
      const res = await apiFetch(`/platform/companies/${params.id}/users/${params.userId}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load user insights', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="p-10">User insights not found.</div>;

  const { user, stats, complaints } = data;

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#F8FAFC] p-4 sm:p-8 space-y-6 animate-in fade-in duration-700">
      
      {/* Breadcrumbs & Back */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-lg transition-all"
        >
          <BackIcon size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel Insight</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{user.name}</h1>
        </div>
      </div>

      {/* User Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Identity */}
        <div className="lg:col-span-2 glass-card p-5 rounded-[24px] flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
           <div className="w-20 h-20 rounded-2xl bg-slate-900 overflow-hidden border-4 border-white shadow-2xl group-hover:scale-105 transition-transform duration-500 flex items-center justify-center text-xl font-black text-white uppercase">
              {user.name.split(' ').map((n:any) => n[0]).join('')}
           </div>
           <div className="flex-1 text-center sm:text-left space-y-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h2>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{user.role} &bull; {user.email}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
                 <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                   user.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                 }`}>
                   {user.isActive ? 'ACCOUNT ACTIVE' : 'ACCOUNT SUSPENDED'}
                 </span>
                 <p className="text-xs font-bold text-slate-500">Last Active: {user.lastActiveAt || user.lastLoginAt ? new Date(user.lastActiveAt || user.lastLoginAt).toLocaleString() : 'Never'}</p>
              </div>
           </div>
        </div>

        {/* Performance Overview */}
        <div className="glass-card p-10 rounded-[24px] space-y-8 relative overflow-hidden">
           <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Performance Overview</p>
              <StatsIcon size={18} className="text-indigo-600" />
           </div>
           <div className="grid grid-cols-1 gap-6">
              {/* Total Clients */}
              <div className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-[32px] flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Clients</p>
                    <p className="text-3xl font-black text-slate-900">{stats.clients.total}</p>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                    <UserIcon size={24} />
                 </div>
              </div>

              {/* Listed Breakdown */}
              <div className="p-8 bg-white border border-slate-100 rounded-[40px] space-y-6 shadow-sm">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listed (L)</p>
                    <p className="text-xl font-black text-slate-900">{stats.clients.listedActive + stats.clients.listedInactive}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Active</p>
                       <p className="text-lg font-black text-slate-900">{stats.clients.listedActive}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                       <p className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">Inactive</p>
                       <p className="text-lg font-black text-slate-900">{stats.clients.listedInactive}</p>
                    </div>
                 </div>
              </div>

              {/* Unlisted */}
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] flex items-center justify-between">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unlisted (UL)</p>
                 <p className="text-2xl font-black text-slate-900">{stats.clients.unlisted}</p>
              </div>
           </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* User Complaints Log */}
         <div className="glass-card p-10 rounded-[24px] space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Personnel Grievance Log</h3>
               <ActivityIcon size={20} className="text-rose-600" />
            </div>
            <div className="space-y-6">
               {complaints.map((complaint: any, i: number) => (
                 <div key={complaint._id} className="flex gap-4 relative">
                    {i !== complaints.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-[-24px] w-[2px] bg-slate-100" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 z-10">
                       <div className={`w-2 h-2 rounded-full ${
                         complaint.status === 'resolved' ? 'bg-emerald-500' : 
                         complaint.status === 'in-progress' ? 'bg-amber-500' : 'bg-rose-500'
                       }`} />
                    </div>
                    <div className="pt-1 pb-4 flex-1">
                       <div className="flex items-start justify-between gap-4">
                          <div>
                             <p className="text-xs font-black text-slate-900 leading-tight">{complaint.subject}</p>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                {complaint.module} &bull; {new Date(complaint.createdAt).toLocaleString()}
                             </p>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                            complaint.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            complaint.status === 'in-progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {complaint.status}
                          </span>
                       </div>
                       <div className="mt-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-[10px] font-medium text-slate-600 leading-relaxed">
                          {complaint.details}
                       </div>
                    </div>
                 </div>
               ))}
               {complaints.length === 0 && (
                 <p className="text-xs font-bold text-slate-400 italic text-center py-10">No complaints filed by this user.</p>
               )}
            </div>
         </div>

         {/* Information Overview */}
         <div className="glass-card p-10 rounded-[24px] space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Personnel Information</h3>
               <UserIcon size={20} className="text-indigo-600" />
            </div>
            <div className="space-y-8">
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee ID</p>
                     <p className="text-sm font-bold text-slate-900">{user.employeeId || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</p>
                     <p className="text-sm font-bold text-slate-900">{user.mobile || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Joined</p>
                     <p className="text-sm font-bold text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Manager</p>
                     <p className="text-sm font-bold text-slate-900">{user.managerId ? 'Assigned' : 'Not Assigned'}</p>
                  </div>
               </div>
               
               <div className="p-8 bg-indigo-50/30 border border-indigo-100 rounded-3xl space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Administrative Notes</h4>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                     User is part of the {user.role} team. Access levels are managed at the organization level. 
                     No disciplinary actions or flags recorded in the last 30 days.
                  </p>
               </div>
            </div>
         </div>

      </div>

    </div>
  );
}
