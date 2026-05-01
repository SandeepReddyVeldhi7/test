'use client';

import React, { useState, useEffect } from 'react';
import { useUi } from '../context/UiContext';

const ShieldIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const MailIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="14" x="2" y="5" rx="2"/></svg>
);
const UserIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default function ProfilePage() {
  const { setActiveTab } = useUi();
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    setActiveTab('Profile');
    const savedAdmin = localStorage.getItem('admin');
    if (savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
    }
  }, []);

  if (!admin) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 sm:p-12 animate-in fade-in duration-700">
      <div className="max-w-[1000px] mx-auto w-full space-y-12">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-8 bg-white/40 backdrop-blur-xl p-10 rounded-[48px] border border-white/60 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
           
           <div className="relative group">
              <div className="w-32 h-32 rounded-[40px] bg-slate-900 overflow-hidden border-4 border-white shadow-2xl group-hover:scale-105 transition-transform duration-500">
                 <img src={`https://ui-avatars.com/api/?name=${admin.name}&size=256&background=0f172a&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                 <ShieldIcon size={18} />
              </div>
           </div>

           <div className="text-center md:text-left space-y-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{admin.name}</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500" />
                 Active Session &bull; {admin.role?.name || 'Platform Administrator'}
              </p>
           </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* Account Information */}
           <div className="glass-card p-10 rounded-[40px] space-y-8">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Account Information</h3>
              <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                       <UserIcon size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Identity</p>
                       <p className="text-sm font-bold text-slate-900">{admin.name}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                       <MailIcon size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                       <p className="text-sm font-bold text-slate-900">{admin.email}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Permissions Matrix */}
           <div className="glass-card p-10 rounded-[40px] space-y-8">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Authority Matrix</h3>
              <div className="space-y-6">
                 <div className="flex flex-wrap gap-2">
                    {admin.role?.permissions?.map((perm: string) => (
                      <span key={perm} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-tight border border-indigo-100">
                        {perm.replace(/_/g, ' ')}
                      </span>
                    )) || (
                      <span className="text-xs font-bold text-slate-400 italic">No specific permissions listed</span>
                    )}
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                    * Your account has elevated administrative privileges. Please handle organizational data with extreme caution.
                 </p>
              </div>
           </div>

        </div>

        {/* Activity Summary (Placeholder for now) */}
        <div className="glass-card p-10 rounded-[40px] space-y-8">
           <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Security Settings</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                 <p className="text-xs font-black text-slate-900">Two-Factor Auth</p>
                 <p className="text-[10px] font-bold text-slate-400">Status: <span className="text-emerald-500">Always Enabled</span></p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2 opacity-50 cursor-not-allowed">
                 <p className="text-xs font-black text-slate-900">Change Password</p>
                 <p className="text-[10px] font-bold text-slate-400 text-indigo-600">Contact Support</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
