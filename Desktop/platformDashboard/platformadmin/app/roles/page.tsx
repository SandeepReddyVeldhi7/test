'use client';

import React, { useState, useEffect } from 'react';
import { useUi } from '../context/UiContext';
import { apiFetch } from '../../lib/api';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const ShieldIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

const AVAILABLE_PAGES = [
  'Dashboard',
  'Organizations',
  'Subscriptions',
  'Analytics',
  'Users',
  'Complaints',
  'Roles'
];

export default function RolesManagementPage() {
  const { setActiveTab, showToast } = useUi();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newRole, setNewRole] = useState({
    name: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    setActiveTab('Roles');
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await apiFetch('/platform/roles');
      setRoles(res.data);
    } catch (err) {
      console.error('Failed to load roles', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (page: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(page)
        ? prev.permissions.filter(p => p !== page)
        : [...prev.permissions, page]
    }));
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return alert('Role name is required');
    if (newRole.permissions.length === 0) return alert('Select at least one permission');

    setCreating(true);
    try {
      await apiFetch('/platform/roles', {
        method: 'POST',
        body: JSON.stringify(newRole)
      });
      showToast('Authority Authorized Successfully!', 'success');
      setPanelOpen(false);
      setNewRole({ name: '', permissions: [] });
      loadRoles();
    } catch (err: any) {
      showToast(err.message || 'Failed to create role', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-[#F8FAFC]">
      
      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 space-y-10 animate-in fade-in duration-700">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-6 pb-2">
          <div className="min-w-[280px]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Authority & Role Control</h1>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Define platform-wide access levels</p>
          </div>
          <div className="flex items-center gap-4 flex-1 lg:flex-none justify-end">
            <button 
              onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2.5 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:-translate-y-1 active:scale-95 transition-all whitespace-nowrap"
            >
              <PlusIcon size={18} /> Create New Authority
            </button>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
           {loading ? (
             <div className="col-span-full py-20 text-center text-slate-400 font-bold">Initializing Role Registry...</div>
           ) : roles.map((role) => (
             <div key={role._id} className="glass-card p-10 rounded-[48px] border border-white/40 shadow-xl group hover:scale-[1.02] transition-all relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
                
                <div className="flex items-start justify-between mb-8 relative z-10">
                   <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                      <ShieldIcon size={28} />
                   </div>
                   <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-100">ACTIVE</span>
                </div>

                <div className="space-y-6 relative z-10">
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{role.name}</h3>
                   
                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Access</p>
                      <div className="flex flex-wrap gap-2">
                         {role.permissions.map((p: string) => (
                           <span key={p} className="px-3 py-1.5 bg-white border border-slate-100 text-slate-600 rounded-xl text-[9px] font-black tracking-tighter shadow-sm">{p}</span>
                         ))}
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 italic">Created {new Date(role.createdAt).toLocaleDateString()}</p>
                      <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Manage Authority</button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* ── Side Panel: Create Role ── */}
      <div className={`
        fixed lg:relative top-0 right-0 h-full w-full sm:w-[450px] bg-white lg:bg-transparent z-[100] lg:z-10
        transition-all duration-500 ease-spring border-l border-slate-100 lg:border-none
        ${isPanelOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
      `}>
        <div className="h-full glass-card lg:rounded-[48px] lg:m-6 flex flex-col overflow-hidden shadow-3xl lg:shadow-none border-none">
           <div className="p-8 sm:p-12 border-b border-slate-100 flex items-center justify-between bg-white/40 backdrop-blur-md">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Define Authority</h2>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Assign Page-level permissions</p>
              </div>
              <button 
                onClick={() => setPanelOpen(false)}
                className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <XIcon size={20} />
              </button>
           </div>

           <form onSubmit={handleCreateRole} className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-12 space-y-12">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authority Name</label>
                 <input 
                   type="text" 
                   required 
                   placeholder="e.g. OPERATIONS_DIRECTOR"
                   className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-8 py-5 text-sm font-black focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300"
                   value={newRole.name}
                   onChange={e => setNewRole({...newRole, name: e.target.value})}
                 />
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page Permissions</label>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{newRole.permissions.length} Selected</span>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-3">
                    {AVAILABLE_PAGES.map((page) => {
                      const isSelected = newRole.permissions.includes(page);
                      return (
                        <button 
                          key={page}
                          type="button"
                          onClick={() => togglePermission(page)}
                          className={`
                            flex items-center justify-between p-5 rounded-[24px] border transition-all
                            ${isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                              : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}
                          `}
                        >
                           <span className="text-xs font-black tracking-tight">{page}</span>
                           <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-white/20' : 'bg-slate-50'}`}>
                              {isSelected && <CheckIcon size={14} />}
                           </div>
                        </button>
                      );
                    })}
                 </div>
              </div>

              <button 
                disabled={creating}
                className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {creating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Authorize Authority'}
              </button>
           </form>
        </div>
      </div>

    </div>
  );
}
