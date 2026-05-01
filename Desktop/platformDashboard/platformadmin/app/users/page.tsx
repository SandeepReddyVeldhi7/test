'use client';

import React, { useState, useEffect } from 'react';
import { useUi } from '../context/UiContext';
import { apiFetch } from '../../lib/api';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const SearchIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const UserPlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></svg>
);
const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
const FilterIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
);
const DownloadIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const ShieldIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
const ClockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const EyeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function UsersManagementPage() {
  const { setActiveTab, showToast } = useUi();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    mobile: '',
    employeeId: '',
    roleId: '',
    otpEnabled: true,
    password: '',
  });

  useEffect(() => {
    setActiveTab('Users');
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiFetch('/platform/admins'),
        apiFetch('/platform/roles')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data || []);
    } catch (err) {
      console.error('Failed to load data', err);
      setRoles([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/platform/admins/${id}/toggle-status`, { method: 'PATCH' });
      setUsers(users.map(u => u._id === id ? { ...u, isActive: !currentStatus } : u));
      showToast(`User ${!currentStatus ? 'Activated' : 'Deactivated'} Successfully`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle user status', 'error');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/platform/admins', {
        method: 'POST',
        body: JSON.stringify(newAdmin)
      });
      showToast('Admin Authorized Successfully!', 'success');
      setNewAdmin({ name: '', email: '', mobile: '', employeeId: '', roleId: '', otpEnabled: true, password: '' });
      setPanelOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to authorize admin', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-[#F8FAFC]">

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 space-y-10 animate-in fade-in duration-700">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-6 pb-2">
          <div className="min-w-[280px]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Admin Users Management</h1>
            <p className="text-xs font-bold text-slate-500 mt-1">Manage and monitor administrative access across the platform</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 flex-1 lg:flex-none justify-end">

            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:-translate-y-1 active:scale-95 transition-all whitespace-nowrap"
            >
              <UserPlusIcon size={18} /> Create New Admin
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid gap-6 sm:gap-8 ${isPanelOpen ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>

          {[
            {
              title: 'TOTAL ADMINS',
              val: users.length.toString().padStart(2, '0'),
              trend: '+100%',
              icon: UserPlusIcon,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50'
            },
            {
              title: 'SUPER ADMINS',
              val: users.filter(u => u.roleId?.name?.toUpperCase() === 'SUPER ADMIN').length.toString().padStart(2, '0'),
              status: 'Active',
              icon: ShieldIcon,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50'
            },
            {
              title: 'ACTIVE STATUS',
              val: users.filter(u => u.isActive).length.toString().padStart(2, '0'),
              label: 'Enabled',
              icon: ClockIcon,
              color: 'text-purple-600',
              bg: 'bg-purple-50'
            },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-8 rounded-[40px] flex items-center gap-6 group hover:scale-105 transition-all cursor-default">
              <div className={`w-16 h-16 rounded-3xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:rotate-12 transition-transform`}>
                <stat.icon size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  {stat.title}
                  {stat.trend && <span className="text-emerald-500">{stat.trend}</span>}
                  {stat.label && <span className="text-slate-500 font-bold">{stat.label}</span>}
                  {stat.status && <span className="text-emerald-500 font-bold">{stat.status}</span>}
                </p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{stat.val}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Personnel Table */}
        <div className="glass-card rounded-[48px] overflow-hidden border border-white/40 shadow-xl">
          <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white/40 backdrop-blur-md">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Existing Administrative Personnel</h3>
            <div className="flex items-center gap-4">
              <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all">
                <FilterIcon size={18} />
              </button>
              <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all">
                <DownloadIcon size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & Identity</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Role</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Account Status</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-white/40 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white group-hover:scale-110 transition-transform">
                          <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`} alt={user.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{user.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                        {user.roleId?.name || 'ADMIN'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleUserStatus(user._id, user.isActive)}
                          className={`w-12 h-6 rounded-full transition-all relative ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${user.isActive ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <p className="text-xs font-black text-slate-900">2 mins ago</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">192.168.1.44</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Create Admin ── */}
      <div className={`
        fixed lg:relative top-0 right-0 h-full w-full sm:w-[400px] bg-white lg:bg-transparent z-[100] lg:z-10
        transition-all duration-500 ease-spring border-l border-slate-100 lg:border-none
        ${isPanelOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
      `}>
        <div className="h-full glass-card lg:rounded-[48px] lg:m-6 flex flex-col overflow-hidden shadow-3xl lg:shadow-none border-none">
          <div className="p-8 sm:p-10 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Admin</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">Add a new collaborator to the platform</p>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"
            >
              <XIcon size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateAdmin} className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-10 space-y-10">

            {/* Primary Identity */}
            <div className="space-y-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Primary Identity</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text" required placeholder="e.g. Jonathan Ive"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                    value={newAdmin.name}
                    onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
                  <input
                    type="email" required placeholder="jonathan.ive@finchaxis.com"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                    <input
                      type="text" placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      value={newAdmin.mobile}
                      onChange={e => setNewAdmin({ ...newAdmin, mobile: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee ID</label>
                    <input
                      type="text" placeholder="FINCH-921"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      value={newAdmin.employeeId}
                      onChange={e => setNewAdmin({ ...newAdmin, employeeId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Authority & Roles */}
            <div className="space-y-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Authority & Roles</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Selection</label>
                  <select
                    required
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none"
                    value={newAdmin.roleId}
                    onChange={e => setNewAdmin({ ...newAdmin, roleId: e.target.value })}
                  >
                    <option value="">Select a Role</option>
                    {roles.map(role => (
                      <option key={role._id} value={role._id}>{role.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temporary Password</label>
                  <div className="relative group">
                    <input
                      type="password" required placeholder="••••••••••••"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      value={newAdmin.password}
                      onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                      <EyeIcon size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              disabled={saving} 
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all mt-6 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Authorize & Create Admin</>
              )}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
